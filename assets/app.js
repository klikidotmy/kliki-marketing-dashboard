// KLIKI Marketing Dashboard — paparan sahaja. Semua KPI dikira dalam scripts/build-data.mjs.
(function () {
  'use strict';

  // ---------- i18n ----------
  const T = {
    ms: {
      brandSub: 'Marketing Dashboard', pageTitle: 'Prestasi Marketing Company', month: 'Bulan',
      nav: { overview: 'Ringkasan', category: 'Kategori', trend: 'Trend', platform: 'Platform', content: 'Content', funnel: 'Funnel', summary: 'Rumusan', outlet: 'Outlet' },
      secCategory: 'Prestasi ikut kategori', secCategoryHint: 'Lead dan walk-in berbanding target company',
      secTrend: 'Trend bulanan', secTrendHint: 'Titik kosong = bulan semasa (data separa)',
      trendLeadWalk: 'Lead & walk-in berbanding target', trendReach: 'View ikut platform',
      secPlatform: 'Prestasi platform', secPlatformHint: 'Reach tidak dijumlahkan kerana reach harian bertindih',
      secContent: 'Prestasi content', secContentHint: '10 video TikTok teratas bulan ini. Thumbnail ikut kategori (sheet tiada pautan video).',
      secFunnel: 'Funnel marketing', secFunnelHint: 'Peringkat content dan perjalanan pelanggan dari view ke kedai',
      stageTitle: 'TOFU · MOFU · BOFU', convTitle: 'Dari content ke kedai',
      secSummary: 'Rumusan bulan', secSummaryHint: 'Pencapaian dan kelemahan dijana daripada data. Pelan ditulis oleh Marketing.',
      highlights: 'Pencapaian utama', improve: 'Perlu diperbaiki', planTitle: (m) => `Pelan tindakan ${m}`,
      secOutlet: 'Pecahan outlet', secOutletHint: 'Kulim dan Kelang Lama dikira satu kedai. Pendang tiada repair.',
      footer: 'Sumber: MASTER SHEET SALES OUTLET (masterFRONT), CONTENT SUBMIT (insight platform), REPORT CONTENT DATA (Linktree & log post). Target company = jumlah target outlet. Target harian = target bulanan ÷ 26.',
      sideFoot: 'Data dari Google Sheets, dikemas kini setiap jam.',
      totalLead: 'Jumlah Lead', totalWalkin: 'Jumlah Walk-in', achieved: 'tercapai',
      pace: 'Pace setakat ini', needDay: 'Perlu sehari', vsPrev: 'vs bulan lepas', gap: 'Baki ke target', avgDay: 'Purata sehari', dailyTarget: 'Target harian',
      paceMark: 'Penanda = pace',
      status: { green: 'Atas landasan', amber: 'Hampir', red: 'Bawah target', none: 'Tiada data' },
      cat: { phone: 'Phone', repair: 'Repair', cc: 'Cash Converter' },
      lead: 'Lead', walkin: 'Walk-in', posts: 'Post', views: 'View', avgView: 'Purata view',
      plat: { view: 'View', profile: 'Profile visit', engagement: 'Engagement', followers: 'Follower baru' },
      shareOf: (p) => `${p} daripada jumlah view`, days: (x) => `${x} hari data`,
      th: { rank: '#', content: 'Content', outlet: 'Outlet', date: 'Tarikh', funnel: 'Funnel', tier: 'Tier', views: 'View' },
      stages: { TOFU: 'Educational, Trend · capai orang baru', MOFU: 'Review, POV Customer · bina keyakinan', BOFU: 'Promo · tolak tindakan' },
      noType: 'Kolum TYPE dalam log post bermula September 2026.',
      conv: { views: 'View content', profile: 'Profile visit', linktree: 'Buka Linktree', wa: 'Klik WhatsApp', lead: 'Lead direkod', walkin: 'Walk-in direkod' },
      convSrc: { views: 'TikTok + IG + FB', profile: 'TikTok + IG + FB', linktree: 'Unique view', wa: '4 outlet', lead: 'Staf outlet', walkin: 'Staf outlet' },
      notFilled: 'Belum diisi', perLead: 'lead / klik', ofLead: 'daripada lead',
      hq: 'Saluran HQ (tiada rekod lead)', postage: 'WA Online Postage', buyback: 'WA Buyback', total: 'Jumlah', locClicks: 'Klik lokasi',
      convNote: 'Klik WhatsApp bukan mesej dihantar dan lead outlet datang dari semua sumber. Nisbah ini petunjuk arah, bukan conversion sebenar.',
      outletTh: ['Outlet', 'Lead', 'Target', 'Capai', 'Walk-in', 'Target', 'Capai', 'Klik WA', 'Data terakhir'],
      metaLine: (m, d, g) => `${m} · data outlet sehingga ${d} · dikemas kini ${g}`,
      alertTitle: (x) => `${x} perkara data perlu disemak`,
      planEmpty: 'Belum ada pelan. Tambah item dalam ACTION_PLAN di scripts/config.mjs.',
      partial: 'separa', target: 'Target', leadTarget: 'Target lead', walkinTarget: 'Target walk-in',
      months: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'],
      mshort: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
      current: 'semasa', metric: { lead: 'Lead', walkin: 'Walk-in', views: 'View semua platform', profile: 'Profile visit', wa: 'Klik WhatsApp outlet' },
      ins: {
        bestCat: (x, f) => `<strong>${x.cat}</strong> kategori terkuat, ${f.pct(x.pace)} daripada pace target lead.`,
        onPace: (x, f) => `${x.type} atas landasan: <strong>${f.pct(x.pace)}</strong> daripada pace.`,
        momUp: (x, f) => `${x.metric} naik <strong>${f.pct(x.ch)}</strong> (${f.n(x.from)} → ${f.n(x.to)}).`,
        ctrUp: (x, f) => `CTR profile ke Linktree naik ke <strong>${f.pct(x.to, 1)}</strong> (dari ${f.pct(x.from, 1)}).`,
        topVideo: (x, f) => `Video terbaik: ${x.subject} di ${x.outlet || '—'}, <strong>${f.n(x.views)}</strong> view.`,
        worstCat: (x, f) => `Lead <strong>${x.cat}</strong> paling ketinggalan: ${f.pct(x.pace)} daripada pace, kurang <strong>${f.n(x.gap)}</strong> ke target.`,
        behindPace: (x, f) => `${x.type} cuma ${f.pct(x.pace)} daripada pace. Perlu <strong>${f.n1(x.need)}</strong> sehari untuk capai target.`,
        momDown: (x, f) => `${x.metric} turun <strong>${f.pct(Math.abs(x.ch))}</strong> (${f.n(x.from)} → ${f.n(x.to)}).`,
        lowPosts: (x, f) => `Cuma <strong>${x.posts}</strong> post untuk ${x.cat} (${f.pct(x.share)} daripada semua post), walaupun kategori ini paling jauh dari target.`,
        staleOutlet: (x, f) => (x.date ? `${x.outlet}: data lead/walk-in terakhir ${f.d(x.date)} (${x.days} hari lepas).` : `${x.outlet}: belum isi data lead/walk-in bulan ini.`),
      },
    },
    en: {
      brandSub: 'Marketing Dashboard', pageTitle: 'Company Marketing Performance', month: 'Month',
      nav: { overview: 'Overview', category: 'Categories', trend: 'Trends', platform: 'Platforms', content: 'Content', funnel: 'Funnel', summary: 'Summary', outlet: 'Outlets' },
      secCategory: 'Performance by category', secCategoryHint: 'Leads and walk-ins against company target',
      secTrend: 'Monthly trends', secTrendHint: 'Hollow point = current month (partial data)',
      trendLeadWalk: 'Leads & walk-ins vs target', trendReach: 'Views by platform',
      secPlatform: 'Platform performance', secPlatformHint: 'Reach is not summed because daily reach overlaps',
      secContent: 'Content performance', secContentHint: 'Top 10 TikTok videos this month. Thumbnails by category (no video links in sheet).',
      secFunnel: 'Marketing funnel', secFunnelHint: 'Content stages and the customer path from view to store',
      stageTitle: 'TOFU · MOFU · BOFU', convTitle: 'From content to store',
      secSummary: 'Monthly summary', secSummaryHint: 'Highlights and gaps are generated from data. The plan is written by Marketing.',
      highlights: 'Key highlights', improve: 'Areas to improve', planTitle: (m) => `Action plan for ${m}`,
      secOutlet: 'Outlet breakdown', secOutletHint: 'Kulim and Kelang Lama counted as one store. Pendang has no repair.',
      footer: 'Sources: MASTER SHEET SALES OUTLET (masterFRONT), CONTENT SUBMIT (platform insights), REPORT CONTENT DATA (Linktree & post log). Company target = sum of outlet targets. Daily target = monthly target ÷ 26.',
      sideFoot: 'Data from Google Sheets, refreshed hourly.',
      totalLead: 'Total Leads', totalWalkin: 'Total Walk-in', achieved: 'achieved',
      pace: 'Pace to date', needDay: 'Needed / day', vsPrev: 'vs last month', gap: 'Remaining', avgDay: 'Daily average', dailyTarget: 'Daily target',
      paceMark: 'Marker = pace',
      status: { green: 'On track', amber: 'Close', red: 'Below target', none: 'No data' },
      cat: { phone: 'Phone', repair: 'Repair', cc: 'Cash Converter' },
      lead: 'Leads', walkin: 'Walk-in', posts: 'Posts', views: 'Views', avgView: 'Avg views',
      plat: { view: 'Views', profile: 'Profile visits', engagement: 'Engagement', followers: 'New followers' },
      shareOf: (p) => `${p} of total views`, days: (x) => `${x} days of data`,
      th: { rank: '#', content: 'Content', outlet: 'Outlet', date: 'Date', funnel: 'Funnel', tier: 'Tier', views: 'Views' },
      stages: { TOFU: 'Educational, Trend · reach new people', MOFU: 'Review, POV Customer · build trust', BOFU: 'Promo · drive action' },
      noType: 'The TYPE column in the post log starts in September 2026.',
      conv: { views: 'Content views', profile: 'Profile visits', linktree: 'Linktree opens', wa: 'WhatsApp clicks', lead: 'Recorded leads', walkin: 'Recorded walk-ins' },
      convSrc: { views: 'TikTok + IG + FB', profile: 'TikTok + IG + FB', linktree: 'Unique views', wa: '4 outlets', lead: 'Outlet staff', walkin: 'Outlet staff' },
      notFilled: 'Not filled', perLead: 'leads / click', ofLead: 'of leads',
      hq: 'HQ channels (no lead record)', postage: 'WA Online Postage', buyback: 'WA Buyback', total: 'Total', locClicks: 'Location clicks',
      convNote: 'A WhatsApp click is not a sent message, and outlet leads come from every source. Treat these ratios as direction, not true conversion.',
      outletTh: ['Outlet', 'Leads', 'Target', 'Achieved', 'Walk-in', 'Target', 'Achieved', 'WA clicks', 'Last data'],
      metaLine: (m, d, g) => `${m} · outlet data to ${d} · updated ${g}`,
      alertTitle: (x) => `${x} data issues to check`,
      planEmpty: 'No plan yet. Add items to ACTION_PLAN in scripts/config.mjs.',
      partial: 'partial', target: 'Target', leadTarget: 'Lead target', walkinTarget: 'Walk-in target',
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      mshort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      current: 'current', metric: { lead: 'Leads', walkin: 'Walk-ins', views: 'Views (all platforms)', profile: 'Profile visits', wa: 'Outlet WhatsApp clicks' },
      ins: {
        bestCat: (x, f) => `<strong>${x.cat}</strong> is the strongest category at ${f.pct(x.pace)} of lead pace.`,
        onPace: (x, f) => `${x.type} on track: <strong>${f.pct(x.pace)}</strong> of pace.`,
        momUp: (x, f) => `${x.metric} up <strong>${f.pct(x.ch)}</strong> (${f.n(x.from)} → ${f.n(x.to)}).`,
        ctrUp: (x, f) => `Profile-to-Linktree CTR rose to <strong>${f.pct(x.to, 1)}</strong> (from ${f.pct(x.from, 1)}).`,
        topVideo: (x, f) => `Best video: ${x.subject} at ${x.outlet || '—'}, <strong>${f.n(x.views)}</strong> views.`,
        worstCat: (x, f) => `<strong>${x.cat}</strong> leads furthest behind: ${f.pct(x.pace)} of pace, <strong>${f.n(x.gap)}</strong> short of target.`,
        behindPace: (x, f) => `${x.type} at only ${f.pct(x.pace)} of pace. Needs <strong>${f.n1(x.need)}</strong> a day to hit target.`,
        momDown: (x, f) => `${x.metric} down <strong>${f.pct(Math.abs(x.ch))}</strong> (${f.n(x.from)} → ${f.n(x.to)}).`,
        lowPosts: (x, f) => `Only <strong>${x.posts}</strong> posts for ${x.cat} (${f.pct(x.share)} of all posts), though it is furthest from target.`,
        staleOutlet: (x, f) => (x.date ? `${x.outlet}: last lead/walk-in data ${f.d(x.date)} (${x.days} days ago).` : `${x.outlet}: no lead/walk-in data this month yet.`),
      },
    },
  };

  const ICONS = {
    overview: '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
    category: '<path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    platform: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
    content: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 9 5 3-5 3V9z"/>',
    funnel: '<path d="M3 4h18l-7 8.5V19l-4 2v-8.5L3 4z"/>',
    summary: '<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="M8 12h8M8 16h5"/>',
    outlet: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M10 20v-5h4v5"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
    repair: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z"/>',
    cc: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15"/><path d="M4 20v-5h5"/>',
    lead: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    walkin: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M10 20v-5h4v5"/>',
  };
  const ico = (name, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  const SECTIONS = ['overview', 'category', 'trend', 'platform', 'content', 'funnel', 'summary', 'outlet'];
  const CATS = ['phone', 'repair', 'cc'];
  const CAT_COLOR = { phone: '#1565ff', repair: '#0a2e8a', cc: '#16a34a', lain: '#6b7690' };
  const PLAT = [['tiktok', 'TikTok', 'var(--c-tt)', 'TT'], ['instagram', 'Instagram', 'var(--c-ig)', 'IG'], ['facebook', 'Facebook', 'var(--c-fb)', 'FB']];

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n = (x) => (x === null || x === undefined || !Number.isFinite(+x) ? '—' : Math.round(x).toLocaleString('en-US'));
  const n1 = (x) => (x === null || x === undefined ? '—' : (Math.round(x * 10) / 10).toLocaleString('en-US'));
  const pct = (x, d = 0) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : (x * 100).toFixed(d) + '%');
  const compact = (x) => (x >= 1e6 ? (x / 1e6).toFixed(x >= 1e7 ? 0 : 1) + 'M' : x >= 1e3 ? Math.round(x / 1e3) + 'k' : String(Math.round(x)));
  const statusOf = (s) => (s === 'yellow' ? 'amber' : s || 'none');
  let lang = 'ms';
  try { lang = localStorage.getItem('kliki-lang') || 'ms'; } catch (e) { /* storan disekat */ }
  const L = () => T[lang];
  const ymLabel = (ym) => `${L().months[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;
  const ymShort = (ym) => L().mshort[+ym.slice(5, 7) - 1];
  const dLabel = (iso) => (iso ? `${+iso.slice(8, 10)} ${L().mshort[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}` : '—');
  const F = { n, n1, pct, d: dLabel };
  const chip = (s) => `<span class="chip ${statusOf(s)}">${esc(L().status[statusOf(s)])}</span>`;
  const tone = (s) => (statusOf(s) === 'green' ? 'pos' : statusOf(s) === 'red' ? 'neg' : '');

  // tooltip
  const tip = $('tip');
  function showTip(e, html) {
    tip.innerHTML = html; tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let x = e.clientX + 14, y = e.clientY - r.height - 12;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
    if (y < 8) y = e.clientY + 16;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  const hideTip = () => { tip.hidden = true; };

  // ---------- data ----------
  let D = null, cur = null;
  async function load() {
    try {
      const r = await fetch('data/dashboard.json', { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      return await r.json();
    } catch (e) {
      if (window.DASHBOARD_DATA) return window.DASHBOARD_DATA;
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'data/dashboard.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      return window.DASHBOARD_DATA;
    }
  }

  function init(data) {
    D = data;
    cur = D.currentMonth;
    const h = location.hash.slice(1);
    if (/^\d{4}-\d{2}$/.test(h) && D.months[h]) cur = h;
    $('month').addEventListener('change', (e) => { cur = e.target.value; history.replaceState(null, '', '#' + cur); render(); });
    for (const b of document.querySelectorAll('.seg button')) b.addEventListener('click', () => {
      lang = b.dataset.lang; try { localStorage.setItem('kliki-lang', lang); } catch (e) { /* abaikan */ }
      render();
    });
    let t; let lastW = innerWidth;
    addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; clearTimeout(t); t = setTimeout(render, 160); });
    render();
    observeNav();
  }

  function render() {
    const M = D.months[cur]; const l = L();
    document.documentElement.lang = lang;
    for (const b of document.querySelectorAll('.seg button')) { b.classList.toggle('on', b.dataset.lang === lang); b.setAttribute('aria-pressed', String(b.dataset.lang === lang)); }
    for (const e of document.querySelectorAll('[data-i18n]')) { const v = l[e.dataset.i18n]; if (typeof v === 'string') e.textContent = v; }
    const sel = $('month'); sel.replaceChildren();
    for (const k of Object.keys(D.months).sort().reverse()) {
      const o = document.createElement('option'); o.value = k; o.textContent = ymLabel(k) + (k === D.currentMonth ? ` (${l.current})` : ''); sel.appendChild(o);
    }
    sel.value = cur;
    renderNav();
    const g = new Date(D.generatedAt).toLocaleString(lang === 'ms' ? 'ms-MY' : 'en-GB', { timeZone: 'Asia/Kuala_Lumpur', dateStyle: 'medium', timeStyle: 'short' });
    $('meta').textContent = l.metaLine(ymLabel(cur), dLabel(M.asOf), g);
    $('side-foot').textContent = l.sideFoot;
    renderAlert(M);
    renderKpi($('kpi-lead'), 'lead', M);
    renderKpi($('kpi-walkin'), 'walkin', M);
    renderCats(M);
    renderTrends();
    renderPlatforms(M);
    renderContent(M);
    renderStages(M);
    renderConv(M);
    renderSummary(M);
    renderOutlets(M);
  }

  function renderNav() {
    const nav = $('nav'); const active = nav.querySelector('a.on')?.dataset.sec || 'overview';
    nav.innerHTML = SECTIONS.map((s) => `<a href="#sec-${s}" data-sec="${s}" class="${s === active ? 'on' : ''}">${ico(s)}<span>${esc(L().nav[s])}</span></a>`).join('');
    for (const a of nav.querySelectorAll('a')) a.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('sec-' + a.dataset.sec).scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      setActive(a.dataset.sec);
    });
  }
  function setActive(s) { for (const a of document.querySelectorAll('#nav a')) a.classList.toggle('on', a.dataset.sec === s); }
  function observeNav() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((ents) => {
      const vis = ents.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActive(vis.target.id.replace('sec-', ''));
    }, { rootMargin: '-20% 0px -65% 0px' });
    for (const s of SECTIONS) io.observe(document.getElementById('sec-' + s));
  }

  function renderAlert() {
    const list = D.warnings.filter((w) => !/^\d{4}-\d{2}/.test(w.msg) ? cur === D.currentMonth : w.msg.startsWith(cur));
    $('alert').hidden = !list.length;
    $('alert-title').textContent = L().alertTitle(list.length);
    $('alert-list').innerHTML = list.map((w) => `<li>${esc(w.msg)}</li>`).join('');
  }

  // ---------- KPI ----------
  function prevMonth(ym) { let [y, m] = ym.split('-').map(Number); m--; if (!m) { m = 12; y--; } return `${y}-${String(m).padStart(2, '0')}`; }
  function renderKpi(root, type, M) {
    const l = L(); const m = M.company[type].total; const P = D.months[prevMonth(cur)];
    const s = statusOf(m.status);
    const fill = Math.min(100, (m.actual / m.target) * 100);
    let delta = '—';
    if (P && !M.isCurrent && P.company[type].total.actual) {
      const ch = (m.actual - P.company[type].total.actual) / P.company[type].total.actual;
      delta = `<span class="${ch >= 0 ? 'pos' : 'neg'}">${ch >= 0 ? '▲' : '▼'} ${pct(Math.abs(ch))}</span>`;
    }
    const stats = M.isCurrent
      ? [[l.pace, n(m.pace)], [l.needDay, n1(m.needPerDay)], [l.dailyTarget, n(m.dailyLabel)], [l.gap, n(Math.max(0, m.gap))]]
      : [[l.gap, m.gap > 0 ? n(m.gap) : '0'], [l.avgDay, n1(m.actual / M.daysInMonth)], [l.dailyTarget, n(m.dailyLabel)], [l.vsPrev, delta]];
    root.innerHTML = `
      <div class="kpi-top">
        <div class="kpi-label"><span class="ib">${ico(type)}</span>${esc(type === 'lead' ? l.totalLead : l.totalWalkin)}</div>
        ${chip(m.status)}
      </div>
      <div class="kpi-num"><span class="v">${n(m.actual)}</span><span class="t">/ ${n(m.target)}</span></div>
      <div>
        <div class="progress"><i class="${s === 'none' ? '' : s}" style="width:${fill}%"></i>${M.isCurrent ? `<b style="left:${Math.min(100, (m.pace / m.target) * 100)}%"></b>` : ''}</div>
        <div class="progress-legend"><span class="kpi-pct ${tone(m.status)}">${pct(m.pct)} ${esc(l.achieved)}</span><span>${M.isCurrent ? esc(l.paceMark) : `${esc(l.target)} ${n(m.target)}`}</span></div>
      </div>
      <div class="stats">${stats.map(([k, v]) => `<div class="stat"><span>${esc(k)}</span><strong>${v}</strong></div>`).join('')}</div>`;
  }

  // ---------- categories ----------
  function renderCats(M) {
    const l = L();
    $('cat-grid').innerHTML = CATS.map((k) => {
      const Ld = M.company.lead[k], W = M.company.walkin[k];
      const worst = [Ld, W].sort((a, b) => (a.paceRatio ?? 0) - (b.paceRatio ?? 0))[0];
      const c = M.content?.byCat?.[k];
      const bar = (m) => { const s = statusOf(m.status); return `<div class="progress"><i class="${s === 'none' ? '' : s}" style="width:${Math.min(100, m.pct * 100)}%"></i>${M.isCurrent ? `<b style="left:${Math.min(100, (m.pace / m.target) * 100)}%"></b>` : ''}</div>`; };
      const row = (label, m) => `<div class="metric"><div class="metric-row"><span class="k">${esc(label)}</span><span class="p ${tone(m.status)}">${pct(m.pct)}</span></div>
        <div class="metric-row"><span class="v"><strong>${n(m.actual)}</strong>/ ${n(m.target)}</span></div>${bar(m)}</div>`;
      return `<article class="card cat">
        <div class="cat-top"><div class="cat-name"><span class="ib" style="background:${CAT_COLOR[k]}14;color:${CAT_COLOR[k]}">${ico(k)}</span>${esc(l.cat[k])}</div>${chip(worst.status)}</div>
        ${row(l.lead, Ld)}${row(l.walkin, W)}
        <div class="cat-foot"><span>${esc(l.posts)} <strong>${c ? n(c.posts) : '—'}</strong></span><span>${esc(l.views)} <strong>${c ? compact(c.views) : '—'}</strong></span><span>${esc(l.dailyTarget)} <strong>${n(Ld.dailyLabel)}</strong></span></div>
      </article>`;
    }).join('');
  }

  // ---------- line chart ----------
  function lineChart(box, { labels, series, partialLast, yFmt = compact }) {
    box.replaceChildren();
    const W = Math.max(300, box.clientWidth || 560), H = Math.round(Math.min(280, Math.max(200, W * 0.42)));
    const pl = 46, pr = 14, pt = 12, pb = 26;
    const all = series.flatMap((s) => s.values).filter((v) => v !== null && v !== undefined);
    const max = Math.max(1, ...all) * 1.08;
    const step = labels.length > 1 ? (W - pl - pr) / (labels.length - 1) : 0;
    const x = (i) => pl + i * step;
    const y = (v) => pt + (1 - v / max) * (H - pt - pb);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', '100%');
    let html = '';
    for (let g = 0; g <= 4; g++) {
      const v = (max / 1.08) * (g / 4);
      html += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line-2)"/>`;
      html += `<text x="${pl - 8}" y="${y(v) + 4}" text-anchor="end">${esc(yFmt(v))}</text>`;
    }
    labels.forEach((lb, i) => { html += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(lb)}</text>`; });
    for (const s of series) {
      const pts = s.values.map((v, i) => [i, v]).filter(([, v]) => v !== null && v !== undefined);
      if (!pts.length) continue;
      const solid = partialLast && !s.flat ? pts.filter(([i]) => i < labels.length - 1) : pts;
      const d = (arr) => arr.map(([i, v], j) => `${j ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
      if (solid.length > 1) html += `<path d="${d(solid)}" fill="none" stroke="${s.color}" stroke-width="${s.flat ? 1.5 : 2.4}" ${s.flat ? 'stroke-dasharray="5 5"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
      if (partialLast && !s.flat && pts.length > 1 && pts[pts.length - 1][0] === labels.length - 1) {
        html += `<path d="${d(pts.slice(-2))}" fill="none" stroke="${s.color}" stroke-width="2" stroke-dasharray="3 4"/>`;
      }
      if (!s.flat) pts.forEach(([i, v]) => {
        const hollow = partialLast && i === labels.length - 1;
        html += `<circle class="dot" cx="${x(i)}" cy="${y(v)}" r="3.5" fill="${hollow ? 'var(--card)' : s.color}" stroke="${s.color}" stroke-width="2"/>`;
      });
    }
    html += `<line class="guide" x1="0" x2="0" y1="${pt}" y2="${H - pb}" stroke="var(--muted)" stroke-dasharray="3 3" opacity="0"/>`;
    html += `<rect x="${pl - step / 2}" y="${pt}" width="${W - pl - pr + step}" height="${H - pt - pb}" fill="transparent" class="hit"/>`;
    svg.innerHTML = html;
    box.appendChild(svg);
    const guide = svg.querySelector('.guide'); const hit = svg.querySelector('.hit');
    hit.addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect(); const sx = ((e.clientX - r.left) / r.width) * W;
      const i = Math.max(0, Math.min(labels.length - 1, Math.round((sx - pl) / (step || 1))));
      guide.setAttribute('x1', x(i)); guide.setAttribute('x2', x(i)); guide.setAttribute('opacity', 1);
      const rows = series.filter((s) => s.values[i] !== null && s.values[i] !== undefined).map((s) => `<div><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${s.color};margin-right:6px"></span>${esc(s.name)}: <strong>${n(s.values[i])}</strong></div>`).join('');
      showTip(e, `<div style="font-weight:700;margin-bottom:3px">${esc(labels[i])}${partialLast && i === labels.length - 1 ? ` (${esc(L().partial)})` : ''}</div>${rows}`);
    });
    hit.addEventListener('pointerleave', () => { guide.setAttribute('opacity', 0); hideTip(); });
  }
  const legend = (id, items) => { $(id).innerHTML = items.map(([name, color, dash]) => `<span><i class="${dash ? 'dash' : ''}" style="background:${color}"></i>${esc(name)}</span>`).join(''); };

  function renderTrends() {
    const l = L(); const keys = Object.keys(D.months).sort().filter((k) => k <= cur);
    const partial = D.months[cur].isCurrent;
    const labels = keys.map(ymShort);
    const tgtL = D.months[cur].company.lead.total.target, tgtW = D.months[cur].company.walkin.total.target;
    lineChart($('ch-lw'), { labels, partialLast: partial, yFmt: (v) => n(v), series: [
      { name: l.lead, color: 'var(--blue)', values: keys.map((k) => D.months[k].company.lead.total.actual) },
      { name: l.walkin, color: 'var(--navy)', values: keys.map((k) => D.months[k].company.walkin.total.actual) },
      { name: l.leadTarget, color: '#8fb3ff', flat: true, values: keys.map(() => tgtL) },
      { name: l.walkinTarget, color: '#8a9bc7', flat: true, values: keys.map(() => tgtW) },
    ] });
    legend('lg-lw', [[l.lead, 'var(--blue)'], [l.walkin, 'var(--navy)'], [l.target, 'var(--muted)', true]]);
    lineChart($('ch-rc'), { labels, partialLast: partial, series: PLAT.map(([k, name, color]) => ({ name, color, values: keys.map((m) => D.months[m].platforms[k].view) })) });
    legend('lg-rc', PLAT.map(([, name, color]) => [name, color]));
  }

  // ---------- platforms ----------
  function renderPlatforms(M) {
    const l = L(); const total = M.platforms.all.view || 1;
    const keys = Object.keys(D.months).sort().filter((k) => k <= cur).slice(-6);
    $('plat-grid').innerHTML = PLAT.map(([k, name, color, short]) => {
      const p = M.platforms[k];
      const vals = keys.map((m) => D.months[m].platforms[k].view);
      const mx = Math.max(1, ...vals); const w = 120, h = 34;
      const path = vals.map((v, i) => `${i ? 'L' : 'M'}${((i / Math.max(1, vals.length - 1)) * w).toFixed(1)},${(h - 3 - (v / mx) * (h - 6)).toFixed(1)}`).join('');
      return `<article class="card plat">
        <div class="plat-top"><div class="plat-name"><span class="plat-logo" style="background:${color}">${short}</span>${esc(name)}</div>
          <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg></div>
        <div class="plat-big"><span>${esc(l.plat.view)}</span><div class="v">${n(p.view)}</div><span class="share">${esc(l.shareOf(pct(p.view / total)))} · ${esc(l.days(p.days))}</span></div>
        <div class="plat-stats">
          <div class="stat"><span>${esc(l.plat.profile)}</span><strong>${n(p.profile)}</strong></div>
          <div class="stat"><span>${esc(l.plat.engagement)}</span><strong>${n(p.engagement)}</strong></div>
          <div class="stat"><span>${esc(l.plat.followers)}</span><strong>${n(p.newFollowers)}</strong></div>
        </div>
      </article>`;
    }).join('');
  }

  // ---------- content ----------
  function renderContent(M) {
    const l = L(); const t = $('content-table'); const C = M.content;
    if (!C || !C.top.length) { t.innerHTML = '<tbody><tr><td>—</td></tr></tbody>'; return; }
    const max = C.top[0].views || 1;
    t.innerHTML = `<thead><tr><th>${l.th.rank}</th><th>${l.th.content}</th><th>${l.th.outlet}</th><th>${l.th.date}</th><th>${l.th.funnel}</th><th>${l.th.tier}</th><th class="r">${l.th.views}</th></tr></thead><tbody>` +
      C.top.map((p, i) => {
        const cat = p.category in CAT_COLOR ? p.category : 'lain';
        return `<tr>
          <td><span class="rank r${i + 1}">${i + 1}</span></td>
          <td><div class="cell-content"><span class="thumb" style="background:${CAT_COLOR[cat]}">${ico(cat === 'lain' ? 'content' : cat)}</span>
            <div><div class="t1">${esc([p.subject, p.type].filter(Boolean).join(' · '))}</div><div class="t2">${esc(p.sub || '')}</div></div></div></td>
          <td>${esc(p.outlet || '—')}</td>
          <td>${esc(dLabel(p.date))}</td>
          <td>${p.stage ? `<span class="tag ${p.stage}">${p.stage === 'NA' ? 'N/A' : p.stage}</span>` : '<span class="tag none">—</span>'}</td>
          <td><span class="tier">${esc(p.tier || '—')}</span></td>
          <td class="r"><div class="views-cell"><div class="views-bar"><i style="width:${((p.views || 0) / max) * 100}%"></i></div><strong>${n(p.views)}</strong></div></td>
        </tr>`;
      }).join('') + '</tbody>';
  }

  // ---------- funnel ----------
  function renderStages(M) {
    const l = L(); const S = M.content?.byStage; const box = $('stages');
    if (!S) { box.innerHTML = `<p class="empty">${esc(l.noType)}</p>`; return; }
    const totalPosts = Object.values(S).reduce((a, b) => a + b.posts, 0) || 1;
    const maxV = Math.max(1, ...Object.values(S).map((s) => s.views));
    const color = { TOFU: 'var(--blue)', MOFU: '#4338ca', BOFU: 'var(--green)' };
    box.innerHTML = ['TOFU', 'MOFU', 'BOFU'].map((k) => {
      const s = S[k] || { posts: 0, views: 0 };
      return `<div class="stage"><span class="tag ${k}">${k}</span><div class="stage-b">
        <div class="stage-row"><span>${esc(l.posts)} <strong>${n(s.posts)}</strong> (${pct(s.posts / totalPosts)})</span><span>${esc(l.views)} <strong>${n(s.views)}</strong></span><span>${esc(l.avgView)} <strong>${s.posts ? n(s.views / s.posts) : '—'}</strong></span></div>
        <div class="stage-bar"><i style="width:${(s.views / maxV) * 100}%;background:${color[k]}"></i></div>
        <div class="stage-desc">${esc(l.stages[k])}</div></div></div>`;
    }).join('');
  }

  function renderConv(M) {
    const l = L(); const Fn = M.funnel; const lt = Fn.linktreeComplete;
    const steps = [
      ['views', Fn.views, null, ''],
      ['profile', Fn.profileVisits, Fn.views ? pct(Fn.profileVisits / Fn.views, 2) : null, ''],
      ['linktree', lt ? Fn.linktreeUniqueView : null, lt && Fn.profileVisits ? pct(Fn.linktreeUniqueView / Fn.profileVisits, 1) : null, ''],
      ['wa', lt ? Fn.waOutlet : null, null, ''],
      ['lead', Fn.leads, lt && Fn.leadPerWaClick ? `${n1(Fn.leadPerWaClick)} ${l.perLead}` : null, 'outlet'],
      ['walkin', Fn.walkins, Fn.walkinPerLead ? `${pct(Fn.walkinPerLead)} ${l.ofLead}` : null, 'outlet'],
    ];
    // lebar ikut skala log supaya peringkat kecil masih kelihatan
    const vals = steps.map((s) => s[1]).filter((v) => v);
    const lmax = Math.log10(Math.max(...vals, 10)), lmin = Math.log10(Math.max(1, Math.min(...vals)));
    const width = (v) => (v ? 22 + 78 * ((Math.log10(v) - lmin) / Math.max(0.01, lmax - lmin)) : 100);
    $('conv').innerHTML = `<div class="conv">${steps.map(([k, v, rate, cls]) => `
      <div class="conv-row ${cls} ${v === null ? 'empty' : ''}">
        <div class="k">${esc(l.conv[k])}<small>${esc(k === 'walkin' && lt ? `${l.locClicks}: ${n(Fn.locOutlet)}` : l.convSrc[k])}</small></div>
        <div class="conv-track"><i style="width:${width(v)}%">${v === null ? esc(l.notFilled) : n(v)}</i></div>
        <div class="rate">${rate ? `<strong>${esc(rate)}</strong>` : ''}</div>
      </div>`).join('')}</div><p class="note">${esc(l.convNote)}</p>`;
    $('hq').innerHTML = `<strong>${esc(l.hq)}</strong>` + (Fn.hqWa
      ? `<span>${esc(l.postage)}: <strong>${n(Fn.hqWa.postage)}</strong></span><span>${esc(l.buyback)}: <strong>${n(Fn.hqWa.buyback)}</strong></span><span>${esc(l.total)}: <strong>${n(Fn.hqWa.total)}</strong></span>`
      : `<span>${esc(l.notFilled)}</span>`);
  }

  // ---------- summary ----------
  function renderSummary(M) {
    const l = L();
    const fill = (x) => {
      const y = { ...x };
      if (y.cat) y.cat = esc(l.cat[y.cat]);
      if (y.type) y.type = esc(y.type === 'lead' ? l.lead : l.walkin);
      if (y.metric) y.metric = esc(l.metric[y.metric]);
      if (y.subject) y.subject = esc(y.subject);
      if (y.outlet) y.outlet = esc(y.outlet);
      const f = l.ins[x.k]; return f ? f(y, F) : '';
    };
    const li = (arr) => (arr.length ? arr.map((x) => `<li>${fill(x)}</li>`).join('') : '<li>—</li>');
    $('sum-hi').innerHTML = li(M.insights.highlights);
    $('sum-lo').innerHTML = li(M.insights.improve);
    $('plan-title').textContent = l.planTitle(ymLabel(M.actionPlan.forMonth));
    const plan = $('sum-plan');
    plan.innerHTML = M.actionPlan.items.map((t) => `<li>${esc(t)}</li>`).join('');
    plan.nextElementSibling?.classList.contains('empty') && plan.nextElementSibling.remove();
    if (!M.actionPlan.items.length) plan.insertAdjacentHTML('afterend', `<p class="empty">${esc(l.planEmpty)}</p>`);
  }

  // ---------- outlets ----------
  function renderOutlets(M) {
    const l = L();
    const head = `<thead><tr>${l.outletTh.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>`;
    const cell = (a, t) => { const r = a / t; return `<span class="${r >= 1 ? 'pos' : 'neg'}">${pct(r)}</span>`; };
    let tl = 0, tt = 0, wl = 0, wt = 0, wa = 0;
    const rows = D.outlets.map((o) => {
      const r = M.outlets[o.key]; const w = M.linktree ? M.linktree.wa[o.key] : null;
      tl += r.lead.total; tt += r.target.lead.total; wl += r.walkin.total; wt += r.target.walkin.total; wa += w || 0;
      return `<tr><td>${esc(r.name)}${r.noRepair ? ' *' : ''}</td><td>${n(r.lead.total)}</td><td>${n(r.target.lead.total)}</td><td>${cell(r.lead.total, r.target.lead.total)}</td>
        <td>${n(r.walkin.total)}</td><td>${n(r.target.walkin.total)}</td><td>${cell(r.walkin.total, r.target.walkin.total)}</td><td>${n(w)}</td><td>${esc(dLabel(r.lastDate))}</td></tr>`;
    }).join('');
    const tot = `<tr class="total"><td>${esc(l.total)}</td><td>${n(tl)}</td><td>${n(tt)}</td><td>${cell(tl, tt)}</td><td>${n(wl)}</td><td>${n(wt)}</td><td>${cell(wl, wt)}</td><td>${M.linktree ? n(wa) : '—'}</td><td></td></tr>`;
    $('outlet-table').innerHTML = head + `<tbody>${rows}${tot}</tbody>`;
  }

  load().then(init).catch((e) => { $('meta').textContent = 'Gagal muat data / Failed to load data: ' + e.message; });
})();
