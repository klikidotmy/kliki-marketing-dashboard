// KLIKI Marketing Dashboard — UI (paparan sahaja; semua kiraan dalam data.js)
(function () {
  const CFG = window.KLIKI_CONFIG, KD = window.KD, T = CFG.targets;
  const $ = s => document.querySelector(s);
  const MON = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  const CACHE_KEY = 'kliki-mkt-v1';
  const TABS = ['overview', 'content', 'analisis', 'funnel', 'outlet', 'trend'];
  const TITLES = { overview: 'Overview: Company Marketing', content: 'Content Performance', analisis: 'Marketing Analysis', funnel: 'Aliran Pelanggan', outlet: 'Prestasi Outlet', trend: 'Trend Bulanan' };

  const savedTab = localGet('kliki-mkt-tab');
  const state = { ds: null, month: null, picked: false, tab: TABS.includes(savedTab) ? savedTab : 'overview', loading: false };

  // ---------- helpers ----------
  function localGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
  function localSet(k, v) { try { localStorage.setItem(k, v); } catch { /* penuh / disekat */ } }
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Format nombor seragam: penuh dengan koma; juta ditulis "3.82M"
  function fmt(n) {
    if (n == null || Number.isNaN(n)) return '—';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    return Math.round(n).toLocaleString('en-MY');
  }
  const fmtPct = (n, d = 1) => n == null ? '—' : n.toFixed(d) + '%';
  const fmtVal = (n, unit) => unit === '%' ? fmtPct(n) : fmt(n);
  const daysIn = (y, m) => KD.daysIn(y, m);
  const monLabel = key => { const [y, m] = key.split('-'); return `${MON[+m - 1]} ${y}`; };
  const monShort = (y, m) => `${MON[m - 1]} '${String(y).slice(2)}`;
  const parseKey = key => key.split('-').map(Number);
  function isCurrent(key) { const n = new Date(); return key === KD.ym(n.getFullYear(), n.getMonth() + 1); }

  const ICON = { good: '✓', warn: '!', up: '↗', bad: '✕', na: '–' };
  const iconOf = st => st.reason === 'up' ? ICON.up : ICON[st.level];
  function statusWord(st, live) {
    if (st.level === 'good') return live ? 'On track' : 'Capai';
    if (st.level === 'warn') return st.reason === 'up' ? 'Naik' : (live ? 'Perlahan' : 'Hampir');
    if (st.level === 'bad') return live ? 'Ketinggalan' : 'Belum';
    return 'Tiada data';
  }
  function bar(actual, target, st, pace) {
    const w = target && actual != null ? Math.max(0, Math.min(100, 100 * actual / target)) : 0;
    const pm = pace < 1 ? `<span class="pace" style="left:${(pace * 100).toFixed(1)}%"></span>` : '';
    return `<div class="prog ${st.level}" role="progressbar" aria-valuenow="${Math.round(w)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${w}%"></i>${pm}</div>`;
  }
  function delta(v, label) {
    if (v == null || !Number.isFinite(v)) return '';
    const a = Math.abs(v) >= 999 ? '>999' : Math.abs(v).toFixed(0);
    return `<span class="d">${v >= 0 ? '▲' : '▼'} ${a}% <span class="dl">${label}</span></span>`;
  }

  // Beza vs tempoh lain. Untuk metrik yang boleh negatif (net followers), peratus tak bermakna: guna beza mutlak.
  function cmp(k, base, label) {
    if (k.nowN == null || base == null) return '';
    if (k.floor || base < 0 || k.nowN < 0) {
      const d = k.nowN - base;
      return `<span class="d">${d >= 0 ? '▲ +' : '▼ −'}${fmt(Math.abs(d))} <span class="dl">${label}</span></span>`;
    }
    return delta(KD.change(k.nowN, base), label);
  }

  // Kad KPI: lebar penuh, satu isyarat status (ikon + warna bar), nilai/target, satu baris perbandingan
  function kpiCard(k, opts = {}) {
    const st = k.status, live = k.partial;
    const [y, m] = parseKey(state.month);
    const prevLbl = monShort(...KD.prevYM(y, m)), lyLbl = monShort(y - 1, m);
    const pctTxt = k.floor ? `had ${fmt(k.target)}` : (st.pct != null ? `${Math.round(st.pct)}%` : '');
    const tgt = k.actual == null ? '' : k.floor ? '' : `<span class="tg">/ ${fmtVal(k.target, k.unit)}</span>`;
    const proj = live && !k.unit && !k.floor && k.actual != null ? `<span class="d"><span class="dl">unjuran</span> ${fmt(k.actual / k.pace)}</span>` : '';
    return `<div class="kpi ${opts.hero ? 'card hero' : 'krow'}">
      <div class="k-top"><span class="label">${esc(k.label)}</span>
        <span class="st ${st.level}">${iconOf(st)} ${statusWord(st, live)}${pctTxt ? ` <span class="pct">${pctTxt}</span>` : ''}</span></div>
      <div class="k-mid"><span class="value">${fmtVal(k.actual, k.unit)}</span>${tgt}</div>
      ${k.floor || k.actual == null ? '' : bar(k.actual, k.target, st, k.pace)}
      <div class="deltas">${proj}${cmp(k, k.prev, 'vs ' + prevLbl)}${cmp(k, k.lyN, 'vs ' + lyLbl)}</div>
      ${opts.extra || ''}
    </div>`;
  }
  const kpiList = ks => `<div class="card klist">${ks.map(k => kpiCard(k)).join('')}</div>`;

  // ---------- lebar chart ikut ruang sebenar (supaya teks tak membesar/mengecil) ----------
  // frac = pecahan lebar #view yang diduduki kad bila layout berbilang lajur aktif
  function chartW(frac = 1, multiMin = 1100) {
    const vw = ($('#view') && $('#view').clientWidth) || innerWidth;
    const cs = getComputedStyle($('#view'));
    const inner = vw - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
    const pad = innerWidth < 768 ? 34 : 42;
    const w = (innerWidth >= multiMin && frac < 1 ? (inner - 16) * frac : inner) - pad;
    return Math.max(280, Math.round(w));
  }

  // ---------- chart (SVG, satu siri) ----------
  function barChart(data, opts = {}) {
    const W = opts.w || Math.min(chartW(), 1100), H = opts.h || (W > 500 ? 190 : 150), pl = 44, pr = 6, pt = 10, pb = 20;
    const vals = data.map(d => d.value || 0);
    let max = Math.max(...vals, opts.target || 0, 0), min = Math.min(...vals, 0);
    if (max === min) max = min + 1;
    const y = v => pt + (H - pt - pb) * (max - v) / (max - min);
    const bw = (W - pl - pr) / data.length;
    const gap = Math.min(4, bw * 0.25);
    const tl = v => Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.abs(v) >= 1e3 ? Math.round(v / 1e3) + 'K' : Math.round(v);
    const ticks = [min, (max + min) / 2, max].filter((v, i, a) => a.indexOf(v) === i);
    let s = `<svg class="chart${data.some(d => d.hl) ? ' has-hl' : ''}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || '')}">`;
    for (const t of ticks) s += `<line class="grid-l" x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}"/><text x="${pl - 4}" y="${y(t) + 3}" text-anchor="end">${tl(t)}</text>`;
    if (min < 0) s += `<line class="grid-l zero" x1="${pl}" x2="${W - pr}" y1="${y(0)}" y2="${y(0)}"/>`;
    data.forEach((d, i) => {
      const hx = pl + i * bw;
      const lab = (opts.labelEvery ? i % opts.labelEvery === 0 || i === data.length - 1 : true)
        ? `<text x="${hx + bw / 2}" y="${H - 5}" text-anchor="middle">${esc(d.label)}</text>` : '';
      if (d.value == null) { s += lab + `<rect class="hit" x="${hx}" y="${pt}" width="${bw}" height="${H - pt - pb}" data-tip="${esc(d.tip || d.label)}"/>`; return; }
      const v = d.value, x = hx + gap / 2, w = Math.max(1, bw - gap);
      const y0 = y(Math.max(0, v)), h = Math.max(v === 0 ? 0 : 1.5, Math.abs(y(v) - y(0)));
      const r = Math.min(4, w / 2, h);
      const cls = 'b' + (v < 0 ? ' neg' : '') + (d.dim ? ' dim' : '') + (d.hl ? ' hl' : '');
      if (h > 0) {
        s += v >= 0
          ? `<path class="${cls}" d="M${x},${y0 + h}V${y0 + r}q0,-${r} ${r},-${r}h${w - 2 * r}q${r},0 ${r},${r}V${y0 + h}z"/>`
          : `<path class="${cls}" d="M${x},${y(0)}V${y(0) + h - r}q0,${r} ${r},${r}h${w - 2 * r}q${r},0 ${r},-${r}V${y(0)}z"/>`;
      }
      s += lab + `<rect class="hit" x="${hx}" y="${pt}" width="${bw}" height="${H - pt - pb}" data-tip="${esc(d.tip || `${d.label}: ${fmt(v)}`)}"/>`;
    });
    if (opts.target) s += `<line class="tline" x1="${pl}" x2="${W - pr}" y1="${y(opts.target)}" y2="${y(opts.target)}"/>`;
    return s + '</svg>';
  }

  // Line + area chart (Overview: views harian). Titik null = tiada data, garisan diputuskan.
  let lcId = 0;
  function lineChart(data, opts = {}) {
    const W = opts.w || chartW(), H = opts.h || (W > 500 ? 240 : 180), pl = 46, pr = 10, pt = 16, pb = 24;
    const vals = data.map(d => d.value).filter(v => v != null);
    if (!vals.length) return '';
    const n = data.length;
    let max = Math.max(...vals, opts.target || 0) * 1.08, min = 0;
    if (max <= min) max = min + 1;
    const x = i => pl + (W - pl - pr) * (n === 1 ? 0.5 : i / (n - 1));
    const y = v => pt + (H - pt - pb) * (max - v) / (max - min);
    const tl = v => Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.abs(v) >= 1e3 ? Math.round(v / 1e3) + 'K' : Math.round(v);
    const gid = 'lc-grad-' + (++lcId);
    let s = `<svg class="chart lc" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || '')}">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1565FF" stop-opacity=".28"/><stop offset="1" stop-color="#1565FF" stop-opacity="0"/></linearGradient></defs>`;
    for (let k = 0; k <= 4; k++) {
      const t = min + (max - min) * k / 4;
      s += `<line class="grid-l" x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}"/><text x="${pl - 6}" y="${y(t) + 3.5}" text-anchor="end">${tl(t)}</text>`;
    }
    // segmen berterusan
    const segs = []; let cur = [];
    data.forEach((d, i) => { if (d.value == null) { if (cur.length) segs.push(cur); cur = []; } else cur.push(i); });
    if (cur.length) segs.push(cur);
    for (const sg of segs) {
      const line = sg.map((i, j) => `${j ? 'L' : 'M'}${x(i).toFixed(1)},${y(data[i].value).toFixed(1)}`).join('');
      if (sg.length > 1) s += `<path d="${line}L${x(sg[sg.length - 1]).toFixed(1)},${y(0)}L${x(sg[0]).toFixed(1)},${y(0)}Z" fill="url(#${gid})"/>`;
      s += `<path class="line" d="${line}"/>`;
    }
    if (opts.target) s += `<line class="tline" x1="${pl}" x2="${W - pr}" y1="${y(opts.target)}" y2="${y(opts.target)}"/>`;
    const every = opts.labelEvery || Math.ceil(n / Math.max(4, Math.floor((W - pl) / 48)));
    const lastI = segs.length ? segs[segs.length - 1].slice(-1)[0] : -1;
    data.forEach((d, i) => {
      if (i % every === 0 || i === n - 1) s += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(d.label)}</text>`;
      if (d.value != null && (n <= 31)) s += `<circle class="pt${i === lastI ? ' last' : ''}" cx="${x(i).toFixed(1)}" cy="${y(d.value).toFixed(1)}" r="${i === lastI ? 4 : 2.5}"/>`;
      const bw = (W - pl - pr) / Math.max(1, n - 1);
      s += `<rect class="hit" x="${(x(i) - bw / 2).toFixed(1)}" y="${pt}" width="${bw.toFixed(1)}" height="${H - pt - pb}" data-tip="${esc(d.tip || `${d.label}: ${fmt(d.value)}`)}"/>`;
    });
    return s + '</svg>';
  }

  const tip = $('#tip');
  function showTip(e) {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    const r = t.getBoundingClientRect();
    tip.textContent = t.dataset.tip; tip.hidden = false;
    tip.style.left = Math.min(Math.max(r.left + r.width / 2, 80), innerWidth - 80) + 'px'; tip.style.top = r.top + 'px';
  }
  document.addEventListener('pointerover', showTip);
  document.addEventListener('pointerdown', showTip);
  document.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

  // ---------- 3 perkara bulan ni ----------
  // Insight padat: satu baris setiap satu, ketik untuk butiran
  function insightBlock(y, m) {
    const ins = KD.insights(state.ds, y, m);
    if (!ins.length) return '';
    return `<div class="card insights">${ins.map(i => `
      <details class="ins ${i.kind}"><summary>
        <span class="ins-i" aria-hidden="true">${i.kind === 'good' ? '✓' : '✕'}</span>
        <span class="ins-t">${esc(i.title)}</span><span class="ins-c">${esc(i.chip || '')}</span></summary>
        <p>${esc(i.text)}</p></details>`).join('')}</div>`;
  }

  // Cadangan fokus ikut peringkat funnel paling lemah
  const ACT = {
    allVisits: 'Hook 3 saat pertama dan CTA "tengok profile" dalam video.',
    uniqueClicks: 'Semak bio & pin video: pastikan sebab untuk klik link jelas (harga, promo, lokasi).',
    wa: 'Semak susunan Linktree: butang WhatsApp outlet patut paling atas dan jelas.',
    leads: 'Semak masa balas WhatsApp di outlet; klik yang tak dibalas cepat tak jadi lead.',
    walkin: 'Follow-up leads (harga, stok, janji temu) supaya mereka datang ke kedai.',
  };

  // ---------- views ----------
  function viewFunnel(key) {
    const [y, m] = parseKey(key);
    const f = KD.funnel(state.ds, y, m);
    const live = isCurrent(key);
    const ib = insightBlock(y, m);
    if (!f.stages.some(s => s.value > 0)) return ib + `<div class="card empty">Belum ada data aliran pelanggan untuk ${monLabel(key)}.</div>`;
    // "Dari content ke kedai": corong bersambung. Lebar segmen tetap mengecil (visual), bukan ikut skala.
    const W = [100, 80, 64, 52, 42, 34, 28];
    const COL = ['#5B8CFF', '#4479FB', '#2F63EE', '#2350D6', '#1A3DAA', '#132E85'];
    const ICO = {
      allViews: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
      allVisits: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      uniqueClicks: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
      wa: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1z"/><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1-1 1.8.8"/>',
      leads: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
      walkin: '<path d="M4 9l1.5-5h13L20 9M4 9h16v2a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0A2.7 2.7 0 0 1 4 11zM5 13v7h14v-7"/>',
    };
    const ico = id => `<span class="cf-ico" aria-hidden="true"><svg viewBox="0 0 24 24">${ICO[id] || ''}</svg></span>`;
    function i3(id) { return f.stages.findIndex(x => x.id === id); }
    const rateTxt = s => {
      const r = s.rate; if (r == null) return null;
      if (s.id === 'wa') return null; // klik WA tak unik: nisbah vs unique view mengelirukan
      if (s.id === 'leads') { const wa = f.stages[i3('wa')].value; return wa ? { v: (s.value / wa).toFixed(1), u: 'lead / klik' } : null; }
      if (s.id === 'walkin') return { v: Math.round(r) + '%', u: 'dari lead' };
      return { v: fmtPct(r, r < 10 ? 2 : 1), u: s.note };
    };
    const ex = f.extra || {};
    const top = f.stages[0].value, end = f.stages[f.stages.length - 1].value;
    const every = top && end ? Math.round(top / end) : null;
    let h = `<h2>Aliran pelanggan <span class="note">· ${monLabel(key)}${live ? ' (bulan semasa)' : ''}</span></h2>
      <div class="card cfun"><div class="cf-head"><div><span class="cf-eyebrow">Customer journey</span><h3>Dari content ke kedai</h3></div>
      ${every ? `<div class="cf-kpi"><b>1 : ${every.toLocaleString('en-MY')}</b><span>1 walk-in setiap ${every.toLocaleString('en-MY')} view</span></div>` : ''}</div><ol class="cf-list">`;
    f.stages.forEach((s, i) => {
      const isW = f.weakest && f.weakest.id === s.id, isS = f.strongest && f.strongest.id === s.id;
      const rt = i ? rateTxt(s) : null;
      const sub = s.id === 'walkin' ? `Klik lokasi: ${fmt(ex.location)}` : s.sub;
      const a = (100 - W[i]) / 2, b = (100 - (W[i + 1] || W[i] - 6)) / 2;
      const clip = `polygon(${a}% 0, ${100 - a}% 0, ${100 - b}% 100%, ${b}% 100%)`;
      const tip = i && s.rate != null ? `${s.note}: ${fmtPct(s.rate)}${s.avg3 != null ? ' · purata 3 bln ' + fmtPct(s.avg3) : ''}` : `${s.label}: ${s.value == null ? '—' : Math.round(s.value).toLocaleString('en-MY')}`;
      const pill = rt ? `<div class="cf-pill${isW ? ' weak' : isS ? ' strong' : ''}"><b>${rt.v}</b><span>${esc(rt.u)}</span></div>${isW || isS ? `<small class="cf-vs ${isW ? 'weak' : 'strong'}">${isW ? '▼ bawah' : '▲ atas'} purata 3 bln</small>` : ''}` : '';
      h += `<li class="cf-row${s.outlet ? ' out' : ''}">
        <div class="cf-lbl">${ico(s.id)}<div><b>${esc(s.label)}</b><span>${esc(sub)}</span></div></div>
        <div class="cf-seg" style="--c:${COL[i] || COL[COL.length - 1]};clip-path:${clip}" data-tip="${esc(tip)}"><span>${s.value == null ? '—' : Math.round(s.value).toLocaleString('en-MY')}</span></div>
        <div class="cf-rate">${pill}</div>
      </li>`;
    });
    h += `</ol><div class="cf-legend"><span><i class="pl"></i>Data platform & Linktree</span><span><i class="ou"></i>Direkod staff outlet</span></div>
      <p class="cf-note">Klik WhatsApp tak sama dengan mesej dihantar, dan lead outlet datang dari semua source. Ratio ni sebagai petunjuk je, bukan conversion sebenar.</p>`;
    if (ex.waOnline != null || ex.waBuyback != null) {
      h += `<div class="cf-hq"><div class="cf-hq-h"><b>Channel HQ</b><span>Takde rekod lead</span></div>
        <div class="cf-hq-t"><span>WA Online Postage</span><b>${fmt(ex.waOnline)}</b></div>
        <div class="cf-hq-t"><span>WA Buyback</span><b>${fmt(ex.waBuyback)}</b></div>
        <div class="cf-hq-t tot"><span>Total klik</span><b>${fmt((ex.waOnline || 0) + (ex.waBuyback || 0))}</b></div></div>`;
    }
    h += `</div>`;
    const act = f.weakest && ACT[f.weakest.id] ? `<div class="card action"><b>Cadangan fokus</b><p>${ACT[f.weakest.id]}</p></div>` : '';
    // Mobile: sorotan di atas (seperti asal). Desktop: dua lajur.
    return `<div class="fl-grid"><div class="fl-side">${ib ? `<h2 class="fl-h">Sorotan bulan ini</h2>${ib}` : ''}${act}</div><div class="fl-main">${h}</div></div>`;
  }

  // Skor outlet (dikongsi tab Outlet & Overview — logik sama seperti asal)
  const OUTLET_ROWS = [
    ['RAW Video Phone', 'rawPhone'], ['RAW Video Repair', 'rawRepair'],
    ['Gambar Customer', 'customer'], ['Before / After', 'beforeAfter'],
    ['Klik WhatsApp', 'wa'], ['Klik Lokasi', 'location'],
    ['Leads', 'leads'], ['Walk-in', 'walkin'], ['Conversion', 'conversion'],
  ];
  function outletScores(key) {
    const [y, m] = parseKey(key);
    const o = KD.outletStats(state.ds, y, m), po = KD.outletStats(state.ds, ...KD.prevYM(y, m));
    const live = isCurrent(key);
    const pace = live ? Math.max(o.days.leads, 1) / daysIn(y, m) : 1;
    const plan = KD.leadPlan(y, m), prog = KD.leadProgress(state.ds, y, m);
    const cards = CFG.outlets.map(x => {
      let hit = 0, total = 0, miss = [], list = '';
      const vals = {};
      for (const [label, k] of OUTLET_ROWS) {
        const isLW = k === 'leads' || k === 'walkin';
        const tg = k === 'conversion' ? T.conversion : isLW ? (plan ? plan.outlets[x][k === 'leads' ? 'lead' : 'walkin'].total : null) : T.outlet[x][k];
        const a = o.outlets[x][k];
        if (tg == null) continue;
        if (a == null) { vals[k] = { a: null, tg, st: { level: 'na' } }; list += `<li><span class="st na">–</span><span class="k">${label}</span><span class="v">tiada data</span></li>`; continue; }
        total++;
        const p = po.outlets[x][k];
        const kPace = k === 'conversion' ? 1 : isLW ? (live ? prog.outlets[x].pace : 1) : pace;
        const st = KD.status(a, tg, kPace, false, p != null ? a > p : null);
        vals[k] = { a, tg, st };
        if (st.level === 'good') hit++;
        if (st.level === 'bad') miss.push(label);
        const val = k === 'conversion' ? fmtPct(a, 0) : fmt(a);
        const tv = k === 'conversion' ? tg + '%' : fmt(tg);
        list += `<li><span class="st ${st.level}" aria-label="${statusWord(st, live)}">${iconOf(st)}</span><span class="k">${label}</span><span class="v"><b>${val}</b> / ${tv}</span></li>`;
      }
      const ratio = total ? hit / total : 0;
      // warna skor: tiada KPI merah = hijau/kuning; ada merah = kuning (≤1) atau merah
      const lvl = !miss.length ? (ratio >= 0.75 ? 'good' : 'warn') : miss.length <= 1 ? 'warn' : 'bad';
      return { x, hit, total, ratio, lvl, miss, list, vals };
    }).sort((a, b) => b.ratio - a.ratio);
    return { o, live, cards };
  }

  async function viewOutlet(key) {
    const { o, live, cards } = outletScores(key);
    const { c } = await monthContent(key);
    const [y, m] = parseKey(key);
    const lc = KD.leadCategories(state.ds, y, m);
    const fullN = n => n == null ? '—' : Math.round(n).toLocaleString('en-MY');
    const OI = {
      KUL: 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6', AOR: 'M4 21V10l8-6 8 6v11M9 21v-5h6v5M4 10h16',
      SP: 'M4 9l1.5-5h13L20 9M4 9h16v2a2.7 2.7 0 0 1-5.3 0 2.7 2.7 0 0 1-5.4 0A2.7 2.7 0 0 1 4 11zM5 13v8h14v-8', PDG: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    };
    const ring = (ratio, lvl, size = 64) => {
      const r = size / 2 - 5, C = 2 * Math.PI * r, off = C * (1 - Math.max(0, Math.min(1, ratio)));
      return `<svg class="oring ${lvl}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="tr"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="fg" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
    };
    const STW = { good: live ? 'On track' : 'Capai', warn: '80–99% / naik', bad: 'Belum capai', na: 'Tiada data' };

    // ---- 1. Ranking strip ----
    let h = `<div class="op-head"><div><span class="cf-eyebrow">Ranking outlet · ${monLabel(key)}</span><h2 class="op-h">Skor outlet</h2><p class="op-sub">KPI capai daripada jumlah KPI${live ? ` · dinilai ikut kadar ${o.days.leads} hari data` : ''}</p></div>
      <div class="op-legend"><span><i class="good"></i>${live ? 'On track' : 'Capai'}</span><span><i class="warn"></i>80–99% / naik</span><span><i class="bad"></i>Belum</span></div></div>`;
    h += `<div class="op-strip">${cards.map((cd, i) => `
      <a class="op-tile${i === 0 ? ' op-lead' : ''}" href="#o-${cd.x}">
        <span class="op-rank">#${i + 1}</span>
        <div class="op-ringw">${ring(cd.ratio, i === 0 ? 'inv' : cd.lvl)}<span class="op-sc"><b>${cd.hit}</b>/${cd.total}</span></div>
        <div class="op-tn"><b>${esc(CFG.outletNames[cd.x])}</b><span>${cd.miss.length ? `${cd.miss.length} KPI merah` : 'Tiada KPI merah'}</span></div>
      </a>`).join('')}</div>`;

    // ---- 2. Kad outlet ----
    const GROUPS = [
      ['Content supply', ['rawPhone', 'rawRepair', 'customer', 'beforeAfter']],
      ['Digital', ['wa', 'location']],
      ['Kedai', ['leads', 'walkin', 'conversion']],
    ];
    const LBL = Object.fromEntries(OUTLET_ROWS.map(([l, k]) => [k, l]));
    const catChips = (x, kind) => {
      const v = lc.available && lc.outlets[x] ? lc.outlets[x][kind] : null;
      if (!v || ['phone', 'repair', 'cc', 'others'].every(k => v[k] == null)) return '';
      const tg = lc.plan ? lc.plan.outlets[x][kind] : { phone: null, repair: null, cc: null };
      return `<div class="op-cats">${[['phone', 'Phone'], ['repair', 'Repair'], ['cc', 'CC'], ['others', 'Others']].filter(([k]) => tg[k] || v[k]).map(([k, n]) =>
        `<span><em>${n}</em><b>${fullN(v[k])}</b>${tg[k] ? `<small>/${fmt(tg[k])}</small>` : '<small>tiada target</small>'}</span>`).join('')}</div>`;
    };
    const kRow = (x, k, vals) => {
      const v = vals[k]; if (!v) return '';
      const isC = k === 'conversion';
      const pct = v.a == null ? 0 : Math.max(0, Math.min(100, 100 * v.a / v.tg));
      const val = v.a == null ? '—' : isC ? fmtPct(v.a, 0) : fullN(v.a);
      const tv = isC ? v.tg + '%' : fmt(v.tg);
      const lvl = v.st.level;
      return `<li class="op-k ${lvl}"><div class="op-kt"><span class="op-dot ${lvl}" title="${STW[lvl]}">${lvl === 'na' ? '–' : iconOf(v.st)}</span><span class="op-kl">${esc(LBL[k])}</span>
          <span class="op-kv">${v.a == null ? '<i>tiada data</i>' : `<b>${val}</b><small>/ ${tv}</small>`}</span></div>
        <div class="op-bar"><i class="${lvl}" style="width:${pct.toFixed(1)}%"></i></div>
        ${k === 'leads' ? catChips(x, 'lead') : k === 'walkin' ? catChips(x, 'walkin') : ''}</li>`;
    };
    const wide = innerWidth >= 1024;
    h += `<div class="op-grid">` + cards.map((cd, i) => `<details class="op-card" id="o-${cd.x}" ${wide || i === cards.length - 1 ? 'open' : ''}>
      <summary class="op-ch">
        <span class="op-ci" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${OI[cd.x] || OI.SP}"/></svg></span>
        <span class="op-cn"><b>${esc(CFG.outletNames[cd.x])}</b><span>${cd.miss.length ? `Merah: ${esc(cd.miss.join(', '))}` : 'Semua KPI tiada merah'}</span></span>
        <span class="op-cs"><b>${cd.hit}<small>/${cd.total}</small></b><span>capai</span></span>
        <span class="op-chev" aria-hidden="true"></span>
      </summary>
      <div class="op-body">${GROUPS.map(([g, ks]) => {
        const rows = ks.map(k => kRow(cd.x, k, cd.vals)).join('');
        return rows ? `<div class="op-g"><span class="op-gh">${g}</span><ul>${rows}</ul></div>` : '';
      }).join('')}</div></details>`).join('') + `</div>`;

    // ---- 3. Content ikut outlet ----
    if (c) {
      const order = ['KUL', 'AOR', 'SP', 'PDG', 'HQ', 'REPOST'];
      const rank = x => order.indexOf(x) < 0 ? 99 : order.indexOf(x);
      const keys = Object.keys(c.outlets).sort((a, b) => rank(a) - rank(b));
      const maxV = Math.max(...keys.map(x => c.outlets[x].views || 0), 1);
      h += `<div class="op-head sm"><div><span class="cf-eyebrow">Tab per-post</span><h2 class="op-h">Content ikut outlet</h2></div></div>
        <div class="card op-content"><div class="op-crow op-chd"><span>Outlet</span><span>Views</span><span>Post</span><span>Purata</span><span>Gold+</span></div>`;
      for (const x of keys) {
        const v = c.outlets[x], gold = (v.tiers.Gold || 0) + (v.tiers.Diamond || 0);
        h += `<div class="op-crow"><span class="op-on">${esc(CFG.outletNames[x] || x)}</span>
          <span class="op-vw"><b>${fmt(v.views)}</b><span class="op-vb"><i style="width:${(100 * (v.views || 0) / maxV).toFixed(1)}%"></i></span></span>
          <span>${v.posts}</span><span>${fmt(v.views / v.posts)}</span><span class="op-gold">${gold ? `<em>${gold}</em>` : '0'}${v.tiers.Diamond ? ' 💎' : ''}</span></div>`;
      }
      h += `</div>`;
    }
    h += `<div class="chart-cap">Ketik nama outlet untuk buka/tutup butiran. Conversion = Walk-in ÷ Leads. Pecahan Phone/Repair/CC dari MASTER SHEET (mirror). Klik WhatsApp/Lokasi dari LINKTREE (${CFG.linktree.year}).</div>`;
    return h;
  }

  // ---------- Trend (premium) ----------
  let tcId = 0;
  const tl = v => Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : Math.abs(v) >= 1e4 ? Math.round(v / 1e3) + 'K' : Math.round(v).toLocaleString('en-MY');
  // Bar chart premium: satu atau beberapa siri (stacked). Bulan dipilih = solid + label nilai; bulan separa = pudar.
  function tChart(rows, series, opts = {}) {
    const id = 'tc' + (++tcId);
    const W = opts.w || Math.min(chartW(), 1100), H = opts.h || (W > 500 ? 230 : 180), pl = 40, pr = 8, pt = 26, pb = 24;
    const tot = rows.map(r => series.reduce((a, sr) => a + (r[sr.k] || 0), 0));
    const hasAny = rows.map(r => series.some(sr => r[sr.k] != null));
    let max = Math.max(...tot, opts.target || 0, 0) * 1.08, min = Math.min(...tot, 0) * 1.08;
    if (max === min) max = min + 1;
    const y = v => pt + (H - pt - pb) * (max - v) / (max - min);
    const bw = (W - pl - pr) / rows.length, gap = Math.max(4, bw * 0.32), w = Math.max(3, bw - gap);
    let s = `<svg class="tchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || '')}"><defs>`;
    series.forEach((sr, i) => { s += `<linearGradient id="${id}g${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sr.c1}"/><stop offset="1" stop-color="${sr.c2}"/></linearGradient>`; });
    s += `<linearGradient id="${id}n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7A26B"/><stop offset="1" stop-color="#E5602A"/></linearGradient></defs>`;
    [max, (max + min) / 2, min].forEach(t => { s += `<line class="tg" x1="${pl}" x2="${W - pr}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/><text class="ty" x="${pl - 6}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end">${tl(t)}</text>`; });
    if (min < 0) s += `<line class="tz" x1="${pl}" x2="${W - pr}" y1="${y(0)}" y2="${y(0)}"/>`;
    rows.forEach((r, i) => {
      const x = pl + i * bw + gap / 2, cx = x + w / 2;
      const cls = (r._hl ? ' hl' : '') + (r._dim ? ' dim' : '') + (opts.hl && !r._hl ? ' mute' : '');
      s += `<text class="tx${r._hl ? ' on' : ''}" x="${cx}" y="${H - 7}" text-anchor="middle">${esc(r._lab)}</text>`;
      if (hasAny[i]) {
        let acc = 0;
        series.forEach((sr, j) => {
          const v = r[sr.k]; if (v == null || v === 0) return;
          const neg = v < 0, y1 = y(neg ? 0 : acc + v), y2 = y(neg ? v : acc), h = Math.max(1.5, y2 - y1);
          const top = j === series.length - 1 || series.slice(j + 1).every(q => !r[q.k]);
          const rr = top || neg ? Math.min(5, w / 2, h) : 0;
          const fill = neg ? `url(#${id}n)` : `url(#${id}g${j})`;
          s += neg
            ? `<path class="tb${cls}" fill="${fill}" d="M${x},${y1}V${y1 + h - rr}q0,${rr} ${rr},${rr}h${w - 2 * rr}q${rr},0 ${rr},-${rr}V${y1}z"/>`
            : `<path class="tb${cls}" fill="${fill}" d="M${x},${y1 + h}V${y1 + rr}q0,-${rr} ${rr},-${rr}h${w - 2 * rr}q${rr},0 ${rr},${rr}V${y1 + h}z"/>`;
          if (!neg) acc += v;
        });
        if (r._hl) {
          const tv = tot[i], ly = tv < 0 ? y(tv) + 15 : y(tv) - 8;
          s += `<text class="tv" x="${cx}" y="${ly}" text-anchor="middle">${tl(tv)}</text>`;
        }
      }
      const tip = !hasAny[i] ? `${r._full}: tiada data` : `${r._full}: ${series.length > 1 ? series.map(sr => `${sr.n} ${fmt(r[sr.k])}`).join(' · ') + ' · Total ' + fmt(tot[i]) : fmt(tot[i])}${r._dim ? ' (data separa)' : ''}`;
      s += `<rect class="hit" x="${pl + i * bw}" y="${pt - 10}" width="${bw}" height="${H - pt - pb + 10}" data-tip="${esc(tip)}"/>`;
    });
    if (opts.target) {
      const ty = y(opts.target);
      s += `<line class="tt" x1="${pl}" x2="${W - pr}" y1="${ty}" y2="${ty}"/>`;
      const lt = 'Target ' + tl(opts.target), lw = lt.length * 6.3 + 14;
      s += `<g class="ttl"><rect x="${pl + 4}" y="${ty - 21}" width="${lw}" height="18" rx="9"/><text x="${pl + 4 + lw / 2}" y="${ty - 8.5}" text-anchor="middle">${lt}</text></g>`;
    }
    return s + '</svg>';
  }
  function spark(vals, inv) {
    const v = vals.map(x => x == null ? null : x), nn = v.filter(x => x != null);
    if (nn.length < 2) return '';
    const W = 120, H = 36, max = Math.max(...nn), min = Math.min(...nn, 0), rg = max - min || 1;
    const pts = v.map((x, i) => x == null ? null : [(i / (v.length - 1)) * W, H - 3 - (H - 6) * (x - min) / rg]).filter(Boolean);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
    const last = pts[pts.length - 1];
    return `<svg class="tspark${inv ? ' inv' : ''}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="ar" d="${d}L${last[0]},${H}L${pts[0][0]},${H}Z"/><path class="ln" d="${d}"/><circle cx="${last[0]}" cy="${last[1]}" r="3"/></svg>`;
  }

  function viewTrend(key) {
    const all = KD.monthlySeries(state.ds).filter(r => r.key <= key).slice(-12);
    if (!all.length) return `<div class="card empty">Belum ada data trend.</div>`;
    const sumO = (r, p) => { const v = CFG.outlets.map(x => r[p + x]).filter(z => z != null); return v.length ? v.reduce((a, b) => a + b, 0) : null; };
    const rows = all.map(r => {
      const [yy, mm] = parseKey(r.key), dim = daysIn(yy, mm);
      const ttd = r.tt_days || 0;
      const allV = r.tt_views == null && r.fb_views == null && r.ig_views == null && r.yt_views == null ? null : (r.tt_views || 0) + (r.fb_views || 0) + (r.ig_views || 0) + (r.yt_views || 0);
      return { ...r, _lab: MON[mm - 1], _full: monLabel(r.key), _hl: r.key === key, _dim: ttd > 0 && ttd < dim * 0.9, allV, lead_all: sumO(r, 'lead_'), walk_all: sumO(r, 'walk_') };
    });
    const cur = rows[rows.length - 1], prev = rows.length > 1 ? rows[rows.length - 2] : null;
    const tPlan = KD.leadPlan(...parseKey(key));
    const tgLead = tPlan ? tPlan.company.lead.total : null, tgWalk = tPlan ? tPlan.company.walkin.total : null;
    const half = Math.min(chartW(0.5, 900), 640), full = Math.min(chartW(), 1100);
    const mom = (a, b) => a == null || b == null || !b ? null : 100 * (a - b) / Math.abs(b);
    const pill = v => v == null ? '<span class="tp na">—</span>' : `<span class="tp ${v >= 0 ? 'up' : 'dn'}">${v >= 0 ? '▲' : '▼'} ${Math.abs(v) >= 999 ? '>999' : Math.abs(v).toFixed(0)}%</span>`;
    const tile = (lab, sub, k, opt = {}) => {
      const v = cur[k], d = opt.abs ? null : mom(v, prev && prev[k]);
      const dAbs = opt.abs && v != null && prev && prev[k] != null ? v - prev[k] : null;
      return `<div class="tk${opt.top ? ' tk-lead' : ''}"><div class="tk-h"><span>${lab}</span>${opt.abs ? (dAbs == null ? '' : `<span class="tp ${dAbs >= 0 ? 'up' : 'dn'}">${dAbs >= 0 ? '+' : '−'}${fmt(Math.abs(dAbs))}</span>`) : pill(d)}</div>
        <b>${v == null ? '—' : fmt(v)}</b><small>${sub}</small>${spark(rows.map(r => r[k]), opt.top)}</div>`;
    };
    const best = (k) => rows.filter(r => r[k] != null).reduce((a, b) => (b[k] > (a ? a[k] : -Infinity) ? b : a), null);
    const avg = k => { const v = rows.map(r => r[k]).filter(x => x != null && !rows.find(q => q[k] === x)._dim); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const card = (eb, title, meta, body, cap = '') => `<div class="card tcard"><div class="tc-h"><div><span class="cf-eyebrow">${eb}</span><h3>${title}</h3></div>${meta ? `<div class="tc-m">${meta}</div>` : ''}</div>${body}${cap ? `<div class="chart-cap">${cap}</div>` : ''}</div>`;
    const meta = k => { const b = best(k), a = avg(k); return `${b ? `<span>Terbaik <b>${b._lab}</b> · ${fmt(b[k])}</span>` : ''}${a != null ? `<span>Purata <b>${fmt(a)}</b></span>` : ''}`; };
    const legend = list => `<div class="tlg">${list.map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('')}</div>`;
    const BL = { c1: '#6E9BFF', c2: '#2F63EE' }, NV = { c1: '#2C4FC4', c2: '#132E85' };

    let h = `<div class="op-head"><div><span class="cf-eyebrow">12 bulan terakhir · sehingga ${monLabel(key)}</span><h2 class="op-h">Trend bulanan</h2><p class="op-sub">Perbandingan ${monLabel(key)} dengan ${prev ? prev._full : 'bulan lepas'}. Bulan pudar = data harian tak lengkap.</p></div></div>`;
    h += `<div class="tk-strip">${tile('View content', 'TikTok + IG + FB + YT', 'allV', { top: true })}${tile('TikTok views', 'Target ' + tl(T.tiktokViews), 'tt_views')}${tile('Lead', tgLead == null ? '4 outlet · target belum ditetapkan' : '4 outlet · target ' + fmt(tgLead), 'lead_all')}${tile('Walk-in', tgWalk == null ? '4 outlet · target belum ditetapkan' : '4 outlet · target ' + fmt(tgWalk), 'walk_all')}</div>`;

    h += card('Semua platform', 'View content ikut platform', meta('allV'),
      legend([['TikTok', '#2F63EE'], ['Instagram', '#7B5CF5'], ['Facebook', '#1FB6C9'], ['YouTube', '#E0262B']]) +
      tChart(rows, [{ k: 'tt_views', n: 'TikTok', ...BL }, { k: 'ig_views', n: 'IG', c1: '#9C84FF', c2: '#6A47EE' }, { k: 'fb_views', n: 'FB', c1: '#4FD3E0', c2: '#15A2B8' }, { k: 'yt_views', n: 'YT', c1: '#FF6B6B', c2: '#E0262B' }], { w: full, hl: true, aria: 'View content bulanan ikut platform' }));
    h += `<div class="pair tpair">`;
    h += card('TikTok', 'Views TikTok', meta('tt_views'), tChart(rows, [{ k: 'tt_views', n: 'Views', ...BL }], { w: half, hl: true, target: T.tiktokViews, aria: 'Views TikTok bulanan' }));
    h += card('TikTok', 'Net followers', meta('tt_netGrowth'), tChart(rows, [{ k: 'tt_netGrowth', n: 'Net', ...BL }], { w: half, hl: true, aria: 'Net followers bulanan' }), `Oren = followers berkurang. Had bawah ${fmt(T.netFollowersFloor)}.`);
    h += card('Kedai', 'Lead (4 outlet)', meta('lead_all'), tChart(rows, [{ k: 'lead_all', n: 'Lead', ...NV }], { w: half, hl: true, target: tgLead, aria: 'Lead bulanan' }));
    h += card('Kedai', 'Walk-in (4 outlet)', meta('walk_all'), tChart(rows, [{ k: 'walk_all', n: 'Walk-in', ...NV }], { w: half, hl: true, target: tgWalk, aria: 'Walk-in bulanan' }));
    h += `</div>`;

    // Jadual
    const cell = (r, k, i) => {
      const v = r[k], p = i > 0 ? rows[i - 1][k] : null, d = mom(v, p);
      return `<td><b>${fmt(v)}</b>${d == null || k === 'tt_netGrowth' ? '' : `<span class="tdl ${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '▲' : '▼'}${Math.abs(d) >= 999 ? '>999' : Math.abs(d).toFixed(0)}%</span>`}</td>`;
    };
    h += `<div class="op-head sm"><div><span class="cf-eyebrow">Butiran</span><h2 class="op-h">Jadual bulanan</h2></div></div><div class="card ttable"><div class="tbl-wrap"><table><thead><tr><th>Bulan</th><th>View content</th><th>TikTok</th><th>Net fol.</th><th>FB</th><th>IG</th><th>YT</th><th>Lead</th><th>Walk-in</th></tr></thead><tbody>`;
    rows.map((r, i) => [r, i]).reverse().forEach(([r, i]) => {
      h += `<tr class="${r._hl ? 'on' : ''}"><td class="tm">${r._full}${r._dim ? '<small>separa</small>' : ''}</td>${cell(r, 'allV', i)}${cell(r, 'tt_views', i)}${cell(r, 'tt_netGrowth', i)}${cell(r, 'fb_views', i)}${cell(r, 'ig_views', i)}${cell(r, 'yt_views', i)}${cell(r, 'lead_all', i)}${cell(r, 'walk_all', i)}</tr>`;
    });
    h += `</tbody></table></div></div><div class="chart-cap">▲▼ = beza vs bulan sebelumnya. Lead & Walk-in dari MASTER SHEET (mirror). Views FB/IG/YouTube dari tab Insight. YouTube bermula 24 Okt 2025.</div>`;
    return h;
  }

  // =========================================================
  // DATA BULAN (dikongsi Overview, Content, Analisis, Outlet)
  // =========================================================
  // Muat tab per-post bulan ini + bulan lepas (untuk perbandingan MoM content)
  async function monthContent(key) {
    const [y, m] = parseKey(key), [py, pm] = KD.prevYM(y, m);
    const [res, pres] = await Promise.all([KD.loadMonthPosts(state.ds, y, m), KD.loadMonthPosts(state.ds, py, pm)]);
    persist();
    const c = res.error ? null : KD.contentStats(res.posts);
    const pc = pres.error ? null : KD.contentStats(pres.posts);
    const live = isCurrent(key);
    const cPace = live ? new Date().getDate() / daysIn(y, m) : 1;
    return { res, c: c && c.total ? c : null, pc: pc && pc.total ? pc : null, cPace, live };
  }

  const IC = {
    posts: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M10 9v6l5-3z"/>',
    pov: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
    strat: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8"/>',
    views: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eng: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    fol: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5M17 8v6M14 11h6"/>',
    wa: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5"/>',
    lead: '<path d="M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/>',
    walk: '<path d="M4 9l1.5-5h13L20 9M4 9h16v2a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-6 0zm1 4v7h14v-7"/><path d="M10 20v-4h4v4"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
    repair: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.3-.6-.6-2.3z"/>',
    cc: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5"/>',
    others: '<circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/>',
  };
  const icon = k => `<span class="kc-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${IC[k]}</svg></span>`;
  const PLAT_AB = { tiktok: ['tt', 'T'], facebook: ['fb', 'f'], instagram: ['ig', 'IG'], youtube: ['yt', 'YT'] };
  const platIc = id => `<span class="pi ${PLAT_AB[id][0]}">${PLAT_AB[id][1]}</span>`;

  // Kad KPI bertarget (content output)
  function ovCard(k, opts = {}) {
    const st = k.status, live = k.partial;
    const pct = k.target && k.actual != null ? 100 * k.actual / k.target : null;
    return `<div class="kc${opts.hero ? ' hero-kc' : ''}">
      <div class="kc-h">${icon(opts.icon)}<span class="kc-l">${esc(opts.label || k.label)}${opts.sub ? `<small>${esc(opts.sub)}</small>` : ''}</span></div>
      <div class="kc-v">${k.actual == null ? '—' : fmtVal(k.actual, k.unit)}</div>
      <div class="kc-tg">Target <b>${fmtVal(k.target, k.unit)}</b></div>
      <div class="kc-ach"><span>Achievement</span><b>${pct == null ? '—' : Math.round(pct) + '%'}</b></div>
      ${k.actual == null ? '<div class="prog"><i style="width:0"></i></div>' : bar(k.actual, k.target, st, k.pace)}
      <div class="kc-f"><span class="chip ${st.level}">${iconOf(st)} ${statusWord(st, live)}</span>${opts.d || ''}</div>
      ${opts.note ? `<div class="kc-note">${esc(opts.note)}</div>` : ''}
    </div>`;
  }
  // Kad metrik berbilang baris (views / engagement / followers / WhatsApp)
  function mCard({ ic, label, sub, value, valueSub, d = '', rows, note }) {
    return `<div class="card mcard">
      <div class="kc-h">${icon(ic)}<span class="kc-l">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span></div>
      <div class="mc-v"><span class="kc-v">${value}</span>${valueSub ? `<span class="mc-vs">${valueSub}</span>` : ''}${d}</div>
      <ul class="mrows">${rows.join('')}</ul>
      ${note ? `<div class="chart-cap">${note}</div>` : ''}
    </div>`;
  }
  // satu baris: label kiri, nilai kanan, maklumat tambahan (target / delta) di bawah nilai
  const mRow = (lead, label, val, extra = '', cls = '') => `<li class="${cls}">${lead || ''}<span class="mr-l">${label}</span><span class="mr-v">${val}${extra ? `<small>${extra}</small>` : ''}</span></li>`;
  const pctOf = (a, t) => a == null || !t ? '' : `${Math.round(100 * a / t)}% daripada ${fmt(t)}`;
  const chipK = k => `<span class="chip ${k.status.level}">${iconOf(k.status)} ${statusWord(k.status, k.partial)}</span>`;

  // =========================================================
  // LEAD & WALK-IN COMPANY: jumlah + pecahan Phone / Repair / Cash Converter
  // =========================================================
  const CAT_NAME = { phone: 'Phone', repair: 'Repair', cc: 'Cash Converter', others: 'Others' };
  const CAT_KEYS = ['phone', 'repair', 'cc', 'others'];
  const OTHERS_NOTE = 'Tiada target. Rekod mula 23 Okt 2026, tak masuk jumlah ikut target.';
  function leadSection(key, prevLbl) {
    const [y, m] = parseKey(key);
    const LC = KD.leadCategories(state.ds, y, m);
    const K = KD.kpis(state.ds, y, m);
    const momD = v => delta(v, 'vs ' + prevLbl);
    let h = `<h2 class="sec">Lead & Walk-in company <span class="note">· 4 outlet digabung${LC.noTarget ? ', target belum ditetapkan' : ', target ikut brief Okt–Dis 2026'}</span></h2>`;
    // Kad jumlah: guna pecahan mirror jika ada, jika tidak jumlah dari tab Leads / Walk-in
    const tot = kind => LC.available ? LC[kind].total : { ...K[kind === 'lead' ? 'leads' : 'walkin'], daily: KD.leadDaily(y, m, kind), calDaily: null, need: null };
    const L = tot('lead'), W = tot('walkin');
    const pctOf2 = k => k.target && k.actual != null ? Math.round(100 * k.actual / k.target) : null;
    const lvl = k => k.status.level;
    // Kad jumlah (compact): nilai / target + % sebaris, bar, satu baris status
    const totCard = (k, label, ic, hero) => {
      const p = pctOf2(k);
      return `<div class="kc tot-kc${hero ? ' hero-kc' : ''}">
        <div class="tk-top">${icon(ic)}<span class="kc-l">${label}</span><span class="chip ${lvl(k)}">${iconOf(k.status)} ${statusWord(k.status, k.partial)}</span></div>
        <div class="tk-mid"><span class="tk-v">${fmt(k.actual)}</span><span class="tk-t">/ ${fmt(k.target)}</span><span class="tk-p">${p == null ? '—' : p + '%'}</span></div>
        ${k.actual == null ? '<div class="prog"><i style="width:0"></i></div>' : bar(k.actual, k.target, k.status, k.pace)}
        <div class="tk-f">${momD(k.mom) || '<span></span>'}<span>${k.target == null ? 'Target belum ditetapkan' : `Harian ${fmt(Math.round(k.daily))}${k.need != null ? ` · perlu <b>${fmt(Math.ceil(k.need))}</b>/hari` : ''}`}</span></div>
      </div>`;
    };
    h += `<div class="kc-grid g2">${totCard(L, 'Lead ikut target', 'lead', true)}${totCard(W, 'Walk-in ikut target', 'walk', false)}</div>`;
    if (!LC.available) {
      return h + `<div class="card empty">Pecahan Phone / Repair / Cash Converter belum disambung. Perlu sheet mirror lead/walk-in dari MASTER SHEET SALES OUTLET (tetapkan <b>sheets.leadDetail</b> dalam js/config.js).</div>`;
    }
    // Baris kategori (compact): label, nilai / target, %, bar nipis, delta
    const row = (label, k) => {
      const p = pctOf2(k);
      return `<div class="cr">
        <div class="cr-top"><span class="cr-l">${label}</span><span class="cr-v"><b>${fmt(k.actual)}</b> / ${fmt(k.target)}</span><span class="cr-p ${lvl(k)}">${p == null ? '—' : p + '%'}</span></div>
        ${k.actual == null ? '<div class="prog"><i style="width:0"></i></div>' : bar(k.actual, k.target, k.status, k.pace)}
        <div class="cr-d"><span class="cr-s ${lvl(k)}">${iconOf(k.status)} ${statusWord(k.status, k.partial)}</span>${momD(k.mom)}</div>
      </div>`;
    };
    const pdgRep = LC.outlets.PDG && LC.outlets.PDG.lead.repair;
    h += `<div class="kc-grid g2 cat-grid">${CAT_KEYS.map(c => `<div class="kc cat-kc">
      <div class="kc-h">${icon(c)}<span class="kc-l">${CAT_NAME[c]}<small>${c === 'others' ? 'Tiada target' : LC.noTarget ? 'Target belum ditetapkan' : `Harian: lead ${fmt(Math.round(LC.lead[c].daily))} · walk-in ${fmt(Math.round(LC.walkin[c].daily))}`}</small></span></div>
      ${row('Lead', LC.lead[c])}${row('Walk-in', LC.walkin[c])}
      ${c === 'repair' && pdgRep ? `<div class="kc-note">Termasuk ${fmt(pdgRep)} lead repair Pendang (tiada servis).</div>` : ''}
      ${c === 'cc' ? '<div class="kc-note">CC = Trade-in + Buyback.</div>' : ''}
      ${c === 'others' ? `<div class="kc-note">${OTHERS_NOTE}</div>` : ''}
    </div>`).join('')}</div>`;
    h += `<div class="chart-cap">Sumber: MASTER SHEET SALES OUTLET (diisi staf outlet), data sehingga ${LC.lastDay || 0}/${m}. Kulim & Kelang Lama dikira satu kedai. Jumlah ikut target = Phone + Repair + CC; Others (mula 23 Okt 2026) dipapar berasingan tanpa target. Bukan dari blok OVERALL dalam sheet. ${LC.noTarget ? '' : `Harian & perlu sehari = hari biasa semua outlet buka; status ikut hari operasi (AOR, SP, PDG tutup Rabu). Purata kalendar ikut brief: lead ${fmt(Math.round(LC.lead.total.calDaily))}, walk-in ${fmt(Math.round(LC.walkin.total.calDaily))} sehari.`}</div>`;
    return h;
  }

  // =========================================================
  // OVERVIEW — eksekutif, peringkat syarikat (semua outlet & platform digabung)
  // =========================================================
  async function viewOverview(key) {
    const [y, m] = parseKey(key);
    const { res, c, pc, cPace, live } = await monthContent(key);
    const dim = daysIn(y, m), today = new Date().getDate();
    const [py, pm] = KD.prevYM(y, m), prevLbl = monShort(py, pm);
    const sc = KD.scorecard(state.ds, y, m, c, pc, cPace);
    const S = id => sc.list.find(k => k.id === id);
    const K = KD.kpis(state.ds, y, m);
    const cc = KD.companyCompare(state.ds, y, m), co = cc.cur;
    const P = id => co.plats.find(p => p.id === id);
    const LC = KD.leadCategories(state.ds, y, m);
    const mc = KD.monthCore(state.ds, y, m);
    const fullN = n => n == null ? '—' : Math.round(n).toLocaleString('en-MY');
    const pctN = (a, t) => a == null || !t ? null : Math.round(100 * a / t);
    const L = LC.available ? LC.lead.total : { ...K.leads, daily: KD.leadDaily(y, m, 'lead') };
    const Wk = LC.available ? LC.walkin.total : { ...K.walkin, daily: KD.leadDaily(y, m, 'walkin') };
    const n = sc.list.length, nH = sc.hit.length, nM = sc.miss.length, nN = sc.na.length;

    // ---- 1. Hero (compact: 2 gauge + 2 tile mini + baris kadar harian) ----
    const heroG = (lab, k) => {
      const p = pctN(k.actual, k.target);
      return `<div class="oc-g ov-g"><div class="op-ringw oc-ring">${ringS(k.target ? (k.actual || 0) / k.target : 0, 'inv', 76)}<span class="ct-pc">${p == null ? '—' : p + '%'}</span></div>
        <span class="oc-gl">${lab}</span><b>${fullN(k.actual)}</b><small>${k.target == null ? 'tiada target' : `/ ${fullN(k.target)}`}</small></div>`;
    };
    const heroF = (lab, k) => {
      const lv = k.status ? k.status.level : 'na';
      return `<li><span class="op-dot ${lv}">${lv === 'na' ? '–' : iconOf(k.status)}</span><span class="oc-fl">${lab}</span><span class="oc-fd">${k.target == null ? 'tiada target' : `harian ${fmt(Math.round(k.daily))}${k.need != null ? ` · perlu <b>${fmt(Math.ceil(k.need))}</b>` : ''}`}</span>${momPill(k.mom) || '<span class="tp na">—</span>'}</li>`;
    };
    // Strip nipis: semua lead/walk-in termasuk Others, tanpa target (rujukan volume marketing).
    // Cincin di bawah kekal Phone + Repair + CC sahaja sebab itu yang dinilai.
    const allStrip = !LC.available ? '' : `<div class="ov-all">
        <div class="ov-all-i"><span>Total lead</span><b>${fullN(LC.lead.all.actual)}</b></div>
        <div class="ov-all-i"><span>Total walk-in</span><b>${fullN(LC.walkin.all.actual)}</b></div></div>`;
    let h = `<section class="ov-hero">
      <div class="ov-hero-top"><div><span class="ov-eb">Company marketing · ${monLabel(key)}</span><h2>Prestasi bulan ini</h2></div>
        <span class="ov-badge"><span class="live-dot"></span>${live ? `Hari ${today}/${dim}` : 'Bulan lengkap'}</span></div>
      ${allStrip}
      <div class="ov-hg">
        ${heroG('Lead ikut target', L)}
        ${heroG('Walk-in ikut target', Wk)}
        <div class="ov-mt"><span class="oc-gl">View content</span><b>${fmt(co.views)}</b><small>TikTok + IG + FB + YT</small><div class="ov-mf">${momPill(cc.ch('views')) || ''}<em>TT ${fmt(P('tiktok').views)}/${fmt(T.tiktokViews)}</em></div></div>
        <div class="ov-mt"><span class="oc-gl">Status KPI</span><b>${nH}<small class="ov-of">/${n}</small></b><small>${live ? 'on track' : 'capai target'}</small>
          <div class="ov-seg">${nH ? `<i class="good" style="flex:${nH}"></i>` : ''}${nM ? `<i class="bad" style="flex:${nM}"></i>` : ''}${nN ? `<i class="na" style="flex:${nN}"></i>` : ''}</div>
          <div class="ov-segl"><span><i class="good"></i>${nH}</span><span><i class="bad"></i>${nM}</span>${nN ? `<span><i class="na"></i>${nN}</span>` : ''}</div></div>
      </div>
      <ul class="oc-foot ov-foot">${heroF('Lead', L)}${heroF('Walk-in', Wk)}</ul>
      <p class="ov-hn">Semua outlet & platform digabung. Lead & walk-in ikut target = Phone + Repair + CC${live ? ', status ikut kadar hari' : ''}</p>
    </section>`;

    // ---- 2. Lead & walk-in ikut kategori ----
    h += secHead('Fokus utama · 4 outlet digabung', 'Lead & walk-in ikut kategori', LC.noTarget ? `Target ${monLabel(key)} belum ditetapkan. Sumber: MASTER SHEET (mirror).` : `Target ikut brief Okt–Dis 2026, status ikut hari operasi outlet (Rabu tutup kecuali Kulim/Kelang Lama). Sumber: MASTER SHEET (mirror), data sehingga ${LC.lastDay || 0}/${m}.`);
    if (!LC.available) h += `<div class="card empty">Pecahan Phone / Repair / Cash Converter belum disambung.</div>`;
    else {
      const CI = { phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>', repair: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>', cc: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>', others: '<circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/>' };
      const CG = { phone: ['#1565FF', '#0A2E8A'], repair: ['#0EA5A4', '#0B4F6C'], cc: ['#7B5CF5', '#35188F'], others: ['#64748B', '#334155'] };
      const gauge = (lab, k, plain) => {
        // plain: nombor sahaja, tanpa cincin (untuk Others yang tiada target)
        if (plain) return `<div class="oc-g oc-g-plain"><span class="oc-gl">${lab}</span><b>${fullN(k.actual)}</b><small>tiada target</small></div>`;
        const p = pctN(k.actual, k.target);
        return `<div class="oc-g"><div class="op-ringw oc-ring">${ringS(k.target ? (k.actual || 0) / k.target : 0, 'inv', 76)}<span class="ct-pc">${p == null ? '—' : p + '%'}</span></div>
          <span class="oc-gl">${lab}</span><b>${fullN(k.actual)}</b><small>${k.target == null ? 'tiada target' : `/ ${fullN(k.target)}`}</small></div>`;
      };
      const foot = (lab, k) => `<li><span class="op-dot ${k.status.level}">${k.status.level === 'na' ? '–' : iconOf(k.status)}</span><span class="oc-fl">${lab}</span><span class="oc-fd">${k.target == null ? 'tiada target' : `harian ${fmt(Math.round(k.daily))}${k.need != null ? ` · perlu <b>${fmt(Math.ceil(k.need))}</b>` : ''}`}</span>${momPill(k.mom) || '<span class="tp na">—</span>'}</li>`;
      const pdgRep = LC.outlets.PDG && LC.outlets.PDG.lead.repair;
      h += `<div class="ov-cats">${CAT_KEYS.map(k2 => `<div class="oc-card">
        <div class="oc-top" style="--g1:${CG[k2][0]};--g2:${CG[k2][1]}"><div class="oc-h"><span class="oc-ic"><svg viewBox="0 0 24 24">${CI[k2]}</svg></span><b>${CAT_NAME[k2]}</b></div>
          <div class="oc-gs">${gauge('Lead', LC.lead[k2], k2 === 'others')}${gauge('Walk-in', LC.walkin[k2], k2 === 'others')}</div></div>
        <ul class="oc-foot">${foot('Lead', LC.lead[k2])}${foot('Walk-in', LC.walkin[k2])}</ul>
        ${k2 === 'repair' && pdgRep ? `<div class="oc-n">Termasuk ${fmt(pdgRep)} lead repair Pendang (tiada servis).</div>` : k2 === 'cc' ? '<div class="oc-n">CC = Trade-in + Buyback.</div>' : k2 === 'others' ? `<div class="oc-n">${OTHERS_NOTE}</div>` : ''}</div>`).join('')}</div>`;
    }

    // ---- 3. Content output ----
    h += secHead('Tab per-post · REPORT CONTENT DATA', 'Content output');
    if (!c) h += `<div class="card empty">${res.error ? `Tak dapat baca tab per-post: ${esc(res.error)}` : `Belum ada post direkod untuk ${monLabel(key)}.`}</div>`;
    else {
      const LB = { totalContent: ['Total post', `Purata ${fmt(c.avg)} view/post`], pov: ['POV Customer', 'Content dari sudut pelanggan'], strategic: ['Strategic', c.noType ? `${c.noType} post tiada TYPE` : 'Educational · Trend · Review · Promo'] };
      const top = c.top[0];
      h += `<div class="co-panel"><div class="co-items">${['totalContent', 'pov', 'strategic'].map(id => {
        const k = S(id);
        if (!k) return `<div class="co-i"><span class="co-l">${LB[id][0]}</span><b class="co-v">—</b><small>Lajur TYPE tiada</small></div>`;
        const p = pctN(k.actual, k.target);
        return `<div class="co-i"><div class="op-ringw co-ring">${ringS((k.actual || 0) / k.target, k.status.level, 92)}<span class="ct-pc">${p == null ? '—' : p + '%'}</span></div>
          <div class="co-t"><span class="co-l">${LB[id][0]} ${momPill(k.mom)}</span><b class="co-v">${fullN(k.actual)}<small>/ ${fullN(k.target)}</small></b><small>${LB[id][1]}</small></div></div>`;
      }).join('')}</div>
      ${top ? `<div class="co-best"><span class="co-bl">★ Post terbaik</span><b>${esc(top.kategori)}${top.sub ? ' · ' + esc(top.sub) : ''}</b><span>${[top.type, CFG.outletNames[top.outlet] || top.outlet, top.date ? `${top.date.d}/${top.date.m}` : ''].filter(Boolean).map(esc).join(' · ')}</span><em>${fullN(top.views)} views</em></div>` : ''}</div>`;
      if (res.warning) h += `<div class="warn-box">⚠ ${esc(res.warning)}</div>`;
    }

    // ---- 4. Audience & hasil ----
    const PCL = { tiktok: '#2F63EE', instagram: '#7B5CF5', facebook: '#1FB6C9', youtube: '#E0262B' };
    const months = [];
    { let yy = y, mm = m; for (let i = 0; i < 6; i++) { months.unshift([yy, mm]); [yy, mm] = KD.prevYM(yy, mm); } }
    const hist = months.map(([yy, mm]) => { const cp = KD.company(state.ds, yy, mm), mcx = KD.monthCore(state.ds, yy, mm); return { views: cp.views, engagement: cp.engagement, newFollowers: cp.newFollowers, wa: mcx.v.wa }; });
    const split = k => { const t = co.plats.reduce((a, p) => a + (p[k] || 0), 0); return t ? `<div class="ov-split">${co.plats.filter(p => p[k]).map(p => `<i style="flex:${p[k]};background:${PCL[p.id]}" data-tip="${esc(`${p.name}: ${fmt(p[k])} (${Math.round(100 * p[k] / t)}%)`)}"></i>`).join('')}</div>` : ''; };
    const prow = (id, val, note = '') => `<li><span class="ov-pd" style="background:${PCL[id]}"></span><span class="ov-pn">${P(id).name}</span><span class="ov-pv">${val}</span>${note ? `<small>${note}</small>` : ''}</li>`;
    const AIC = {
      views: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
      eng: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
      fol: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M18 8v6M15 11h6"/>',
      wa: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1z"/><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1-1 1.8.8"/>',
    };
    const AG = { views: ['#5B8CFF', '#1A3DAA'], eng: ['#F472B6', '#9D3BE0'], fol: ['#2DD4BF', '#0E7490'], wa: ['#34D399', '#047857'] };
    const aCard = (ic, title, val, mom, body, foot, hk) => `<div class="card ov-a" style="--a1:${AG[ic][0]};--a2:${AG[ic][1]}"><div class="ov-ah"><span class="ov-aic"><svg viewBox="0 0 24 24">${AIC[ic]}</svg></span><span class="ov-at">${title}</span>${mom}</div>
      <b class="ov-av">${val}</b>${body}${foot ? `<div class="ov-af">${foot}</div>` : ''}<div class="ov-sp">${spark(hist.map(r => r[hk]))}<span>${MON[months[0][1] - 1]} – ${MON[m - 1]}</span></div></div>`;
    const tt = P('tiktok');
    const waAll = [mc.v.wa, mc.v.waOnline, mc.v.waBuyback].some(v => v != null) ? (mc.v.wa || 0) + (mc.v.waOnline || 0) + (mc.v.waBuyback || 0) : null;
    const yt = P('youtube');
    h += secHead('Insight akaun · TikTok, Instagram, Facebook, YouTube', 'Audience & hasil', `▲▼ vs ${prevLbl}, dinormalkan ikut hari data · garis = 6 bulan terakhir`);
    h += `<div class="ov-aud">`;
    h += aCard('views', 'Total views', fmt(co.views), momPill(cc.ch('views')), split('views') + `<ul class="ov-pl">${co.plats.map(p => prow(p.id, fmt(p.views), p.id === 'tiktok' && p.views != null ? `${pctN(p.views, T.tiktokViews)}% target 4M` : '')).join('')}</ul>`, '', 'views');
    h += aCard('eng', 'Total engagement', fmt(co.engagement), momPill(cc.ch('engagement')), split('engagement') + `<ul class="ov-pl">${co.plats.map(p => prow(p.id, fmt(p.engagement), p.id === 'tiktok' && tt.engagement != null ? `${pctN(tt.engagement, T.likes + T.comments + T.shares)}% target` : '')).join('')}</ul>`, '', 'engagement');
    h += aCard('fol', 'Follower baru', fmt(co.newFollowers), momPill(cc.ch('newFollowers')), split('newFollowers') + `<ul class="ov-pl">${co.plats.map(p => prow(p.id, fmt(p.newFollowers))).join('')}</ul>`,
      `TikTok net <b class="${(tt.netFollowers || 0) < T.netFollowersFloor ? 'neg' : ''}">${tt.netFollowers == null ? '—' : (tt.netFollowers > 0 ? '+' : '') + fmt(tt.netFollowers)}</b> · had ${fmt(T.netFollowersFloor)}${yt && yt.netFollowers != null ? ` · YT net <b class="${yt.netFollowers < 0 ? 'neg' : ''}">${(yt.netFollowers > 0 ? '+' : '') + fmt(yt.netFollowers)}</b>` : ''}`, 'newFollowers');
    h += aCard('wa', 'Klik WhatsApp', fmt(waAll), K.wa.actual == null ? '' : momPill(K.wa.mom),
      `<ul class="ov-wl"><li><span>4 outlet</span><b>${fmt(K.wa.actual)}</b><small>${K.wa.actual == null ? 'belum diisi' : pctN(K.wa.actual, K.wa.target) + '% target'}</small></li><li><span>Online Postage · HQ</span><b>${fmt(mc.v.waOnline)}</b></li><li><span>Buyback · HQ</span><b>${fmt(mc.v.waBuyback)}</b></li><li><span>Lead / klik outlet</span><b>${K.wa.actual ? (L.actual / K.wa.actual).toFixed(1) : '—'}</b></li></ul>`, '', 'wa');
    h += `</div>`;

    // ---- 5. KPI paling jauh + highlights ----
    const ins = KD.insights(state.ds, y, m);
    const hl = ins.map(i => ({ ...i }));
    if (c && c.top[0]) { const p = c.top[0]; hl.push({ kind: 'good', title: 'Post terbaik bulan ini', chip: fmt(p.views), text: `${p.kategori}${p.sub ? ' · ' + p.sub : ''}${p.type ? ' · ' + p.type : ''}${p.date ? `, ${p.date.d}/${p.date.m}` : ''}.` }); }
    h += secHead('Ringkasan', 'Status & highlights');
    h += `<div class="pair tpair">
      <div class="card tcard"><div class="tc-h"><div><span class="cf-eyebrow">${n} KPI bertarget</span><h3>Paling jauh dari target</h3></div><button class="link-btn" data-goto="analisis">Analisis penuh →</button></div>
        ${nM ? `<ul class="ct-mix">${sc.miss.slice(0, 5).map(k => { const p = Math.round(k.status.pct ?? 0); return `<li class="op-k"><div class="op-kt"><span class="op-dot bad">✕</span><span class="op-kl">${esc(k.label)}</span><span class="op-kv"><b>${p}%</b></span></div><div class="op-bar"><i class="bad" style="width:${Math.min(100, p)}%"></i></div></li>`; }).join('')}</ul>` : '<div class="ct-emp">Semua KPI capai target. 🎉</div>'}</div>
      <div class="card tcard"><div class="tc-h"><div><span class="cf-eyebrow">Dari data sebenar</span><h3>Key highlights</h3></div></div>
        ${hl.length ? `<ul class="ov-hl">${hl.map(i => `<li class="${i.kind}"><span class="ov-hi">${i.kind === 'good' ? '✓' : '!'}</span><div><b>${esc(i.title)}</b><p>${esc(i.text)}</p></div>${i.chip ? `<span class="ov-chip ${i.kind}">${esc(i.chip)}</span>` : ''}</li>`).join('')}</ul>` : '<div class="ct-emp">Belum cukup data untuk highlight.</div>'}</div>
    </div>`;
    h += `<div class="chart-cap">Butiran setiap outlet di tab Outlet. Views per-post (tab bulanan) tak dicampur dengan views Insight akaun untuk elak double count.</div>`;
    return h;
  }

  // =========================================================
  // CONTENT PERFORMANCE
  // =========================================================
  // Stacked bar: views bulanan ikut platform
  const PCOL = { tt: '#1565FF', fb: '#7FA8FF', ig: '#F0702B' };
  function stackChart(rows, opts = {}) {
    const W = opts.w || Math.min(chartW(), 1100), H = W > 500 ? 220 : 170, pl = 44, pr = 6, pt = 10, pb = 20;
    const tot = rows.map(r => r.parts.reduce((a, p) => a + (p.v || 0), 0));
    let max = Math.max(...tot, opts.target || 0, 1);
    const y = v => pt + (H - pt - pb) * (max - v) / max;
    const bw = (W - pl - pr) / rows.length, gap = Math.min(10, bw * 0.3);
    const tl = v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'K' : Math.round(v);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || '')}">`;
    for (const t of [0, max / 2, max]) s += `<line class="grid-l" x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}"/><text x="${pl - 4}" y="${y(t) + 3}" text-anchor="end">${tl(t)}</text>`;
    rows.forEach((r, i) => {
      const x = pl + i * bw + gap / 2, w = Math.max(2, bw - gap);
      let base = 0;
      for (const p of r.parts) {
        if (!p.v) continue;
        const y1 = y(base + p.v), y0 = y(base);
        s += `<rect x="${x.toFixed(1)}" y="${y1.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(0.5, y0 - y1).toFixed(1)}" fill="${p.c}" opacity="${r.dim ? .45 : 1}"/>`;
        base += p.v;
      }
      s += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 5}" text-anchor="middle"${r.hl ? ' style="font-weight:700;fill:var(--text)"' : ''}>${esc(r.label)}</text>`;
      s += `<rect class="hit" x="${pl + i * bw}" y="${pt}" width="${bw}" height="${H - pt - pb}" data-tip="${esc(r.tip)}"/>`;
    });
    return s + '</svg>';
  }

  function ringS(ratio, lvl, size = 58) {
    const r = size / 2 - 5, C = 2 * Math.PI * r, off = C * (1 - Math.max(0, Math.min(1, ratio || 0)));
    return `<svg class="oring ${lvl}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="tr"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="fg" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
  }
  const momPill = (v, inv) => v == null || !Number.isFinite(v) ? '' : `<span class="tp ${v >= 0 ? 'up' : 'dn'}">${v >= 0 ? '▲' : '▼'} ${Math.abs(v) >= 999 ? '>999' : Math.abs(v).toFixed(0)}%</span>`;
  const secHead = (eb, title, sub = '', cls = 'sm') => `<div class="op-head ${cls}"><div><span class="cf-eyebrow">${eb}</span><h2 class="op-h">${title}</h2>${sub ? `<p class="op-sub">${sub}</p>` : ''}</div></div>`;

  async function viewContent(key) {
    const [y, m] = parseKey(key);
    const { res, c, pc, cPace, live } = await monthContent(key);
    const [py, pm] = KD.prevYM(y, m), prevLbl = monShort(py, pm);
    const fullN = n => n == null ? '—' : Math.round(n).toLocaleString('en-MY');
    let h = secHead(`Content · ${monLabel(key)}`, 'Content performance', `Output, prestasi platform dan content terbaik. ▲▼ vs ${prevLbl}${live ? ' · bulan semasa dinilai ikut kadar hari' : ''}.`, '');

    // ---- 1. Output vs target ----
    if (!c) h += `<div class="card empty">${res.error ? `Tak dapat baca tab per-post untuk ${monLabel(key)}: ${esc(res.error)}` : `Belum ada post direkod untuk ${monLabel(key)}.`}</div>`;
    else {
      const sc = KD.scorecard(state.ds, y, m, c, pc, cPace);
      const ids = ['totalContent', 'pov', 'strategic', 'postViews'];
      const SUB = { totalContent: 'Semua post bulan ini', pov: 'Video POV customer', strategic: 'Educational, trend, review, promo', postViews: 'Jumlah view semua post' };
      const LB = { totalContent: 'Total post', pov: 'POV Customer', strategic: 'Strategic', postViews: 'Views content' };
      h += res.warning ? `<div class="warn-box">⚠ ${esc(res.warning)}</div>` : '';
      h += `<div class="tk-strip ct-strip">${ids.map(id => sc.list.find(k => k.id === id)).filter(Boolean).map((k, i) => {
        const lvl = k.status.level, lead = i === 0;
        const pct = k.status.pct == null ? null : Math.round(k.status.pct);
        const v = k.id === 'postViews' ? fmt(k.actual) : fullN(k.actual), tg = k.id === 'postViews' ? fmt(k.target) : fullN(k.target);
        return `<div class="tk ct-k${lead ? ' tk-lead' : ''}"><div class="tk-h"><span>${LB[k.id]}</span>${momPill(k.mom)}</div>
          <div class="ct-kb"><div class="op-ringw ct-ring">${ringS((k.actual || 0) / k.target, lead ? 'inv' : lvl)}<span class="ct-pc">${pct == null ? '—' : pct + '%'}</span></div>
          <div><b>${v}</b><small>/ ${tg} target</small></div></div><small class="ct-sub">${SUB[k.id]}</small></div>`;
      }).join('')}</div>`;
      if (c.noType) h += `<div class="warn-box">⚠ ${c.noType} post tiada TYPE dalam sheet, jadi tak dikira sebagai POV atau Strategic.</div>`;
      if (c.hasType) {
        const mix = (eb, title, counts, tg) => {
          const tot = Object.keys(tg).reduce((a, k2) => a + (counts[k2] || 0), 0), tt = Object.values(tg).reduce((a, b) => a + b, 0);
          return `<div class="card tcard"><div class="tc-h"><div><span class="cf-eyebrow">${eb}</span><h3>${title}</h3></div><div class="tc-m"><span><b>${tot}</b> / ${tt} post</span></div></div><ul class="ct-mix">${Object.keys(tg).map(k2 => {
            const st = KD.status(counts[k2], tg[k2], cPace), pct = Math.min(100, 100 * counts[k2] / tg[k2]);
            return `<li class="op-k"><div class="op-kt"><span class="op-dot ${st.level}">${iconOf(st)}</span><span class="op-kl">${esc(k2)}</span><span class="op-kv"><b>${counts[k2]}</b><small>/ ${tg[k2]}</small></span></div><div class="op-bar"><i class="${st.level}" style="width:${pct.toFixed(1)}%"></i></div></li>`;
          }).join('')}</ul></div>`;
        };
        h += secHead('Strategic mix', 'Pecahan post strategic');
        h += `<div class="pair tpair">` + mix('Ikut jenis', 'Content type', c.typeCount, T.strategicType) + mix('Ikut subjek', 'Subjek', c.subjCount, T.strategicSubject) + `</div>`;
      } else h += `<div class="chart-cap" style="margin-top:8px">Lajur TYPE (POV Customer / Strategic) bermula dari tab SEPT'26.</div>`;
    }

    // ---- 2. Prestasi platform ----
    const cc = KD.companyCompare(state.ds, y, m), co = cc.cur, dim = daysIn(y, m);
    const PC = { tiktok: ['#0B1530', '#2F63EE', 'TT'], instagram: ['#6A47EE', '#E0457B', 'IG'], facebook: ['#1877F2', '#4FA3FF', 'FB'], youtube: ['#B3131B', '#FF3B3B', 'YT'] };
    h += secHead('Insight akaun', 'Prestasi platform', `Views, reach, engagement dan follower baru · dinormalkan ikut hari data untuk ▲▼`);
    h += `<div class="ct-plats">${co.plats.map(p => {
      const [c1, c2, ab] = PC[p.id] || ['#2F63EE', '#6E9BFF', '?'];
      const share = co.views && p.views != null ? Math.round(100 * p.views / co.views) : null;
      return `<div class="ct-pc-card"><div class="ct-ph" style="--c1:${c1};--c2:${c2}"><span class="ct-pa">${ab}</span><span class="ct-pn"><b>${p.name}</b><span>${p.days}/${dim} hari data</span></span>${share != null ? `<span class="ct-sh">${share}%<small>views</small></span>` : ''}</div>
        <div class="ct-pb"><span class="ct-pl">Views</span><div class="ct-pv"><b>${fmt(p.views)}</b>${momPill(cc.ch('views', p.id))}</div>
        <div class="ct-ps">${p.id === 'youtube'
          ? `<div><span>Watch time</span><b>${p.watchHours == null ? '—' : fmt(p.watchHours) + ' j'}</b>${momPill(cc.ch('watchHours', p.id))}</div><div><span>CTR thumbnail</span><b>${p.ctr == null ? '—' : p.ctr.toFixed(1) + '%'}</b></div><div><span>Subscriber baru</span><b>${fmt(p.newFollowers)}</b></div>`
          : `<div><span>Reach</span><b>${fmt(p.reach)}</b></div><div><span>Engagement</span><b>${fmt(p.engagement)}</b>${momPill(cc.ch('engagement', p.id))}</div><div><span>Follower baru</span><b>${fmt(p.newFollowers)}</b></div>`}</div></div></div>`;
    }).join('')}
      <div class="ct-pc-card ct-tot"><div class="ct-pb"><span class="ct-pl">Jumlah ${co.plats.filter(p => p.views != null).length} platform</span><div class="ct-pv"><b>${fmt(co.views)}</b>${momPill(cc.ch('views'))}</div>
        <div class="ct-ps"><div><span>Engagement</span><b>${fmt(co.engagement)}</b>${momPill(cc.ch('engagement'))}</div><div><span>Follower baru</span><b>${fmt(co.newFollowers)}</b>${momPill(cc.ch('newFollowers'))}</div></div></div></div></div>
      <div class="chart-cap">Engagement TikTok = Likes + Comments + Shares; Facebook & Instagram = Interactions; YouTube tiada data engagement (tak masuk jumlah engagement). Follower baru YouTube = subscriber baru. Reach tak dijumlahkan sebab orang sama boleh dikira di beberapa platform.</div>`;

    // ---- 3. Trend views bulanan ----
    const series = KD.monthlySeries(state.ds).filter(r => r.key <= key).slice(-12).map(r => {
      const [yy, mm] = parseKey(r.key), d = daysIn(yy, mm);
      return { ...r, _lab: MON[mm - 1], _full: monLabel(r.key), _hl: r.key === key, _dim: ['tt', 'fb', 'ig', 'yt'].some(q => r[q + '_days'] && r[q + '_days'] < d * 0.9) };
    });
    h += `<div class="card tcard" style="margin-top:16px"><div class="tc-h"><div><span class="cf-eyebrow">12 bulan terakhir</span><h3>Views ikut platform</h3></div></div>
      <div class="tlg"><span><i style="background:#2F63EE"></i>TikTok</span><span><i style="background:#7B5CF5"></i>Instagram</span><span><i style="background:#1FB6C9"></i>Facebook</span><span><i style="background:#E0262B"></i>YouTube</span></div>
      ${tChart(series, [{ k: 'tt_views', n: 'TikTok', c1: '#6E9BFF', c2: '#2F63EE' }, { k: 'ig_views', n: 'IG', c1: '#9C84FF', c2: '#6A47EE' }, { k: 'fb_views', n: 'FB', c1: '#4FD3E0', c2: '#15A2B8' }, { k: 'yt_views', n: 'YT', c1: '#FF6B6B', c2: '#E0262B' }], { w: Math.min(chartW(), 1100), hl: true, aria: 'Views bulanan ikut platform' })}
      <div class="chart-cap">Bar pudar = data harian bulan itu belum lengkap.</div></div>`;

    if (!c) return h;

    // ---- 4. Top content ----
    const topV = c.top.length ? c.top[0].views || 1 : 1;
    const tierB = t => `<span class="ct-tier ${t}">${t}</span>`;
    h += secHead('Top 5 · views TikTok per post', 'Content terbaik', `${c.total} post · purata ${fmt(c.avg)} view/post${c.top.some(p => p.url) ? ' · ketik untuk buka video' : ''}`);
    h += `<div class="ct-top">${c.top.map((p, i) => {
      const tier = KD.tierOf(p.views);
      const ttl = `${p.kategori}${p.sub ? ' · ' + p.sub : ''}`;
      const meta = [p.date ? `${p.date.d}/${p.date.m}` : '', p.type, CFG.outletNames[p.outlet] || p.outlet].filter(Boolean);
      const inner = i === 0
        ? `<span class="ct-r1">#1</span><div class="ct-t1"><span class="ct-tl">${esc(ttl)}</span><span class="ct-tm">${meta.map(esc).join(' · ')}</span></div><div class="ct-tv1"><b>${fullN(p.views)}</b><span>views</span>${tierB(tier)}</div>${p.url ? '<span class="ct-play" aria-hidden="true">▶</span>' : ''}`
        : `<span class="ct-rk">${i + 1}</span><div class="ct-tx"><span class="ct-tl">${esc(ttl)}</span><span class="ct-tm">${meta.map(esc).join(' · ')}</span><span class="ct-tb"><i style="width:${(100 * (p.views || 0) / topV).toFixed(1)}%"></i></span></div><div class="ct-tv"><b>${fmt(p.views)}</b>${tierB(tier)}</div>`;
      const cls = i === 0 ? 'ct-first' : 'ct-item';
      return p.url ? `<a class="${cls}" href="${esc(p.url)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="${cls}">${inner}</div>`;
    }).join('')}</div>`;

    // ---- 5. Content type, funnel, kategori, bucket ----
    const shareCard = (eb, title, g, order) => {
      const keys = Object.keys(g).sort((a, b2) => (order ? order.indexOf(a) - order.indexOf(b2) : g[b2].views - g[a].views));
      const tv = keys.reduce((a, k2) => a + g[k2].views, 0);
      const maxAvg = Math.max(...keys.map(k2 => g[k2].views / g[k2].posts), 1);
      return `<div class="card tcard"><div class="tc-h"><div><span class="cf-eyebrow">${eb}</span><h3>${title}</h3></div></div><ul class="ct-share">${keys.map(k2 => {
        const pc2 = tv ? 100 * g[k2].views / tv : 0, av = g[k2].views / g[k2].posts;
        return `<li><div class="ct-srow"><span class="ct-sn">${esc(k2)}<small>${g[k2].posts} post</small></span><span class="ct-sv"><b>${fmt(g[k2].views)}</b><small>${Math.round(pc2)}%</small></span></div>
          <div class="ct-sbar"><i style="width:${pc2.toFixed(1)}%"></i></div><div class="ct-savg">Purata <b>${fmt(av)}</b>/post${av === maxAvg && keys.length > 1 ? ' <span class="ct-best">Purata tertinggi</span>' : ''}</div></li>`;
      }).join('')}</ul></div>`;
    };
    h += secHead('Prestasi ikut kumpulan', 'Type, funnel & kategori', 'Bar = bahagian daripada jumlah views. Purata/post tunjuk jenis content yang paling berbaloi.');
    h += `<div class="pair tpair">`;
    h += c.hasType ? shareCard('Lajur TYPE', 'Content type', c.byType) : `<div class="card tcard"><h3>Content type</h3><div class="empty">Lajur TYPE tiada dalam tab bulan ini.</div></div>`;
    h += c.hasFunnel ? shareCard('TOFU · MOFU · BOFU', 'Funnel', c.byFunnel, ['TOFU', 'MOFU', 'BOFU'])
      : `<div class="card tcard"><div class="tc-h"><div><span class="cf-eyebrow">TOFU · MOFU · BOFU</span><h3>Funnel</h3></div></div><div class="ct-emp">Tab per-post belum ada lajur TOFU/MOFU/BOFU. Tambah satu lajur dengan nilai TOFU, MOFU atau BOFU untuk setiap post dan bahagian ini akan keluar sendiri.</div></div>`;
    h += shareCard('Lajur KATEGORI', 'Kategori', c.kategori);
    h += `<div class="card tcard"><div class="tc-h"><div><span class="cf-eyebrow">Target views</span><h3>Views ikut bucket</h3></div><div class="tc-m"><span>Bebas, tak dijumlahkan</span></div></div><ul class="ct-mix">${Object.entries(c.bucketStats).map(([k2, b2]) => {
      const st = KD.status(b2.views, b2.target, cPace), pct = Math.min(100, 100 * b2.views / b2.target);
      return `<li class="op-k"><div class="op-kt"><span class="op-dot ${st.level}">${iconOf(st)}</span><span class="op-kl">${esc(k2)}<small class="ct-pp">${b2.posts} post</small></span><span class="op-kv"><b>${fmt(b2.views)}</b><small>/ ${fmt(b2.target)}</small></span></div><div class="op-bar"><i class="${st.level}" style="width:${pct.toFixed(1)}%"></i></div></li>`;
    }).join('')}</ul></div>`;
    h += `</div><div class="chart-cap">Tier: Diamond ≥ 1M · Gold ≥ 300K · Silver ≥ 100K · Bronze bawah 100K. ${live ? 'Bulan semasa: status dinilai ikut kadar hari.' : ''}</div>`;
    return h;
  }

  // =========================================================
  // MARKETING ANALYSIS
  // =========================================================
  const NA_WHY = { 'Linktree & WhatsApp': 'LINKTREE belum diisi untuk bulan ini (dikemas kini sebulan sekali)', 'Leads & Walk-in': 'Tab Leads / Walk-in belum ada data bulan ini', TikTok: 'Tiada data TikTok Insight bulan ini', Content: 'Tab per-post tiada data' };
  async function viewAnalysis(key) {
    const [y, m] = parseKey(key);
    const { c, pc, cPace, live } = await monthContent(key);
    const [py, pm] = KD.prevYM(y, m), prevLbl = monShort(py, pm);
    const sc = KD.scorecard(state.ds, y, m, c, pc, cPace);
    const n = sc.list.length, nH = sc.hit.length, nM = sc.miss.length, nN = sc.na.length;
    let h = secHead(`Analisis KPI · ${monLabel(key)}`, 'Marketing analysis', `Semua KPI bertarget berbanding target rasmi dan ${monLabel(KD.ym(py, pm))}${live ? ' · bulan semasa dinilai ikut kadar hari' : ''}.`, '');

    // ---- 1. Skor ----
    const tileA = (cls, num, lab, sub) => `<div class="an-t ${cls}"><b>${num}</b><span>${lab}</span><small>${sub}</small></div>`;
    h += `<div class="an-score"><div class="an-big"><span class="ov-eb">Skor bulan ini</span><div class="an-bn"><b>${nH}</b><span>/ ${n} KPI ${live ? 'on track' : 'capai'}</span></div>
        <div class="ov-seg">${nH ? `<i class="good" style="flex:${nH}"></i>` : ''}${nM ? `<i class="bad" style="flex:${nM}"></i>` : ''}${nN ? `<i class="na" style="flex:${nN}"></i>` : ''}</div>
        <p>${n ? Math.round(100 * nH / n) : 0}% KPI ${live ? 'on track' : 'capai target'}${nM ? ` · ${nM} perlu tindakan` : ''}</p></div>
      ${tileA('good', nH, live ? 'On track' : 'Capai target', 'KPI hijau')}${tileA('bad', nM, live ? 'Ketinggalan' : 'Gagal capai', 'Jurang terbesar disenarai dulu')}${tileA('na', nN, 'Tiada data', 'Tak dikira sebagai 0')}</div>`;

    // ---- 2. Insights + perubahan ----
    const ins = KD.insights(state.ds, y, m), f = KD.funnel(state.ds, y, m);
    const act = f.weakest && ACT[f.weakest.id] ? `<div class="an-act"><span class="an-ai">→</span><div><b>Cadangan fokus: ${esc(f.weakest.label)}</b><p>${ACT[f.weakest.id]}</p></div></div>` : '';
    const withMom = sc.list.filter(k => k.mom != null && Number.isFinite(k.mom) && !k.floor);
    const up = [...withMom].sort((a, b) => b.mom - a.mom).filter(k => k.mom > 0).slice(0, 5);
    const down = [...withMom].sort((a, b) => a.mom - b.mom).filter(k => k.mom < 0).slice(0, 5);
    const mx = Math.max(1, ...withMom.map(k => Math.min(150, Math.abs(k.mom))));
    const mv = (list, cls) => list.length ? `<ul class="an-mv">${list.map(k => `<li><div class="an-mvt"><span data-tip="${esc(k.label)}">${esc(k.label)}</span><b class="${cls}">${k.mom > 0 ? '▲' : '▼'} ${Math.abs(k.mom) >= 999 ? '>999' : Math.abs(k.mom).toFixed(0)}%</b></div><div class="an-mvb ${cls}"><i style="width:${(100 * Math.min(150, Math.abs(k.mom)) / mx).toFixed(1)}%"></i></div></li>`).join('')}</ul>` : '<div class="ct-emp">Tiada</div>';
    h += `<div class="pair tpair" style="margin-top:16px">
      <div class="card tcard"><div class="tc-h"><div><span class="cf-eyebrow">Dari data sebenar</span><h3>Insights</h3></div></div>
        ${ins.length ? `<ul class="ov-hl">${ins.map(i => `<li class="${i.kind}"><span class="ov-hi">${i.kind === 'good' ? '✓' : '!'}</span><div><b>${esc(i.title)}</b><p>${esc(i.text)}</p></div>${i.chip ? `<span class="ov-chip ${i.kind}">${esc(i.chip)}</span>` : ''}</li>`).join('')}</ul>` : '<div class="ct-emp">Belum cukup data.</div>'}${act}</div>
      <div class="card tcard"><div class="tc-h"><div><span class="cf-eyebrow">Dinormalkan ikut hari data</span><h3>Perubahan vs ${prevLbl}</h3></div></div>
        <div class="an-cols"><div><div class="an-ch up">Naik paling banyak</div>${mv(up, 'up')}</div><div><div class="an-ch dn">Turun paling banyak</div>${mv(down, 'dn')}</div></div></div>
    </div>`;

    // ---- 3. Senarai KPI ----
    const GI = { Content: 'C', TikTok: 'TT', 'Linktree & WhatsApp': 'LT', 'Leads & Walk-in': 'LW' };
    const krow = k => {
      const st = k.status, pct = k.floor ? null : st.pct, w = pct == null ? 0 : Math.min(100, pct);
      const tg = k.floor ? `≥ ${fmt(k.target)}` : fmtVal(k.target, k.unit);
      const momTxt = k.floor || (k.nowN != null && k.nowN < 0) ? cmp(k, k.prev, '') : momPill(k.mom);
      return `<li class="an-k"><span class="an-g">${GI[k.group] || '•'}</span>
        <div class="an-kn"><b>${esc(k.label)}</b><small>${esc(k.group || '')}</small></div>
        <div class="an-kp"><div class="an-kv"><b>${fmtVal(k.actual, k.unit)}</b><small>/ ${tg}</small><span class="an-pc ${st.level}">${pct == null ? '—' : Math.round(pct) + '%'}</span></div><div class="op-bar"><i class="${st.level}" style="width:${w.toFixed(0)}%"></i></div></div>
        <div class="an-km">${momTxt || '<span class="tp na">—</span>'}</div><div class="an-ks">${chipK(k)}</div></li>`;
    };
    const blk = (eb, title, list, sub) => list.length ? secHead(eb, `${title} <span class="an-n">${list.length}</span>`, sub) + `<div class="card an-list"><div class="an-hd"><span></span><span>KPI</span><span>Actual / target</span><span>vs ${prevLbl}</span><span>Status</span></div><ul>${list.map(krow).join('')}</ul></div>` : '';
    h += blk('Perlu tindakan', live ? 'KPI ketinggalan' : 'KPI gagal capai', sc.miss, 'Disusun ikut jurang terbesar dulu.');
    h += blk('Prestasi baik', live ? 'KPI on track' : 'KPI capai target', sc.hit);
    if (nN) {
      const byG = {};
      for (const k of sc.na) (byG[k.group] = byG[k.group] || []).push(k.label);
      h += secHead('Tak dikira sebagai 0', 'Tiada data') + `<div class="an-na">${Object.entries(byG).map(([g, l]) => `<div class="card an-nac"><span class="an-g">${GI[g] || '•'}</span><div><b>${esc(g)}</b><p>${esc(NA_WHY[g] || 'Sumber data kosong')}</p><small>${esc(l.join(', '))}</small></div></div>`).join('')}</div>`;
    }
    if (!c) h += `<div class="warn-box">⚠ KPI content tidak dinilai kerana tab per-post ${monLabel(key)} tiada data.</div>`;
    if (c && live) h += `<div class="chart-cap">Views content per-post bulan semasa masih bertambah (video baru belum cukup umur), jadi perbandingan views per-post dengan bulan lepas belum muktamad.</div>`;
    h += `<div class="chart-cap">Status: ✓ capai/on track · ! 80–99% · ↗ bawah target tapi naik vs bulan lepas · ✕ bawah target & tak naik. Butiran aliran pelanggan di tab Funnel.</div>`;
    return h;
  }


  // Status data: dalam menu ⓘ, bukan di setiap page
  function fillInfo() {
    const ds = state.ds; if (!ds) return;
    const names = { tiktok: 'TikTok Insight', facebook: 'Facebook Insight', instagram: 'Instagram Insight', youtube: 'Youtube Insight', supply: 'Supply Video V2', beforeAfter: 'Before/After', customer: 'Customer', leads: 'Leads', walkin: 'Walk-in', linktree: 'LINKTREE' };
    const li = Object.entries(names).map(([k, n]) => {
      const s = ds.sources[k]; if (!s) return '';
      return `<li><span class="${s.ok ? 'ok' : 'no'}">${s.ok ? '●' : '✕'}</span> ${n}: ${s.ok ? s.rows + ' baris' : esc(s.error)}</li>`;
    }).join('');
    $('#info-body').innerHTML = `<ul class="health">${li}</ul><p class="health">Dimuat ${new Date(ds.loadedAt).toLocaleString('ms-MY')}. Data dibaca terus dari Google Sheet setiap kali app dibuka atau bila tekan muat semula.</p>
      <p class="health">Status: ✓ capai/on track · ! 80–99% · ↗ bawah target tapi naik vs bulan lepas · ✕ bawah target & tak naik.</p>`;
  }

  // ---------- render ----------
  let renderSeq = 0;
  async function render() {
    const seq = ++renderSeq;
    document.querySelectorAll('.tabs button').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === state.tab);
      if (b.dataset.tab === state.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    $('#page-title').textContent = TITLES[state.tab];
    document.title = `${TITLES[state.tab]} · KLIKI Marketing`;
    if (!state.ds) return;
    const key = state.month, view = $('#view');
    view.className = 'v-' + state.tab;
    let html;
    try {
      if (['overview', 'content', 'analisis', 'outlet'].includes(state.tab) && !state.ds.posts[key]) {
        view.innerHTML = `<div class="loading"><div class="spinner"></div><p>Memuatkan post ${monLabel(key)}…</p></div>`;
      }
      if (state.tab === 'overview') html = await viewOverview(key);
      else if (state.tab === 'content') html = await viewContent(key);
      else if (state.tab === 'analisis') html = await viewAnalysis(key);
      else if (state.tab === 'outlet') html = await viewOutlet(key);
      else if (state.tab === 'trend') html = viewTrend(key);
      else html = viewFunnel(key);
    } catch (e) {
      console.error(e);
      html = `<div class="card empty">Ralat paparan: ${esc(e.message)}</div>`;
    }
    if (seq !== renderSeq) return;
    view.innerHTML = html;
    fillInfo();
  }

  function fillMonths() {
    const months = KD.monthsAvailable(state.ds).filter(k => k >= '2025-01');
    const now = new Date(), cur = KD.ym(now.getFullYear(), now.getMonth() + 1);
    if (!months.includes(cur)) months.push(cur);
    const sel = $('#month');
    sel.innerHTML = months.slice().reverse().map(k => `<option value="${k}">${monLabel(k)}</option>`).join('');
    if (!state.picked || !months.includes(state.month)) {
      const withData = KD.monthsAvailable(state.ds);
      state.month = withData[withData.length - 1] || cur;
    }
    sel.value = state.month;
  }

  function persist() { if (state.ds) localSet(CACHE_KEY, JSON.stringify(state.ds)); }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    const btn = $('#refresh'), line = $('#status-line');
    btn.classList.add('spin'); line.className = 'status-line'; line.textContent = 'Mengemas kini dari Google Sheet…';
    try {
      const ds = await KD.loadAll((d, n) => { line.textContent = `Mengemas kini… ${d}/${n}`; });
      const failed = Object.entries(ds.sources).filter(([, s]) => !s.ok);
      if (failed.length === Object.keys(ds.sources).length) throw new Error(failed[0][1].error);
      state.ds = ds; persist(); fillMonths();
      line.textContent = `Dikemas kini ${new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}` + (failed.length ? ` · ${failed.length} sumber gagal (ketik ⓘ)` : '');
      if (failed.length) line.className = 'status-line err';
      await render();
    } catch (e) {
      line.className = 'status-line err';
      line.textContent = state.ds ? `Offline · papar data simpanan ${new Date(state.ds.loadedAt).toLocaleString('ms-MY')}` : `Gagal muat data: ${e.message}`;
      if (!state.ds) $('#view').innerHTML = `<div class="card empty">Tak dapat capai Google Sheet. Semak internet, atau pastikan sheet dikongsi "Anyone with the link".</div>`;
    } finally { state.loading = false; btn.classList.remove('spin'); }
  }

  // ---------- events ----------
  $('#month').addEventListener('change', e => { state.month = e.target.value; state.picked = true; render(); scrollTo(0, 0); });
  $('#refresh').addEventListener('click', () => { if (state.ds) state.ds.posts = {}; load(); });
  // jalur outlet: buka butiran & skrol
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-goto]');
    if (g) { state.tab = g.dataset.goto; localSet('kliki-mkt-tab', state.tab); render(); scrollTo(0, 0); return; }
    const t = e.target.closest('.otile'); if (!t) return;
    e.preventDefault();
    const d = document.querySelector(t.getAttribute('href')); if (!d) return;
    d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#info').addEventListener('click', () => { fillInfo(); $('#info-dlg').showModal(); });
  $('#info-close').addEventListener('click', () => $('#info-dlg').close());
  $('#info-dlg').addEventListener('click', e => { if (e.target.id === 'info-dlg') e.target.close(); });
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
    state.tab = b.dataset.tab; localSet('kliki-mkt-tab', state.tab); render(); scrollTo(0, 0);
  }));
  // Lukis semula chart bila lebar berubah ketara (putar phone, ubah saiz tetingkap)
  let lastW = innerWidth, rT;
  addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => { if (Math.abs(innerWidth - lastW) > 40 && state.ds) { lastW = innerWidth; render(); } }, 200);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.ds && Date.now() - new Date(state.ds.loadedAt) > 10 * 60 * 1000) { state.ds.posts = {}; load(); }
  });

  // ---------- boot ----------
  try { const c = localGet(CACHE_KEY); if (c) { state.ds = JSON.parse(c); fillMonths(); render(); } } catch { /* cache rosak */ }
  load();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
