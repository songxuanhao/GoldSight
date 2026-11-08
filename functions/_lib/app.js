/**
 * GoldSight 金瞳 · 自动解锁后端（Cloudflare Worker + KV，免费额度内）
 *
 * 职责：
 *   1) POST /api/orders        —— 客户端带机器码下单，调虎皮椒发起支付，返回二维码/支付链接
 *   2) POST /api/xunhu/notify  —— 虎皮椒异步回调：验签 + 校验金额 + 幂等 → 用私钥签发授权码并落 KV
 *   3) GET  /api/order         —— 客户端轮询：?id=<订单号> 或 ?machine=<机器码>，返回状态与授权码
 *   4) POST /admin/paid        —— 管理员兜底（也用于测试）：凭 ADMIN_TOKEN 直接把订单标记为已付
 *   5) GET  /api/config        —— 价格/是否已配置支付渠道（客户端用来决定显示自动解锁还是人工兜底）
 *
 * 安全：回调必须验签；金额必须等于定价；同一订单重复回调幂等；授权码与本机机器码绑定（离线校验在客户端）。
 */

import md5 from 'js-md5';
import nacl from 'tweetnacl';

const CODE_PREFIX = 'GS1';
const MACHINE_RE = /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/;

/* ------------------------------ 工具 ------------------------------ */

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Admin-Token',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...cors() },
  });
}

function text(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...cors() },
  });
}

function b64urlEncode(bytes) {
  let bin = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i += 1) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function normalizeMachine(raw) {
  const hex = String(raw || '')
    .replace(/[^0-9a-fA-F]/g, '')
    .toUpperCase()
    .slice(0, 16);
  if (hex.length !== 16) return null;
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

function todayIso() {
  const d = new Date(Date.now() + 8 * 3600 * 1000); // 北京时间的日期
  return d.toISOString().slice(0, 10);
}

function randomId(len = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const buf = crypto.getRandomValues(new Uint8Array(len));
  for (let i = 0; i < len; i += 1) out += alphabet[buf[i] % alphabet.length];
  return out;
}

function newOrderId() {
  return `GS${Date.now().toString(36).toUpperCase()}${randomId(4)}`;
}

function signXunhu(params, secret) {
  const filtered = Object.keys(params)
    .filter((k) => k !== 'hash' && params[k] !== '' && params[k] != null)
    .sort();
  const query = filtered.map((k) => `${k}=${params[k]}`).join('&');
  return md5(`${query}${secret}`);
}

async function readParams(request) {
  const ct = (request.headers.get('Content-Type') || '').toLowerCase();
  if (ct.includes('application/json')) {
    try {
      return (await request.json()) || {};
    } catch {
      return {};
    }
  }
  try {
    const form = await request.formData();
    const out = {};
    for (const [k, v] of form.entries()) out[k] = typeof v === 'string' ? v : '';
    return out;
  } catch {
    return {};
  }
}

/* -------------------------- 授权码签发 -------------------------- */

function signLicense(payloadObj, seedB64) {
  const seed = Uint8Array.from(atob(seedB64), (c) => c.charCodeAt(0));
  const keyPair = nacl.sign.keyPair.fromSeed(seed);
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payloadObj));
  const sig = nacl.sign.detached(payloadBytes, keyPair.secretKey);
  return `${CODE_PREFIX}.${b64urlEncode(payloadBytes)}.${b64urlEncode(sig)}`;
}

function buildLicense(env, machine, orderId) {
  if (!env.LICENSE_SEED_B64) throw new Error('LICENSE_SEED_B64 未配置');
  const payload = {
    v: 1,
    ed: 'commercial',
    nm: '自动发货',
    mc: machine,
    ord: orderId,
    iss: todayIso(),
    exp: null,
  };
  return signLicense(payload, env.LICENSE_SEED_B64);
}

/* -------------------------- 虎皮椒支付 -------------------------- */

