/* GoldSight 金瞳 · 落地页交互
   规范见 docs/LANDING-SPEC.md：下载按钮状态机、FAQ 手风琴、手机吸底 CTA、
   触屏/键盘等价、减弱动效。所有网络与剪贴板失败都有降级路径。 */

(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const state = {
    version: '1.15.25',
    sizeMB: 151,
    sha256: '121B5F592944281BEAA03C758280B113C419DFCB40065261E615ED9331E7344D',
    downloadUrl: 'https://github.com/songxuanhao/GoldSight/releases/download/v1.15.25/GoldSight-1.15.25-win-x64.zip',
    ads: null,
  };

  /* ---------------- 站点元数据（下载信息以 site.json 为准，失败用内置兜底） ---------------- */
  async function loadSiteMeta() {
    try {
      const res = await fetch('assets/site.json', { cache: 'no-store' });
      if (!res.ok) return;
      const meta = await res.json();
      if (meta && meta.version) state.version = String(meta.version);
      if (meta && Number(meta.sizeMB) > 0) state.sizeMB = Number(meta.sizeMB);
      if (meta && typeof meta.sha256 === 'string') state.sha256 = meta.sha256;
      if (meta && typeof meta.downloadUrl === 'string') state.downloadUrl = meta.downloadUrl;
      if (meta && meta.ads && typeof meta.ads === 'object') state.ads = meta.ads;
    if (meta && meta.purchase && typeof meta.purchase === 'object') state.purchase = meta.purchase;
    } catch {
      /* 静态托管或本地 file:// 可能取不到，继续用兜底值 */
    }
  }

  function applyMeta() {
    const label = `v${state.version} · 压缩包约 ${state.sizeMB} MB · 9.9 一次买断 · 解压即用`;
    const heroMeta = $('#download-meta');
    if (heroMeta) heroMeta.textContent = label;
    const footVersion = $('#foot-version');
    if (footVersion) footVersion.textContent = `v${state.version}`;
    const mobileMeta = $('#mobile-meta');
    if (mobileMeta) mobileMeta.textContent = `Windows · 免费 · v${state.version}`;
    const shaEl = $('#sha-value');
    if (shaEl) shaEl.textContent = state.sha256 ? state.sha256 : '见下载包旁的 SHA256SUMS.txt';
    for (const el of $$('a.btn-download, #mobile-cta a.btn-download')) {
      el.setAttribute('href', state.downloadUrl);
    }
    const btn = $('#download-btn');
    if (btn) btn.dataset.downloadUrl = state.downloadUrl;
  }

  /* ---------------- 复制（含非安全上下文的降级） ---------------- */
  async function copyText(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* 继续降级 */
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }

  function flashStatus(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.classList.remove('error', 'success');
    if (kind) el.classList.add(kind);
    window.clearTimeout(el._timer);
    el._timer = window.setTimeout(() => {
      el.textContent = '';
      el.classList.remove('error', 'success');
    }, 2600);
  }

  function absoluteDownloadUrl() {
    const url = state.downloadUrl.startsWith('http')
      ? state.downloadUrl
      : new URL(state.downloadUrl, window.location.href).toString();
    return url;
  }

  function wireCopyButtons() {
    const status = $('#download-status');
    const linkBtn = $('#copy-link');
    if (linkBtn) {
      linkBtn.addEventListener('click', async () => {
        const ok = await copyText(absoluteDownloadUrl());
        flashStatus(status, ok ? '下载链接已复制，可发到 Windows 电脑打开' : '复制失败，请手动复制地址栏中的下载链接', ok ? 'success' : 'error');
      });
    }
    const shaBtn = $('#copy-sha');
    const shaFoot = $('#copy-sha-foot');
    const shaStatus = $('#sha-status');
    const copySha = async () => {
      const ok = await copyText(state.sha256);
      flashStatus(shaStatus, ok ? 'SHA256 已复制，可在 PowerShell 用 Get-FileHash 对比' : '复制失败，请手动选择上方校验值', ok ? 'success' : 'error');
    };
    if (shaBtn) shaBtn.addEventListener('click', copySha);
    if (shaFoot) shaFoot.addEventListener('click', copySha);
  }

  /* ---------------- 下载按钮状态机：idle → loading → success / error ---------------- */
  function wireDownloadButton() {
    const btn = $('#download-btn');
    if (!btn) return;
    const status = $('#download-status');

    btn.addEventListener('click', (event) => {
      if (btn.dataset.state === 'loading') {
        event.preventDefault();
        return;
      }
      // 保留原生下载行为（不使用 preventDefault），仅做状态反馈
      btn.dataset.state = 'loading';
      const labelMain = $('.label-main', btn);
      const sub = $('.label-sub', btn);
      if (labelMain) labelMain.textContent = '正在开始下载…';
      if (sub) sub.textContent = '若浏览器没有反应，可用下方「复制下载链接」';
      if (status) {
        status.textContent = '';
        status.classList.remove('error', 'success');
      }
      window.setTimeout(() => {
        btn.dataset.state = 'success';
        if (labelMain) labelMain.textContent = '已开始下载';
        if (sub) sub.textContent = `v${state.version} · 解压后双击 GoldSight.exe`;
        window.setTimeout(() => {
          btn.dataset.state = 'idle';
          if (labelMain) labelMain.textContent = '下载 Windows 版';
          if (sub) sub.textContent = `v${state.version} · 压缩包约 ${state.sizeMB} MB · 解压即用`;
        }, 4200);
      }, 900);
    });

    // 下载被浏览器拦截（popup/file 权限）时给可执行出口
    btn.addEventListener('error', () => {
      btn.dataset.state = 'error';
      flashStatus(status, '下载没能开始，请用「复制下载链接」在浏览器中打开', 'error');
    });
  }

  /* ---------------- 系统提示：非 Windows 用户 ---------------- */
  function wireOsNotice() {
    const note = $('#os-note');
    if (!note) return;
    const ua = navigator.userAgent || '';
    const isWindows = /Windows NT 10|Windows NT 11|Win64|WOW64/i.test(ua);
    if (!isWindows) note.hidden = false;
  }

  /* ---------------- FAQ 手风琴：同一时间只开一个 ---------------- */
  function wireFaq() {
    const items = $$('.faq-item');
    for (const item of items) {
      const btn = $('.faq-q', item);
      const panel = $('.faq-a', item);
      if (!btn || !panel) continue;
      btn.addEventListener('click', () => {
        const willOpen = !item.classList.contains('is-open');
        items.forEach((other) => {
          if (other === item) return;
          const otherBtn = $('.faq-q', other);
          const otherPanel = $('.faq-a', other);
          if (!other.classList.contains('is-open')) return;
          other.classList.remove('is-open');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          window.setTimeout(() => {
            if (!other.classList.contains('is-open') && otherPanel) otherPanel.hidden = true;
          }, reduceMotion.matches ? 0 : 320);
        });
        if (willOpen) {
          panel.hidden = false;
          item.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        } else {
          item.classList.remove('is-open');
          btn.setAttribute('aria-expanded', 'false');
          window.setTimeout(() => {
            if (!item.classList.contains('is-open')) panel.hidden = true;
          }, reduceMotion.matches ? 0 : 320);
        }
      });
    }
  }

  /* ---------------- 功能卡：点按/键盘展开（手机手风琴） ---------------- */
  function wireCards() {
    const cards = $$('#feature-cards .card');
    for (const card of cards) {
      const toggle = () => {
        const willOpen = !card.classList.contains('is-open');
        cards.forEach((other) => other.classList.remove('is-open'));
        if (willOpen) card.classList.add('is-open');
      };
      card.addEventListener('click', toggle);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
          event.preventDefault();
          toggle();
        }
      });
    }
  }

  /* ---------------- 手机吸底 CTA：首屏滚出后出现 ---------------- */
  function wireMobileCta() {
    const cta = $('#mobile-cta');
    const hero = $('.hero');
    if (!cta || !hero) return;
    // 只在手机断点显示（桌面用户已有导航与主按钮）
    const media = window.matchMedia('(max-width: 640px)');
    const apply = (visible) => {
      const shouldShow = media.matches && visible;
      cta.hidden = !shouldShow;
    };
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => apply(!entries[0].isIntersecting),
        { threshold: 0.05 },
      );
      observer.observe(hero);
    }
    media.addEventListener?.('change', () => apply(false));
  }

  /* ---------------- 首屏截图：光标倾斜 + 光斑（仅精准指针） ---------------- */
  function wireTilt() {
    const frame = $('[data-tilt]');
    if (!frame) return;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!fine.matches || reduceMotion.matches) return;
    let raf = 0;
    frame.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      const rect = frame.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        frame.style.setProperty('--ry', `${(px - 0.5) * 6}deg`);
        frame.style.setProperty('--rx', `${(0.5 - py) * 5}deg`);
        frame.style.setProperty('--mx', `${px * 100}%`);
        frame.style.setProperty('--my', `${py * 100}%`);
      });
    });
    frame.addEventListener('pointerleave', () => {
      frame.style.setProperty('--ry', '0deg');
      frame.style.setProperty('--rx', '0deg');
    });
  }

  /* ---------------- 入场：只播放一次；减弱动效时直接显示 ---------------- */
  function wireReveal() {
    const targets = $$('.section-head, .band-card, .card, .steps li, .gallery figure, .faq-item, .start-foot');
    if (reduceMotion.matches || !('IntersectionObserver' in window)) return;
    targets.forEach((el) => el.classList.add('reveal'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (!entry.isIntersecting) return;
          const delay = Math.min(index, 6) * 40;
          window.setTimeout(() => entry.target.classList.add('is-in'), delay);
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    targets.forEach((el) => io.observe(el));
  }

  /* ---------------- 键盘：截图画廊左右滚动 ---------------- */
  function wireGallery() {
    const gallery = $('#gallery');
    if (!gallery) return;
    gallery.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const step = gallery.clientWidth * 0.9;
      gallery.scrollBy({ left: event.key === 'ArrowRight' ? step : -step, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });
  }

  /* ---------------- 离线提示 ---------------- */
  function wireOffline() {
    const update = () => {
      const status = $('#download-status');
      if (!navigator.onLine && status) {
        status.textContent = '当前离线：下载可能失败，可先复制下载链接稍后再试';
        status.classList.add('error');
      }
    };
    window.addEventListener('online', () => window.location.reload());
    window.addEventListener('offline', update);
    update();
  }

  /* ---------------- 变现：广告位（合作位 / Google AdSense） ----------------
     配置在 assets/site.json 的 ads 节点：
       provider: 'adsense' 且填了 client/slots → 加载 AdSense（需同意 Cookie）
       否则 → 渲染 ads.house 里的合作位（无需审核、立即生效）
     任何脚本/网络失败都退回合作位或静默隐藏，绝不影响下载按钮。 */
  const ADS_CONSENT_KEY = 'goldsight.ads.consent.v1';

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
  }

  function adsConfig() {
    const raw = state.ads && typeof state.ads === 'object' ? state.ads : {};
    const slots = Object.assign({ top: '', mid: '', bottom: '' }, raw.adsense && raw.adsense.slots ? raw.adsense.slots : {});
    return {
      enabled: raw.enabled !== false,
      consentRequired: raw.consentRequired !== false,
      client: raw.adsense && typeof raw.adsense.client === 'string' ? raw.adsense.client.trim() : '',
      slots,
      house: {
        enabled: !raw.house || raw.house.enabled !== false,
        items: raw.house && Array.isArray(raw.house.items) ? raw.house.items : [],
      },
    };
  }

  function adSlots() {
    return $$('.ad-slot');
  }

  function setAdsMode(mode) {
    document.documentElement.dataset.ads = mode;
    window.__goldSightAds = { mode, slots: adSlots().map((el) => el.dataset.ad || '') };
  }

  function renderHouseAd(ads) {
    const item = ads.house.items[0];
    const slot = adSlots().find((el) => el.dataset.ad === 'top') || adSlots()[0];
    if (!slot || !ads.house.enabled || !item) return false;
    const card = document.createElement('div');
    card.className = 'ad-card';
    card.innerHTML =
      '<span class="ad-tag"></span>' +
      '<div class="ad-copy"><p class="ad-title"></p><p class="ad-text"></p></div>' +
      '<a class="ad-cta" target="_blank" rel="noopener sponsored"></a>';
    $('.ad-tag', card).textContent = item.label || '广告';
    $('.ad-title', card).textContent = item.title || '';
    $('.ad-text', card).textContent = item.text || '';
    const cta = $('.ad-cta', card);
    cta.href = item.href || '#';
    cta.textContent = item.cta || '了解详情 →';
    slot.replaceChildren(card);
    slot.dataset.mode = 'house';
    return true;
  }

  function loadAdSense(ads) {
    const filled = adSlots().filter((el) => Boolean(ads.slots[el.dataset.ad]));
    if (!filled.length) return renderHouseAd(ads);

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(ads.client);
    script.addEventListener('error', () => {
      renderHouseAd(ads);
      setAdsMode('adsense-failed');
    });
    document.head.appendChild(script);

    for (const slot of filled) {
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.display = 'block';
      ins.dataset.adClient = ads.client;
      ins.dataset.adSlot = String(ads.slots[slot.dataset.ad]);
      ins.dataset.adFormat = 'auto';
      ins.dataset.fullWidthResponsive = 'true';
      slot.replaceChildren(ins);
      const tag = document.createElement('span');
      tag.className = 'ad-tag ad-tag-overlay';
      tag.textContent = '广告';
      slot.appendChild(tag);
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        /* AdSense 脚本未就绪时忽略，失败会走上面的 error 回调 */
      }
    }
    setAdsMode('adsense');
    return true;
  }

  function showConsent(ads) {
    const banner = $('#consent');
    if (!banner) return;
    banner.hidden = false;
    document.body.classList.add('consent-open');
    const finish = (choice) => {
      try {
        localStorage.setItem(ADS_CONSENT_KEY, choice);
      } catch {
        /* 隐私模式写不了 localStorage 时忽略 */
      }
      banner.hidden = true;
      document.body.classList.remove('consent-open');
      if (choice === 'all') loadAdSense(ads);
      else setAdsMode('necessary');
    };
    $('#consent-all')?.addEventListener('click', () => finish('all'), { once: true });
    $('#consent-necessary')?.addEventListener('click', () => finish('necessary'), { once: true });
  }

  function wireAds() {
    const ads = adsConfig();
    if (!ads.enabled) {
      setAdsMode('off');
      return;
    }
    const hasAdSense = /^ca-pub-\d{8,}$/.test(ads.client);
    let stored = null;
    try {
      stored = localStorage.getItem(ADS_CONSENT_KEY);
    } catch {
      stored = null;
    }

    if (!hasAdSense) {
      setAdsMode(renderHouseAd(ads) ? 'house' : 'off');
      return;
    }
    if (!ads.consentRequired || stored === 'all') {
      loadAdSense(ads);
      return;
    }
    if (stored === 'necessary') {
      setAdsMode('necessary');
      return;
    }
    showConsent(ads);
  }

  // 价格板块：site.json 的 purchase 配置优先，未配置时保留页面默认文案
  function wirePricing() {
    const meta = state.purchase || {};
    const priceEl = document.getElementById('price-num');
    if (priceEl && typeof meta.price === 'string' && meta.price.trim()) priceEl.textContent = meta.price.trim();

    const contactEl = document.getElementById('buy-contact');
    if (contactEl && typeof meta.contact === 'string' && meta.contact.trim()) {
      contactEl.textContent = '购买 / 售后联系：' + meta.contact.trim();
    }

    const qrMap = { alipay: meta.alipayQr, wechat: meta.wechatQr };
    document.querySelectorAll('.pay-qr img[data-qr]').forEach((img) => {
      const key = img.dataset.qr;
      const rel = qrMap[key];
      if (!rel) {
        img.closest('.pay-qr').classList.add('missing');
        return;
      }
      img.addEventListener('error', () => img.closest('.pay-qr').classList.add('missing'), { once: true });
      img.src = rel;
    });
  }

  async function main() {
    await loadSiteMeta();
    applyMeta();
    wireCopyButtons();
    wireDownloadButton();
    wireOsNotice();
    wireFaq();
    wireCards();
    wireMobileCta();
    wireTilt();
    wireReveal();
    wireGallery();
    wireOffline();
    wireAds();
    wirePricing();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void main(), { once: true });
  } else {
    void main();
  }
})();

