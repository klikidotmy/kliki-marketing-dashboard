// KLIKI Marketing Dashboard — paparan sahaja. Semua KPI dikira dalam scripts/build-data.mjs.
(function () {
  'use strict';
  const BULAN = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
  const BLN = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];
  const CATS = [['phone', 'Phone'], ['repair', 'Repair'], ['cc', 'CC']];
  const STATUS_TXT = { green: 'Atas landasan', yellow: 'Hampir', red: 'Ketinggalan', none: 'Tiada data' };
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => (n === null || n === undefined || Number.isNaN(n) ? '—' : Math.round(n).toLocaleString('en-US'));
  const fmt1 = (n) => (n === null || n === undefined ? '—' : (Math.round(n * 10) / 10).toLocaleString('en-US'));
  const pct = (x, d = 0) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : (x * 100).toFixed(d) + '%');
  const ymLabel = (ym) => `${BULAN[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;
  const ymShort = (ym) => BLN[+ym.slice(5, 7) - 1];
  const dLabel = (iso) => (iso ? `${+iso.slice(8, 10)} ${BLN[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}` : '—');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const svgNS = 'http://www.w3.org/2000/svg';
  const sv = (tag, attrs) => { const e = document.createElementNS(svgNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const pill = (s) => el('span', 'pill s-' + s, STATUS_TXT[s] || '—');

  // tooltip
  const tip = $('tip');
  function showTip(evt, text) {
    tip.textContent = text; tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let x = evt.clientX + 12, y = evt.clientY - r.height - 10;
    if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - 12;
    if (y < 8) y = evt.clientY + 14;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  const hideTip = () => { tip.hidden = true; };
  const bindTip = (node, text) => { node.addEventListener('pointermove', (e) => showTip(e, text)); node.addEventListener('pointerleave', hideTip); };

  let D = null;
  async function load() {
    try {
      const r = await fetch('data/dashboard.json', { cache: 'no-store' });
      if (!r.ok) throw new Error(r.status);
      return await r.json();
    } catch (e) {
      if (window.DASHBOARD_DATA) return window.DASHBOARD_DATA;
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'data/dashboard.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
      return window.DASHBOARD_DATA;
    }
  }

  function init(data) {
    D = data;
    const sel = $('month');
    const keys = Object.keys(D.months).sort().reverse();
    for (const k of keys) { const o = el('option', null, ymLabel(k) + (k === D.currentMonth ? ' (semasa)' : '')); o.value = k; sel.appendChild(o); }
    let start = D.currentMonth;
    const h = location.hash.slice(1);
    if (/^\d{4}-\d{2}$/.test(h) && D.months[h]) start = h;
    sel.value = start;
    sel.addEventListener('change', () => { history.replaceState(null, '', '#' + sel.value); render(sel.value); });
    let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => render(sel.value), 150); });
    render(start);
  }

  function render(ym) {
    const M = D.months[ym];
    const gen = new Date(D.generatedAt);
    $('meta').textContent = `${ymLabel(ym)} · data outlet sehingga ${dLabel(M.asOf)} · data berubah ${gen.toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', dateStyle: 'medium', timeStyle: 'short' })}`;
    renderWarnings(ym);
    renderScore(M, ym);
    renderCats(M);
    renderFunnel(M);
    renderTrend(ym);
    renderContent(M);
    renderPlatforms(M, ym);
    renderOutlets(M);
  }

  function renderWarnings(ym) {
    const list = D.warnings.filter((w) => !/^\d{4}-\d{2}/.test(w.msg) || w.msg.startsWith(ym));
    const box = $('warnings');
    box.hidden = !list.length;
    $('warn-count').textContent = `${list.length} amaran data untuk ${ymLabel(ym)}`;
    const ul = $('warn-list'); ul.replaceChildren();
    for (const w of list) ul.appendChild(el('li', null, w.msg));
  }

  // ---------- score ----------
  function renderScore(M, ym) {
    $('score-hint').textContent = M.isCurrent
      ? `Pace = target × hari ke-${M.asOf ? +M.asOf.slice(8, 10) : 0} ÷ ${M.daysInMonth}. Target company = jumlah semua outlet.`
      : 'Bulan sudah tamat. Pencapaian dibanding target penuh.';
    scoreCard($('card-lead'), 'Lead', M.company.lead.total, M, 'cumLead');
    scoreCard($('card-walkin'), 'Walk-in', M.company.walkin.total, M, 'cumWalkin');
  }

  function scoreCard(root, label, m, M, key) {
    root.replaceChildren();
    const top = el('div', 'score-top');
    const left = el('div');
    left.appendChild(el('h3', null, label + ' company'));
    const big = el('div', 'big');
    big.append(fmt(m.actual), el('small', null, ` / ${fmt(m.target)}`));
    left.appendChild(big);
    top.append(left, pill(m.status));
    root.appendChild(top);

    const bar = el('div', 'bar');
    const fill = el('i'); fill.style.width = Math.min(100, (m.actual / m.target) * 100) + '%';
    bar.appendChild(fill);
    if (M.isCurrent) { const mk = el('b'); mk.style.left = Math.min(100, (m.pace / m.target) * 100) + '%'; bindTip(mk, `Pace: ${fmt(m.pace)}`); bar.appendChild(mk); }
    bindTip(fill, `${fmt(m.actual)} (${pct(m.pct)} target)`);
    root.appendChild(bar);

    const kv = el('div', 'kv');
    const item = (k, v) => { const d = el('div'); d.append(el('span', null, k), el('strong', null, v)); kv.appendChild(d); };
    item('Capai', pct(m.pct));
    if (M.isCurrent) {
      item('Pace setakat ini', fmt(m.pace));
      item('Perlu sehari', fmt1(m.needPerDay));
    } else {
      item('Kurang', m.gap > 0 ? fmt(m.gap) : 'Capai');
      item('Purata sehari', fmt1(m.actual / M.daysInMonth));
    }
    root.appendChild(kv);
    cumChart(M, key, m.target, root);
  }

  function cumChart(M, key, target, root) {
    const box = el('div', 'chart');
    root.appendChild(box);
    const W = Math.max(280, box.clientWidth || 480), H = 120, pl = 34, pr = 8, pt = 8, pb = 18;
    const n = M.daysInMonth;
    const maxY = Math.max(target, ...M.series.map((s) => s[key] || 0)) * 1.05;
    const x = (d) => pl + ((d - 1) / (n - 1)) * (W - pl - pr);
    const y = (v) => pt + (1 - v / maxY) * (H - pt - pb);
    const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', 'aria-label': 'Kumulatif berbanding garis target' });
    for (const g of [0, 0.5, 1]) {
      const v = target * g;
      svg.appendChild(sv('line', { x1: pl, x2: W - pr, y1: y(v), y2: y(v), stroke: 'var(--line)', 'stroke-width': 1 }));
      const t = sv('text', { x: pl - 6, y: y(v) + 4, 'text-anchor': 'end' }); t.textContent = fmt(v); svg.appendChild(t);
    }
    svg.appendChild(sv('line', { x1: x(1), y1: y(target / n), x2: x(n), y2: y(target), stroke: 'var(--muted)', 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }));
    const pts = M.series.filter((s) => s[key] !== null && s[key] !== undefined);
    if (pts.length) {
      const d = pts.map((s, i) => `${i ? 'L' : 'M'}${x(s.day).toFixed(1)},${y(s[key]).toFixed(1)}`).join('');
      const area = d + `L${x(pts[pts.length - 1].day).toFixed(1)},${y(0)}L${x(pts[0].day).toFixed(1)},${y(0)}Z`;
      svg.appendChild(sv('path', { d: area, fill: 'var(--brand-soft)', stroke: 'none' }));
      svg.appendChild(sv('path', { d, fill: 'none', stroke: 'var(--brand)', 'stroke-width': 2.2, 'stroke-linejoin': 'round' }));
      const last = pts[pts.length - 1];
      svg.appendChild(sv('circle', { cx: x(last.day), cy: y(last[key]), r: 4, fill: 'var(--brand)' }));
      for (const s of pts) {
        const hit = sv('rect', { x: x(s.day) - (W / n) / 2, y: pt, width: W / n, height: H - pt - pb, fill: 'transparent' });
        bindTip(hit, `Hari ${s.day}: kumulatif ${fmt(s[key])} · sasaran ${fmt((target * s.day) / n)}`);
        svg.appendChild(hit);
      }
    }
    for (const dd of [1, Math.round(n / 2), n]) { const t = sv('text', { x: x(dd), y: H - 4, 'text-anchor': dd === 1 ? 'start' : dd === n ? 'end' : 'middle' }); t.textContent = dd; svg.appendChild(t); }
    box.appendChild(svg);
    const lg = el('div', 'legend');
    const li = (c, t, dash) => { const s = el('span'); const i = el('i'); i.style.background = dash ? 'transparent' : c; if (dash) i.style.border = `2px dashed ${c}`; s.append(i, t); lg.appendChild(s); };
    li('var(--brand)', 'Kumulatif sebenar'); li('var(--muted)', 'Garis target', true);
    box.appendChild(lg);
  }

  // ---------- categories ----------
  function renderCats(M) {
    const t = $('cat-table'); t.replaceChildren();
    const head = el('tr');
    const cols = M.isCurrent ? ['Kategori', 'Sebenar', 'Pace', 'Target', 'Capai', '', 'Status', 'Harian (÷26)'] : ['Kategori', 'Sebenar', 'Target', 'Capai', '', 'Status', 'Harian (÷26)'];
    for (const h of cols) head.appendChild(el('th', null, h));
    t.appendChild(el('thead')).appendChild(head);
    const tb = t.appendChild(el('tbody'));
    for (const [type, label] of [['lead', 'Lead'], ['walkin', 'Walk-in']]) {
      const g = el('tr', 'grp'); const gc = el('td', null, label); gc.colSpan = cols.length; g.appendChild(gc); tb.appendChild(g);
      for (const [k, name] of [...CATS, ['total', 'Jumlah']]) {
        const m = M.company[type][k];
        const tr = el('tr', k === 'total' ? 'total' : '');
        tr.appendChild(el('td', null, name));
        tr.appendChild(el('td', 'r', fmt(m.actual)));
        if (M.isCurrent) tr.appendChild(el('td', 'r', fmt(m.pace)));
        tr.appendChild(el('td', 'r', fmt(m.target)));
        tr.appendChild(el('td', 'r', pct(m.pct)));
        const bc = el('td', 'mini'); const b = el('div', 'bar'); const f = el('i'); f.style.width = Math.min(100, m.pct * 100) + '%';
        f.style.background = `var(--${m.status === 'green' ? 'ok' : m.status === 'yellow' ? 'warn' : 'bad'})`;
        b.appendChild(f); bc.appendChild(b); tr.appendChild(bc);
        const sc = el('td'); sc.appendChild(pill(m.status)); tr.appendChild(sc);
        tr.appendChild(el('td', 'r', fmt(m.dailyLabel)));
        tb.appendChild(tr);
      }
    }
    const worst = CATS.map(([k, n]) => ({ n, p: M.company.lead[k].paceRatio })).sort((a, b) => a.p - b.p)[0];
    $('cat-note').textContent = `Lead ${worst.n} paling ketinggalan (${pct(worst.p)} dari pace). Lead repair Pendang (${fmt(M.pdgRepairLead)}) dikira dalam jumlah sebenar walaupun Pendang tiada servis repair; target repair company hanya dari outlet yang ada repair.`;
  }

  // ---------- funnel ----------
  function renderFunnel(M) {
    const F = M.funnel; const box = $('funnel-flow'); box.replaceChildren();
    const lt = F.linktreeComplete;
    const step = (lab, val, conv, src, cls) => {
      const s = el('div', 'step' + (cls ? ' ' + cls : ''));
      s.append(el('div', 'lab', lab), el('div', 'val', val));
      if (conv) s.appendChild(el('div', 'conv', conv));
      if (src) s.appendChild(el('div', 'src', src));
      box.appendChild(s);
    };
    step('View content', fmt(F.views), null, 'TikTok + FB + IG');
    step('Profile visit', fmt(F.profileVisits), F.views ? `${pct(F.profileVisits / F.views, 2)} daripada view` : null, 'TikTok + FB + IG');
    step('Buka Linktree', lt ? fmt(F.linktreeUniqueView) : 'Belum diisi', lt && F.ctrProfileToLinktree ? `CTR profile TikTok ${pct(F.ctrProfileToLinktree, 1)}` : null, 'Unique view');
    step('Klik WhatsApp outlet', lt ? fmt(F.waOutlet) : 'Belum diisi', lt && F.linktreeUniqueView ? `${fmt1((F.waOutlet / F.linktreeUniqueView) * 100)} klik / 100 pembuka` : null, '4 outlet');
    step('Lead direkod', fmt(F.leads), lt && F.leadPerWaClick ? `${fmt1(F.leadPerWaClick)} lead / klik WA` : null, 'Diisi staf outlet', 'outlet');
    step('Walk-in direkod', fmt(F.walkins), F.walkinPerLead ? `${pct(F.walkinPerLead)} daripada lead` : null, lt ? `Klik lokasi: ${fmt(F.locOutlet)}` : 'Klik lokasi: belum diisi', 'outlet');
    const hq = $('hq-row'); hq.replaceChildren();
    const it = (k, v) => { const s = el('span'); s.append(k + ': ', el('strong', null, v)); hq.appendChild(s); };
    hq.appendChild(el('strong', null, 'Saluran HQ (tiada rekod lead)'));
    if (F.hqWa) { it('WA Online Postage', fmt(F.hqWa.postage)); it('WA Buyback', fmt(F.hqWa.buyback)); it('Jumlah', fmt(F.hqWa.total)); }
    else it('Linktree', 'belum diisi');
  }

  function renderTrend(ym) {
    const box = $('trend'); box.replaceChildren();
    const keys = Object.keys(D.months).sort().filter((k) => k <= ym);
    const metrics = [
      ['View semua platform', (m) => m.funnel.views],
      ['Profile visit', (m) => m.funnel.profileVisits],
      ['Klik WhatsApp outlet', (m) => m.funnel.waOutlet],
      ['Lead direkod', (m) => m.funnel.leads],
      ['Walk-in direkod', (m) => m.funnel.walkins],
      ['Post TikTok', (m) => (m.content ? m.content.posts : null)],
    ];
    for (const [lab, get] of metrics) {
      const pts = keys.map((k) => ({ k, v: get(D.months[k]), partial: D.months[k].isCurrent })).filter((p) => p.v !== null && p.v !== undefined);
      const card = el('div', 'spark');
      card.appendChild(el('div', 'lab', lab));
      const last = pts[pts.length - 1]; const prev = pts[pts.length - 2];
      const v = el('div', 'val', last ? fmt(last.v) : '—'); card.appendChild(v);
      if (last && prev && !last.partial && prev.v) {
        const ch = (last.v - prev.v) / prev.v;
        card.appendChild(el('div', 'delta ' + (ch >= 0 ? 'up' : 'down'), `${ch >= 0 ? '▲' : '▼'} ${pct(Math.abs(ch))} vs ${ymShort(prev.k)}`));
      } else if (last && last.partial) card.appendChild(el('div', 'delta', 'Bulan semasa (separa)'));
      const c = el('div', 'chart'); card.appendChild(c); box.appendChild(card);
      const W = 260, H = 64, pb = 14;
      const max = Math.max(1, ...pts.map((p) => p.v));
      const bw = (W / Math.max(pts.length, 1)) * 0.7, gap = W / Math.max(pts.length, 1);
      const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%' });
      pts.forEach((p, i) => {
        const h = (p.v / max) * (H - pb - 4);
        const r = sv('rect', { x: i * gap + (gap - bw) / 2, y: H - pb - h, width: bw, height: Math.max(1, h), rx: 2, fill: p.k === ym ? 'var(--brand)' : 'var(--line)', opacity: p.partial ? 0.55 : 1 });
        bindTip(r, `${ymLabel(p.k)}: ${fmt(p.v)}${p.partial ? ' (separa)' : ''}`);
        svg.appendChild(r);
        if (i === 0 || i === pts.length - 1) { const t = sv('text', { x: i * gap + gap / 2, y: H - 2, 'text-anchor': 'middle' }); t.textContent = ymShort(p.k); svg.appendChild(t); }
      });
      c.appendChild(svg);
    }
  }

  // ---------- content ----------
  function renderContent(M) {
    const box = $('content-cats'); box.replaceChildren();
    const C = M.content;
    if (!C) { box.appendChild(el('p', 'note', 'Tab content untuk bulan ini belum ditambah dalam config.')); $('type-table').replaceChildren(); $('top-list').replaceChildren(); return; }
    const worst = CATS.map(([k]) => k).sort((a, b) => M.company.lead[a].paceRatio - M.company.lead[b].paceRatio)[0];
    for (const [k, name] of CATS) {
      const c = C.byCat[k]; const L = M.company.lead[k]; const W = M.company.walkin[k];
      const card = el('div', 'ccard');
      const h = el('h3', null, name); h.appendChild(pill(L.status)); card.appendChild(h);
      const row = (a, b) => { const r = el('div', 'row'); r.append(el('span', null, a), el('strong', null, b)); card.appendChild(r); };
      row('Post', `${fmt(c.posts)} (${pct(C.posts ? c.posts / C.posts : null)})`);
      row('View', fmt(c.views));
      row('Purata view / post', c.posts ? fmt(c.views / c.posts) : '—');
      row('Lead vs target', pct(L.pct));
      row('Walk-in vs target', pct(W.pct));
      const share = C.posts ? c.posts / C.posts : 0;
      let read;
      if (k === worst) read = `Kategori paling jauh dari target. Cuma ${fmt(c.posts)} post (${pct(share)}) bulan ini.`;
      else if (L.paceRatio >= 1) read = 'Lead atas landasan.';
      else read = `Lead ${pct(L.paceRatio)} dari pace.`;
      if (k === 'cc') {
        const tr = C.bySubject['Trade-in'] || { posts: 0 }, bb = C.bySubject['Buyback'] || { posts: 0 };
        read += ` Trade-in ${tr.posts}, Buyback ${bb.posts}.`;
      }
      card.appendChild(el('div', 'read', read));
      box.appendChild(card);
    }
    const tt = $('type-table'); tt.replaceChildren();
    if (C.byType) {
      const hr = el('tr'); for (const x of ['Jenis', 'Post', 'View', 'Purata']) hr.appendChild(el('th', null, x));
      tt.className = 'plain num'; tt.appendChild(el('thead')).appendChild(hr);
      const tb = tt.appendChild(el('tbody'));
      Object.entries(C.byType).sort((a, b) => b[1].views - a[1].views).forEach(([k, v]) => {
        const tr = el('tr'); tr.append(el('td', null, k), el('td', null, fmt(v.posts)), el('td', null, fmt(v.views)), el('td', null, fmt(v.views / v.posts))); tb.appendChild(tr);
      });
    } else {
      const tr = el('tr'); const td = el('td', null, 'Kolum TYPE dalam log post bermula September 2026.'); tr.appendChild(td); tt.appendChild(tr);
    }
    const ol = $('top-list'); ol.replaceChildren();
    C.top.forEach((p, i) => {
      const li = el('li'); const mid = el('div');
      mid.append(el('div', null, [p.subject, p.type, p.sub].filter(Boolean).join(' · ')), el('div', 'd', `${p.outlet || '—'} · ${p.date ? dLabel(p.date) : '—'} · ${p.tier || ''}`));
      li.append(el('span', 'rk', String(i + 1)), mid, el('span', 'v', fmt(p.views))); ol.appendChild(li);
    });
  }

  // ---------- platforms ----------
  function renderPlatforms(M, ym) {
    const P = M.platforms; const t = $('plat-table'); t.replaceChildren();
    const hr = el('tr'); for (const x of ['Platform', 'View', 'Profile visit', 'Engagement', 'Follower baru', 'Hari data']) hr.appendChild(el('th', null, x));
    t.appendChild(el('thead')).appendChild(hr);
    const tb = t.appendChild(el('tbody'));
    for (const [k, n] of [['tiktok', 'TikTok'], ['facebook', 'Facebook'], ['instagram', 'Instagram'], ['all', 'Jumlah']]) {
      const p = P[k]; const tr = el('tr', k === 'all' ? 'total' : '');
      tr.append(el('td', null, n), el('td', null, fmt(p.view)), el('td', null, fmt(p.profile)), el('td', null, fmt(p.engagement)), el('td', null, fmt(p.newFollowers)), el('td', null, k === 'all' ? '' : String(p.days)));
      tb.appendChild(tr);
    }
    // stacked bars
    const box = $('plat-chart'); box.replaceChildren();
    const keys = Object.keys(D.months).sort().filter((k) => k <= ym);
    const ser = [['tiktok', 'TikTok', 'var(--s-tt)'], ['facebook', 'Facebook', 'var(--s-fb)'], ['instagram', 'Instagram', 'var(--s-ig)']];
    const W = Math.max(300, box.clientWidth || 600), H = 180, pl = 44, pb = 20, pt = 6;
    const max = Math.max(1, ...keys.map((k) => D.months[k].platforms.all.view)) * 1.05;
    const gap = (W - pl) / keys.length, bw = Math.min(46, gap * 0.62);
    const y = (v) => pt + (1 - v / max) * (H - pt - pb);
    const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%' });
    for (const g of [0, 0.5, 1]) {
      const v = (max / 1.05) * g;
      svg.appendChild(sv('line', { x1: pl, x2: W, y1: y(v), y2: y(v), stroke: 'var(--line)' }));
      const tx = sv('text', { x: pl - 6, y: y(v) + 4, 'text-anchor': 'end' }); tx.textContent = v >= 1e6 ? (v / 1e6).toFixed(1) + 'J' : fmt(v / 1000) + 'k'; svg.appendChild(tx);
    }
    keys.forEach((k, i) => {
      let acc = 0; const P2 = D.months[k].platforms; const x = pl + i * gap + (gap - bw) / 2;
      for (const [sk, sn, col] of ser) {
        const v = P2[sk].view; const r = sv('rect', { x, y: y(acc + v), width: bw, height: Math.max(0, y(acc) - y(acc + v)), fill: col, opacity: D.months[k].isCurrent ? 0.55 : 1 });
        bindTip(r, `${ymLabel(k)} · ${sn}: ${fmt(v)}`); svg.appendChild(r); acc += v;
      }
      const tx = sv('text', { x: x + bw / 2, y: H - 4, 'text-anchor': 'middle' }); tx.textContent = ymShort(k); svg.appendChild(tx);
    });
    box.appendChild(svg);
    const lg = el('div', 'legend');
    for (const [, n, c] of ser) { const s = el('span'); const i = el('i'); i.style.background = c; s.append(i, n); lg.appendChild(s); }
    box.appendChild(lg);
  }

  // ---------- outlets ----------
  function renderOutlets(M) {
    const t = $('outlet-table'); t.replaceChildren();
    const hr = el('tr'); for (const x of ['Outlet', 'Lead', 'Target', 'Capai', 'Walk-in', 'Target', 'Capai', 'Klik WA', 'Data terakhir']) hr.appendChild(el('th', null, x));
    t.appendChild(el('thead')).appendChild(hr);
    const tb = t.appendChild(el('tbody'));
    for (const o of D.outlets) {
      const r = M.outlets[o.key]; const tr = el('tr');
      const wa = M.linktree ? M.linktree.wa[o.key] : null;
      tr.append(
        el('td', null, r.name + (r.noRepair ? ' *' : '')),
        el('td', null, fmt(r.lead.total)), el('td', null, fmt(r.target.lead.total)), el('td', null, pct(r.lead.total / r.target.lead.total)),
        el('td', null, fmt(r.walkin.total)), el('td', null, fmt(r.target.walkin.total)), el('td', null, pct(r.walkin.total / r.target.walkin.total)),
        el('td', null, fmt(wa)), el('td', null, dLabel(r.lastDate)),
      );
      tb.appendChild(tr);
    }
  }

  load().then(init).catch((e) => { $('meta').textContent = 'Gagal muat data: ' + e.message; });
})();
