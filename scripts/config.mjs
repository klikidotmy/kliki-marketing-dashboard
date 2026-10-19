// KLIKI Marketing Dashboard — konfigurasi
// Semua sumber data, target dan peraturan kiraan duduk di sini.
// UI tidak mengira KPI; ia hanya memaparkan data/dashboard.json.

export const SHEETS = {
  // MASTER SHEET SALES OUTLET — lead & walk-in yang staff outlet isi
  master: {
    id: '1QlxAVRWLfpIrqMTXgOIGFFlstOjEAE4zkpCTMBVBoaY',
    tabs: { masterFRONT: 337258795 },
  },
  // CONTENT SUBMIT — insight harian setiap platform
  submit: {
    id: '1NxItlmxUlk1P1VECvarYmWUPyYRh9Ltnd6KmDpNDOec',
    tabs: { tiktok: 1028511161, facebook: 720744037, instagram: 1521425497 },
  },
  // REPORT CONTENT DATA — Linktree (bulanan) + log post TikTok (satu tab sebulan)
  report: {
    id: '1Q9XMBK0qBmZw8BLQT5w0pA3OC7EMFQz_ascdT50dYWI',
    tabs: { linktree: 2026029153 },
    // Bila buka tab bulan baru (contoh NOV'26), tambah satu baris di sini: 'YYYY-MM': gid
    // gid = nombor selepas "#gid=" dalam URL tab tersebut.
    contentMonths: {
      '2026-01': 1534333079, // JAN'26
      '2026-02': 585300308,  // FEB'26
      '2026-03': 187278717,  // MAC'26
      '2026-04': 1100269545, // APR'26
      '2026-05': 927526074,  // MEI'26
      '2026-06': 867166240,  // JUN'26
      '2026-07': 203561696,  // JUL'26
      '2026-08': 935231988,  // OGOS'26
      '2026-09': 1258728480, // SEPT'26
      '2026-10': 1591275774, // OKT'26
    },
  },
};

// Tab LINKTREE tiada tahun pada header (MAC..DEC). Tahun ini dipakai.
export const LINKTREE_YEAR = 2026;

// Dashboard mula dari bulan ini
export const START_MONTH = '2026-01';

// Target bulanan rasmi setiap outlet. Target company = jumlah semua outlet.
const STD = { lead: { phone: 480, repair: 210, cc: 90 }, walkin: { phone: 150, repair: 180, cc: 30 } };
const NO_REPAIR = { lead: { phone: 480, repair: 0, cc: 90 }, walkin: { phone: 150, repair: 0, cc: 30 } };

// Label target harian = bulanan ÷ 26, bundar biasa (paparan sahaja)
export const LABEL_DAYS = 26;

// Kulim tutup sementara, staf pindah ke Kelang Lama dari 20/08/2026.
// Dikira sebagai satu kedai: kolum `kul` sebelum tarikh ini, `kll` mulai tarikh ini.
export const KUL_TO_KLL_DATE = '2026-08-20';

const block = (p, names) => ({
  lead: { phone: `${p} ${names[0]}`, repair: `${p} ${names[1]}`, cc: `${p} ${names[2]}` },
  walkin: { phone: `${p} ${names[3]}`, repair: `${p} ${names[4]}`, cc: `${p} ${names[5]}` },
});
const OLD = ['LEAD PHONE', 'LEAD REPAIR', 'LEAD CC', 'WALK IN PHONE', 'WALK IN REPAIR', 'WALK IN CC'];

export const OUTLETS = [
  {
    key: 'KLL', name: 'Kulim / Kelang Lama', target: STD,
    // Linktree masih guna baris "Kulim"
    linktree: { wa: '05WKLM', loc: '05LKLM' },
    columns: [
      { until: '2026-08-19', cols: block('kul', OLD) },
      { from: '2026-08-20', cols: block('kll', ['PHONE LEAD', 'REPAIR LEAD', 'CC LEAD', 'PHONE WALK IN PHONE', 'REPAIR WALK IN REPAIR', 'WALK IN CC']) },
    ],
  },
  { key: 'AOR', name: 'Alor Setar', target: STD, linktree: { wa: '05WAOR', loc: '05LAOR' }, columns: [{ cols: block('aor', OLD) }] },
  { key: 'SGP', name: 'Sungai Petani', target: STD, linktree: { wa: '05WASP', loc: '05LSP' }, columns: [{ cols: block('sgp', OLD) }] },
  { key: 'PDG', name: 'Pendang', target: NO_REPAIR, noRepair: true, linktree: { wa: '05WAPDG', loc: '05LPDG' }, columns: [{ cols: block('pdg', OLD) }] },
];

// Saluran HQ (tiada rekod lead) — dipapar berasingan
export const HQ_LINKTREE = { postage: '05WAPOS', buyback: '05WABB' };

// Padanan subjek content -> kategori lead
export const SUBJECT_TO_CATEGORY = { 'phone': 'phone', 'repair': 'repair', 'trade-in': 'cc', 'buyback': 'cc' };

// Status pace
export const STATUS = { green: 1.0, yellow: 0.85 };
