#!/usr/bin/env node
// Tarik CSV dari 3 Google Sheets, sahkan, kira KPI level company, tulis data/dashboard.json.
// Guna:  node scripts/build-data.mjs
// Ujian tempatan: FIXTURES=fixtures.json node scripts/build-data.mjs   (peta "sheetKey:gid" -> fail CSV)

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SHEETS, OUTLETS, HQ_LINKTREE, LINKTREE_YEAR, START_MONTH, LABEL_DAYS, SUBJECT_TO_CATEGORY, STATUS,
} from './config.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CATS = ['phone', 'repair', 'cc'];
const warnings = [];
const warn = (area, msg) => warnings.push({ area, msg });

// ---------- input ----------
let fixtures = null;
if (process.env.FIXTURES) fixtures = JSON.parse(await readFile(process.env.FIXTURES, 'utf8'));

async function loadTab(sheetKey, gid) {
  if (fixtures) {
    const f = fixtures[`${sheetKey}:${gid}`];
    if (!f) throw new Error(`Fixture tiada untuk ${sheetKey}:${gid}`);
    return parseCsv(await readFile(resolve(dirname(process.env.FIXTURES), f), 'utf8'));
  }
  const url = `https://docs.google.com/spreadsheets/d/${SHEETS[sheetKey].id}/export?format=csv&gid=${gid}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { redirect: 'follow' });
    const text = await res.text();
    if (res.ok && !text.trimStart().startsWith('<')) return parseCsv(text);
    if (attempt === 3) {
      throw new Error(`Gagal baca ${sheetKey} gid ${gid} (HTTP ${res.status}). Pastikan sheet dikongsi "Anyone with the link: Viewer".`);
    }
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
}

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// ---------- helpers ----------
const norm = (s) => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
function num(v) {
  const s = String(v ?? '').trim();
  if (s === '' || /^n\/?a$/i.test(s) || s === '-' || s.startsWith('#')) return null;
  const n = Number(s.replace(/^RM/i, '').replace(/[,\s%]/g, ''));
  return Number.isFinite(n) ? n : null;
}
function date(v) {
  const m = String(v ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = +m[1], mo = +m[2], y = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
const monthOf = (iso) => iso.slice(0, 7);
const daysIn = (ym) => new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
const sum = (a) => a.reduce((s, x) => s + (x ?? 0), 0);
const round1 = (x) => Math.round(x * 10) / 10;
const ratio = (a, b) => (b ? a / b : null);
function todayKL() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
}
function monthsBetween(from, to) {
  const out = []; let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) { out.push(`${y}-${String(m).padStart(2, '0')}`); m++; if (m > 12) { m = 1; y++; } }
  return out;
}
const zeroCats = () => ({ phone: 0, repair: 0, cc: 0 });
const status = (actual, pace) => {
  if (!pace) return 'none';
  const r = actual / pace;
  return r >= STATUS.green ? 'green' : r >= STATUS.yellow ? 'yellow' : 'red';
};

// ---------- 1. master: lead & walk-in harian ----------
function parseMaster(rows, today) {
  const header = rows[0].map(norm);
  const idx = (name) => {
    const i = header.indexOf(norm(name));
    if (i < 0) throw new Error(`Kolum "${name}" tiada dalam masterFRONT. Nama header dah berubah?`);
    return i;
  };
  const plan = OUTLETS.map((o) => ({
    o,
    spans: o.columns.map((c) => ({
      from: c.from ?? '0000-00-00', until: c.until ?? '9999-99-99',
      lead: Object.fromEntries(CATS.map((k) => [k, idx(c.cols.lead[k])])),
      walkin: Object.fromEntries(CATS.map((k) => [k, idx(c.cols.walkin[k])])),
    })),
  }));
  const daily = {}; // date -> outlet -> {lead:{}, walkin:{}, blanks}
  for (const r of rows.slice(1)) {
    const d = date(r[0]);
    if (!d || d < `${START_MONTH}-01` || d > today) continue;
    for (const { o, spans } of plan) {
      const sp = spans.find((s) => d >= s.from && d <= s.until);
      if (!sp) continue;
      const rec = { lead: {}, walkin: {}, blanks: 0 };
      for (const t of ['lead', 'walkin']) for (const k of CATS) {
        const v = num(r[sp[t][k]]);
        if (v === null) rec.blanks++;
        rec[t][k] = v;
      }
      rec.filled = rec.blanks < 6;
      (daily[d] ??= {})[o.key] = rec;
    }
  }
  return daily;
}

// ---------- 2. insight platform harian ----------
function parseInsight(rows, map) {
  const header = rows[0].map(norm);
  const col = {};
  for (const [k, name] of Object.entries(map)) {
    const i = header.indexOf(norm(name));
    if (i < 0) throw new Error(`Kolum "${name}" tiada dalam tab insight.`);
    col[k] = i;
  }
  const out = {};
  for (const r of rows.slice(1)) {
    const d = date(r[0]);
    if (!d) continue;
    const rec = {};
    for (const k of Object.keys(col)) rec[k] = num(r[col[k]]);
    if (rec.view === null) continue;
    out[d] = rec;
  }
  return out;
}

// ---------- 3. linktree bulanan ----------
const MONTH_NAMES = { jan: 1, feb: 2, mac: 3, apr: 4, mei: 5, jun: 6, jul: 7, ogos: 8, ogs: 8, sept: 9, sep: 9, okt: 10, nov: 11, dec: 12, dis: 12 };
function parseLinktree(rows) {
  const head = rows[0];
  const colMonth = {};
  head.forEach((h, i) => { const m = MONTH_NAMES[norm(h)]; if (m && i > 0) colMonth[i] = `${LINKTREE_YEAR}-${String(m).padStart(2, '0')}`; });
  const byCode = {};
  rows.forEach((r, ri) => {
    const code = String(r[0] ?? '').trim().split(/\s+/)[0];
    if (!/^05[A-Z]+$/.test(code)) return;
    byCode[code] = { row: r, next: rows[ri + 1] };
  });
  const out = {};
  for (const [i, ym] of Object.entries(colMonth)) {
    const v = (code) => (byCode[code] ? num(byCode[code].row[i]) : null);
    const frac = (code) => {
      const s = byCode[code]?.next?.[i] ?? '';
      const m = String(s).match(/^\s*([\d,]+)\s*\/\s*([\d,]+)\s*$/);
      return m ? [num(m[1]), num(m[2])] : [null, null];
    };
    const [ltTotalView, ttProfile] = frac('05CTRLFP');
    const [uniqueClick] = frac('05CTRAFL');
    const rec = {
      uniqueView: v('05ULC'), totalView: ltTotalView, ttProfileVisit: ttProfile, uniqueClick,
      wa: Object.fromEntries(OUTLETS.map((o) => [o.key, v(o.linktree.wa)])),
      loc: Object.fromEntries(OUTLETS.map((o) => [o.key, v(o.linktree.loc)])),
      hq: { postage: v(HQ_LINKTREE.postage), buyback: v(HQ_LINKTREE.buyback) },
      telegram: v('05TG'),
    };
    const any = rec.uniqueView !== null || Object.values(rec.wa).some((x) => x !== null);
    if (any) out[ym] = rec;
  }
  return out;
}

// ---------- 4. log post content ----------
function parseContent(rows, ym) {
  const header = rows[0].map(norm);
  const stop = header.indexOf('') > 0 ? header.indexOf('') : header.length;
  const find = (n) => { const i = header.indexOf(n); return i >= 0 && i < stop ? i : -1; };
  const c = { date: find('tarikh'), outlet: find('outlet'), cat: find('kategori'), type: find('type'), sub: find('sub kategori'), view: find('view tiktok'), tier: find('tier') };
  if (c.cat < 0 || c.view < 0) throw new Error(`Tab content ${ym}: kolum KATEGORI / VIEW TIKTOK tiada.`);
  const posts = [];
  for (const r of rows.slice(1)) {
    const cat = String(r[c.cat] ?? '').trim();
    const rawDate = String(r[c.date] ?? '').trim();
    if (!cat || cat === '-' || !rawDate) continue;
    let outlet = String(r[c.outlet] ?? '').trim().toUpperCase();
    if (outlet === 'KUL') outlet = 'KLL';
    if (outlet === 'SP') outlet = 'SGP';
    posts.push({
      date: date(rawDate), outlet, subject: cat, category: SUBJECT_TO_CATEGORY[norm(cat)] ?? 'lain',
      type: c.type >= 0 ? String(r[c.type] ?? '').trim() || null : null,
      sub: c.sub >= 0 ? String(r[c.sub] ?? '').trim() : '',
      views: num(r[c.view]), tier: String(r[c.tier] ?? '').trim(),
    });
  }
  const badDates = posts.filter((p) => !p.date || monthOf(p.date) !== ym).length;
  if (badDates) warn('content', `${ym}: ${badDates} post bertarikh luar bulan tab (dikira dalam bulan tab).`);
  const noView = posts.filter((p) => p.views === null).length;
  if (noView) warn('content', `${ym}: ${noView} post tiada view.`);
  return posts;
}

// ---------- KPI ----------
function monthLeads(daily, ym, today) {
  const dim = daysIn(ym);
  const isCurrent = ym === monthOf(today);
  const days = Object.keys(daily).filter((d) => monthOf(d) === ym).sort();
  const outlets = {};
  // hari data terakhir company (mana-mana outlet). Pace semua outlet ikut tarikh ini,
  // supaya outlet yang belum isi data nampak ketinggalan, bukan hilang dari kiraan.
  const companyLast = days.filter((d) => Object.values(daily[d]).some((x) => x.filled)).pop() ?? null;
  const companyFrac = isCurrent ? (companyLast ? +companyLast.slice(8, 10) / dim : 0) : (companyLast ? 1 : 0);
  for (const o of OUTLETS) {
    const lead = zeroCats(), walkin = zeroCats();
    let filledDays = 0, blankCells = 0, lastDate = null;
    for (const d of days) {
      const rec = daily[d][o.key];
      if (!rec) continue;
      if (rec.filled) { filledDays++; lastDate = d; blankCells += rec.blanks; }
      for (const k of CATS) { lead[k] += rec.lead[k] ?? 0; walkin[k] += rec.walkin[k] ?? 0; }
    }
    const frac = companyFrac;
    const t = o.target;
    const tLead = sum(Object.values(t.lead)), tWalk = sum(Object.values(t.walkin));
    outlets[o.key] = {
      name: o.name, noRepair: !!o.noRepair, lastDate, filledDays, blankCells,
      lead: { ...lead, total: sum(Object.values(lead)) },
      walkin: { ...walkin, total: sum(Object.values(walkin)) },
      target: { lead: { ...t.lead, total: tLead }, walkin: { ...t.walkin, total: tWalk } },
      paceFrac: frac,
    };
    if (isCurrent && !lastDate && companyLast) warn('outlet', `${o.name}: belum ada data lead/walk-in bulan ini.`);
    if (isCurrent && lastDate && lastDate < today) {
      const gap = Math.round((new Date(today) - new Date(lastDate)) / 864e5);
      if (gap >= 2) warn('outlet', `${o.name}: data lead/walk-in terakhir diisi ${lastDate} (${gap} hari lepas).`);
    }
    if (!isCurrent && filledDays < dim - 6 && filledDays > 0) warn('outlet', `${ym} ${o.name}: cuma ${filledDays}/${dim} hari ada data.`);
  }
  // company = jumlah outlet
  const company = {};
  for (const t of ['lead', 'walkin']) {
    const actual = {}, target = {}, pace = {};
    for (const k of [...CATS, 'total']) {
      actual[k] = sum(OUTLETS.map((o) => outlets[o.key][t][k]));
      target[k] = sum(OUTLETS.map((o) => outlets[o.key].target[t][k]));
      pace[k] = round1(sum(OUTLETS.map((o) => outlets[o.key].target[t][k] * outlets[o.key].paceFrac)));
    }
    const last = OUTLETS.map((o) => outlets[o.key].lastDate).filter(Boolean).sort().pop() ?? null;
    const asOfDay = last ? +last.slice(8, 10) : 0;
    const remainingDays = isCurrent ? Math.max(0, dim - asOfDay) : 0;
    const metrics = {};
    for (const k of [...CATS, 'total']) {
      metrics[k] = {
        actual: actual[k], target: target[k], pace: pace[k],
        pct: ratio(actual[k], target[k]),
        paceRatio: ratio(actual[k], pace[k]),
        status: status(actual[k], pace[k]),
        dailyLabel: Math.round(target[k] / LABEL_DAYS),
        needPerDay: remainingDays ? round1(Math.max(0, target[k] - actual[k]) / remainingDays) : null,
        gap: target[k] - actual[k],
      };
    }
    company[t] = metrics;
  }
  // siri kumulatif harian company
  const series = [];
  let cl = 0, cw = 0;
  for (let d = 1; d <= dim; d++) {
    const iso = `${ym}-${String(d).padStart(2, '0')}`;
    const rec = daily[iso];
    let l = null, w = null;
    if (rec && Object.values(rec).some((x) => x.filled)) {
      l = sum(Object.values(rec).flatMap((x) => CATS.map((k) => x.lead[k])));
      w = sum(Object.values(rec).flatMap((x) => CATS.map((k) => x.walkin[k])));
      cl += l; cw += w;
    }
    series.push({ day: d, lead: l, walkin: w, cumLead: l === null ? null : cl, cumWalkin: w === null ? null : cw });
  }
  // isi null kumulatif dengan nilai terakhir hanya hingga hari terakhir berdata
  const lastIdx = series.map((s) => s.lead !== null).lastIndexOf(true);
  let pl = 0, pw = 0;
  series.forEach((s, i) => { if (s.cumLead !== null) { pl = s.cumLead; pw = s.cumWalkin; } else if (i <= lastIdx) { s.cumLead = pl; s.cumWalkin = pw; } });
  const pdgRepairLead = outlets.PDG ? outlets.PDG.lead.repair : 0;
  return { outlets, company, series, isCurrent, daysInMonth: dim, pdgRepairLead,
    asOf: OUTLETS.map((o) => outlets[o.key].lastDate).filter(Boolean).sort().pop() ?? null };
}

function monthPlatforms(ins, ym) {
  const pick = (src, keys) => {
    const days = Object.keys(src).filter((d) => monthOf(d) === ym);
    const o = { days: days.length };
    for (const k of keys) o[k] = sum(days.map((d) => src[d][k]));
    return o;
  };
  const tt = pick(ins.tiktok, ['view', 'profile', 'likes', 'shares', 'comments', 'web', 'newFollowers']);
  const fb = pick(ins.facebook, ['view', 'profile', 'engagement', 'newFollowers']);
  const ig = pick(ins.instagram, ['view', 'profile', 'engagement', 'newFollowers']);
  const plat = {
    tiktok: { days: tt.days, view: tt.view, profile: tt.profile, engagement: tt.likes + tt.shares + tt.comments, newFollowers: tt.newFollowers },
    facebook: fb, instagram: ig,
  };
  const all = { days: Math.max(tt.days, fb.days, ig.days) };
  for (const k of ['view', 'profile', 'engagement', 'newFollowers']) all[k] = sum(Object.values(plat).map((p) => p[k]));
  return { ...plat, all };
}

function monthContent(posts) {
  if (!posts) return null;
  const byCat = { phone: { posts: 0, views: 0 }, repair: { posts: 0, views: 0 }, cc: { posts: 0, views: 0 }, lain: { posts: 0, views: 0 } };
  const bySubject = {}, byType = {}, byOutlet = {};
  for (const p of posts) {
    const add = (obj, k) => { obj[k] ??= { posts: 0, views: 0 }; obj[k].posts++; obj[k].views += p.views ?? 0; };
    add(byCat, p.category); add(bySubject, p.subject); add(byOutlet, p.outlet || '—');
    if (p.type) add(byType, p.type);
  }
  const top = [...posts].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 5);
  return { posts: posts.length, views: sum(posts.map((p) => p.views)), byCat, bySubject, byType: Object.keys(byType).length ? byType : null, byOutlet, top };
}

// ---------- main ----------
const today = process.env.TODAY || todayKL();
const nowMonth = monthOf(today);

const master = await loadTab('master', SHEETS.master.tabs.masterFRONT);
const daily = parseMaster(master, today);

const ins = {
  tiktok: parseInsight(await loadTab('submit', SHEETS.submit.tabs.tiktok), {
    view: 'View', profile: 'Profile views', likes: 'Likes', shares: 'Shares', comments: 'Comments', web: 'Website clicks', newFollowers: 'New followers',
  }),
  facebook: parseInsight(await loadTab('submit', SHEETS.submit.tabs.facebook), { view: 'View', profile: 'Visit', engagement: 'Interactions', newFollowers: 'Follow' }),
  instagram: parseInsight(await loadTab('submit', SHEETS.submit.tabs.instagram), { view: 'View', profile: 'Visit', engagement: 'Interactions', newFollowers: 'Follow' }),
};
const linktree = parseLinktree(await loadTab('report', SHEETS.report.tabs.linktree));
const content = {};
for (const [ym, gid] of Object.entries(SHEETS.report.contentMonths)) {
  try { content[ym] = parseContent(await loadTab('report', gid), ym); }
  catch (e) { warn('content', e.message); }
}

const months = {};
for (const ym of monthsBetween(START_MONTH, nowMonth)) {
  const leads = monthLeads(daily, ym, today);
  const platforms = monthPlatforms(ins, ym);
  const lt = linktree[ym] ?? null;
  const cont = monthContent(content[ym]);
  if (!content[ym] && ym >= '2026-01') warn('content', `${ym}: tab content belum ditambah dalam config.`);
  const waOutlet = lt ? sum(Object.values(lt.wa)) : null;
  const locOutlet = lt ? sum(Object.values(lt.loc)) : null;
  const funnel = {
    views: platforms.all.view,
    profileVisits: platforms.all.profile,
    linktreeUniqueView: lt?.uniqueView ?? null,
    waOutlet, locOutlet,
    hqWa: lt ? { postage: lt.hq.postage, buyback: lt.hq.buyback, total: (lt.hq.postage ?? 0) + (lt.hq.buyback ?? 0) } : null,
    leads: leads.company.lead.total.actual,
    walkins: leads.company.walkin.total.actual,
    ctrProfileToLinktree: lt && lt.totalView && lt.ttProfileVisit ? lt.totalView / lt.ttProfileVisit : null,
    leadPerWaClick: lt && waOutlet ? leads.company.lead.total.actual / waOutlet : null,
    walkinPerLead: ratio(leads.company.walkin.total.actual, leads.company.lead.total.actual),
    linktreeComplete: !!lt,
  };
  if (!lt && ym >= '2026-03') warn('linktree', `${ym}: data Linktree belum diisi.`);
  months[ym] = { ...leads, platforms, linktree: lt, content: cont, funnel };
}

const out = {
  generatedAt: new Date().toISOString(),
  today, currentMonth: nowMonth,
  labelDays: LABEL_DAYS,
  outlets: OUTLETS.map((o) => ({ key: o.key, name: o.name, noRepair: !!o.noRepair })),
  months,
  warnings,
};
await mkdir(resolve(ROOT, 'data'), { recursive: true });
// Jangan tulis semula jika data sama (elak commit setiap jam tanpa perubahan)
try {
  const prev = JSON.parse(await readFile(resolve(ROOT, 'data/dashboard.json'), 'utf8'));
  const strip = (o) => JSON.stringify({ ...o, generatedAt: null });
  if (strip(prev) === strip(out)) { console.log('Data tiada perubahan.'); process.exit(0); }
} catch { /* tiada fail lama */ }
const json = JSON.stringify(out);
await writeFile(resolve(ROOT, 'data/dashboard.json'), json);
// juga sebagai .js supaya index.html boleh dibuka terus dari fail (tanpa server)
await writeFile(resolve(ROOT, 'data/dashboard.js'), `window.DASHBOARD_DATA=${json};\n`);
console.log(`OK ${Object.keys(months).length} bulan, ${warnings.length} amaran, ${(json.length / 1024).toFixed(0)} KB`);
for (const w of warnings) console.log(`  ! [${w.area}] ${w.msg}`);