async function createXunhuPayment(env, orderId, amount, machine) {
  const gateway = String(env.XUNHU_GATEWAY || 'https://api.xunhupay.com').replace(/\/+$/, '');
  const publicBase = String(env.PUBLIC_BASE_URL || 'https://goldsight.pages.dev').replace(/\/+$/, '');
  const notifyUrl = `${publicBase}/api/xunhu/notify`;
  const params = {
    version: '1.1',
    appid: env.XUNHU_APPID,
    trade_order_id: orderId,
    total_fee: Number(amount).toFixed(2),
    title: 'GoldSight 金瞳 正式版授权（永久）',
    notify_url: env.NOTIFY_URL || notifyUrl,
    return_url: env.RETURN_URL || `${publicBase}/`,
    callback_url: env.CALLBACK_URL || `${publicBase}/`,
    time: String(Math.floor(Date.now() / 1000)),
    nonce_str: randomId(32),
  };
  params.hash = signXunhu(params, env.XUNHU_SECRET);
  const res = await fetch(`${gateway}/payment/do.html`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json;charset=UTF-8' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  const payload = data && typeof data === 'object' && data.data && typeof data.data === 'object' ? data.data : data;
  if (Number(data.errcode) !== 0 || !payload) {
    throw new Error(`发起支付失败：${data.errmsg || 'unknown'} (code=${data.errcode})`);
  }
  return {
    payUrl: payload.url || '',
    qrUrl: payload.url_qrcode || '',
    openOrderId: String(payload.open_order_id || data.openid || ''),
  };
}

/* ---------------------------- 路由 ---------------------------- */

async function handleCreateOrder(request, env) {
  const body = await readParams(request);
  const machine = normalizeMachine(body.machine);
  if (!machine) return json({ error: 'BAD_MACHINE', message: '机器码格式错误' }, 400);

  // 已买过：直接回授权码（重装/换目录自动恢复）
  const paidRaw = await env.ORDERS.get(`paid:${machine}`);
  if (paidRaw) return json({ status: 'paid', licenseCode: paidRaw, machine });

  const orderId = newOrderId();
  const amount = Number(env.PRICE_CNY || '9.90').toFixed(2);
  const record = {
    id: orderId,
    machine,
    amount,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const mock = String(env.MOCK_PAY || '0') === '1';
  let pay = { payUrl: '', qrUrl: '', openOrderId: '' };
  if (!mock) {
    if (!env.XUNHU_APPID || !env.XUNHU_SECRET) {
      return json({ error: 'PAY_NOT_CONFIGURED', message: '支付渠道尚未配置' }, 503);
    }
    try {
      pay = await createXunhuPayment(env, orderId, amount, machine);
    } catch (err) {
      return json({ error: 'PAY_INIT_FAILED', message: String(err && err.message ? err.message : err) }, 200);
    }
  }
  record.openOrderId = pay.openOrderId;
  await env.ORDERS.put(`order:${orderId}`, JSON.stringify(record), { expirationTtl: 7 * 86400 });
  await env.ORDERS.put(`machine:${machine}`, orderId, { expirationTtl: 86400 });

  return json({
    status: 'pending',
    orderId,
    machine,
    amount,
    mock,
    payUrl: pay.payUrl,
    qrUrl: pay.qrUrl,
  });
}

async function handleNotify(request, env) {
  const data = await readParams(request);
  const secret = env.XUNHU_SECRET;
  if (!secret) return text('fail', 500);
  const received = String(data.hash || '');
  const expected = signXunhu(data, secret);
  if (!received || received !== expected) {
    console.warn('notify bad signature', data.trade_order_id);
    return text('fail', 400);
  }
  if (String(data.status) !== 'OD') return text('success'); // 非成功状态不处理，但回 success 避免重试

  const orderId = String(data.trade_order_id || '');
  const raw = await env.ORDERS.get(`order:${orderId}`);
  if (!raw) {
    console.warn('notify unknown order', orderId);
    return text('fail', 404);
  }
  const record = JSON.parse(raw);

  // 金额校验（防篡改）
  const paidFee = Number(data.total_fee);
  if (!Number.isFinite(paidFee) || paidFee + 1e-6 < Number(record.amount)) {
    console.warn('notify amount mismatch', orderId, data.total_fee, record.amount);
    return text('fail', 400);
  }

  // 幂等
  if (record.status === 'paid') return text('success');

  record.status = 'paid';
  record.paidAt = new Date().toISOString();
  record.openOrderId = record.openOrderId || String(data.open_order_id || '');
  record.transactionId = String(data.transaction_id || '');
  record.licenseCode = buildLicense(env, record.machine, record.id);
  await env.ORDERS.put(`order:${orderId}`, JSON.stringify(record), { expirationTtl: 30 * 86400 });
  await env.ORDERS.put(`paid:${record.machine}`, record.licenseCode, { expirationTtl: 10 * 365 * 86400 });
  return text('success');
}

async function handleOrderStatus(url, env) {
  const id = String(url.searchParams.get('id') || '').trim();
  const machineRaw = String(url.searchParams.get('machine') || '').trim();
  const machine = normalizeMachine(machineRaw);

  if (machine) {
    const paid = await env.ORDERS.get(`paid:${machine}`);
    if (paid) return json({ status: 'paid', licenseCode: paid, machine });
    const latest = await env.ORDERS.get(`machine:${machine}`);
    if (latest) {
      const raw = await env.ORDERS.get(`order:${latest}`);
      if (raw) {
        const rec = JSON.parse(raw);
        return json({ status: rec.status, orderId: rec.id, licenseCode: rec.status === 'paid' ? rec.licenseCode : null });
      }
    }
    return json({ status: 'none' });
  }

  if (!id) return json({ error: 'BAD_REQUEST', message: '需要 id 或 machine 参数' }, 400);
  const raw = await env.ORDERS.get(`order:${id}`);
  if (!raw) return json({ status: 'none' });
  const rec = JSON.parse(raw);
  return json({ status: rec.status, orderId: rec.id, licenseCode: rec.status === 'paid' ? rec.licenseCode : null });
}

async function handleAdminPaid(request, env) {
  const token = request.headers.get('X-Admin-Token') || '';
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return json({ error: 'FORBIDDEN' }, 403);
  const body = await readParams(request);
  const orderId = String(body.orderId || '').trim();
  const machine = normalizeMachine(body.machine);
  let rec = null;
  let key = '';
  if (orderId) {
    key = `order:${orderId}`;
    const raw = await env.ORDERS.get(key);
    if (raw) rec = JSON.parse(raw);
  }
  if (!rec && machine) {
    const latest = await env.ORDERS.get(`machine:${machine}`);
    if (latest) {
      key = `order:${latest}`;
      const raw = await env.ORDERS.get(key);
      if (raw) rec = JSON.parse(raw);
    }
  }
  if (!rec) return json({ error: 'NOT_FOUND' }, 404);
  if (rec.status !== 'paid') {
    rec.status = 'paid';
    rec.paidAt = new Date().toISOString();
    rec.licenseCode = buildLicense(env, rec.machine, rec.id);
    await env.ORDERS.put(key, JSON.stringify(rec), { expirationTtl: 30 * 86400 });
    await env.ORDERS.put(`paid:${rec.machine}`, rec.licenseCode, { expirationTtl: 10 * 365 * 86400 });
  }
  return json({ status: 'paid', machine: rec.machine, licenseCode: rec.licenseCode });
}

export const onRequest = async ({ request, env }) => {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });

    try {
      if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/api/health')) {
        return json({ ok: true, service: 'goldsight-license', price: env.PRICE_CNY || '9.90' });
      }
      if (request.method === 'GET' && url.pathname === '/api/config') {
        return json({
          price: env.PRICE_CNY || '9.90',
          configured: Boolean(env.XUNHU_APPID && env.XUNHU_SECRET),
          mock: String(env.MOCK_PAY || '0') === '1',
        });
      }
      if (request.method === 'POST' && url.pathname === '/api/orders') return await handleCreateOrder(request, env);
      if (request.method === 'POST' && (url.pathname === '/api/xunhu/notify' || url.pathname === '/notify')) {
        return await handleNotify(request, env);
      }
      if (request.method === 'GET' && url.pathname === '/api/order') return await handleOrderStatus(url, env);
      if (request.method === 'POST' && url.pathname === '/admin/paid') return await handleAdminPaid(request, env);

      return json({ error: 'NOT_FOUND' }, 404);
    } catch (err) {
      console.error('worker error', err && err.stack ? err.stack : String(err));
      return json({ error: 'INTERNAL', message: String(err && err.message ? err.message : err) }, 500);
    }
};
