// KLIKI Marketing Dashboard — konfigurasi
// Tukar ID sheet / target di sini sahaja. Tiada formula KPI dalam UI.
(function (root) {
  const CONFIG = {
    sheets: {
      contentSubmit: '1NxItlmxUlk1P1VECvarYmWUPyYRh9Ltnd6KmDpNDOec',
      reportContent: '1Q9XMBK0qBmZw8BLQT5w0pA3OC7EMFQz_ascdT50dYWI',
      // Mirror lead/walk-in dari MASTER SHEET SALES OUTLET (masterFRONT): tarikh + blok lead/walk-in setiap outlet sahaja.
      // Sheet "KLIKI Lead Walk-in Mirror (untuk Dashboard)" tarik 31 kolum sahaja guna IMPORTRANGE (tiada angka RM).
      // Jangan letak ID MASTER SHEET asal di sini: repo & site ini public.
      // Set null untuk guna jumlah dari CONTENT SUBMIT (tiada pecahan Phone/Repair/CC).
      leadDetail: '1Go5p9o2PE3xHZOhVmg1PZZZYKrqY7INaFiQ-28frz-w',
    },

    // Tab dalam CONTENT SUBMIT (gid tetap, tak bergantung pada nama tab)
    tabs: {
      tiktok:      { gid: 1028511161, range: 'A1:N2000' },
      facebook:    { gid: 720744037,  range: 'A1:G2000' },
      instagram:   { gid: 1521425497, range: 'A1:G2000' },
      // Date, View, Watch Time (hrs), Impressions, CTR (%), New / Lost / Net Subscribers (export YouTube Studio ikut tarikh)
      youtube:     { gid: 905511001,  range: 'A1:H2000' },
      supply:      { gid: 1718034587, range: 'A1:M2000' },
      beforeAfter: { gid: 492157388,  range: 'A1:D2000' },
      customer:    { gid: 1092329235, range: 'A1:E2000' },
      leads:       { gid: 1140900486, range: 'A1:E2000' },
      walkin:      { gid: 1368944537, range: 'A1:E2000' },
    },

    // Tab per-post bulanan dalam REPORT CONTENT DATA. Kunci = 'YYYY-MM'.
    // Bulan baru yang belum ada di sini akan dicari ikut nama tab (lihat monthTabNames).
    monthTabs: {
      '2025-06': 1404785294, '2025-07': 854355235, '2025-08': 425431932,
      '2025-09': 1616211774, '2025-10': 383090373, '2025-11': 1873767867,
      '2025-12': 1106743618, '2026-01': 1534333079, '2026-02': 585300308,
      '2026-03': 187278717,  '2026-04': 1100269545, '2026-05': 927526074,
      '2026-06': 867166240,  '2026-07': 203561696, '2026-08': 935231988,
      '2026-09': 1258728480, '2026-10': 1591275774,
    },
    // Calon nama tab untuk bulan yang tiada gid (contoh NOV'26, DIS'26)
    monthTabNames: {
      1: ['JAN'], 2: ['FEB'], 3: ['MAC', 'MAR'], 4: ['APR', 'APRIL'], 5: ['MEI', 'MAY'],
      6: ['JUN'], 7: ['JUL'], 8: ['OGOS', 'OGS', 'AUG'], 9: ['SEPT', 'SEP'],
      10: ['OKT', 'OCT'], 11: ['NOV'], 12: ['DIS', 'DEC'],
    },

    linktree: { gid: 2026029153, range: 'A1:L40', year: 2026 },

    // Pecahan lead & walk-in (Phone / Repair / CC / Others) ikut nama header masterFRONT.
    // others = [lead, walk-in]: kolum AF:AM, diisi auto dari Outlet Tracker mulai 23/10/2026 (tiada target).
    // Kulim tutup sementara, staf pindah ke Kelang Lama mulai 20/08/2026: dikira satu kedai (kunci KUL).
    leadDetail: {
      gid: 0, range: 'A1:AM2100',
      outlets: {
        KUL: [
          { until: '2026-08-19', lead: ['kul LEAD PHONE', 'kul LEAD REPAIR', 'kul LEAD CC'], walkin: ['kul WALK IN PHONE', 'kul WALK IN REPAIR', 'kul WALK IN CC'] },
          { from: '2026-08-20', lead: ['kll PHONE LEAD', 'kll REPAIR LEAD', 'kll CC LEAD'], walkin: ['kll PHONE WALK IN PHONE', 'kll REPAIR WALK IN REPAIR', 'kll WALK IN CC'], others: ['kll LEAD OTHERS', 'kll WALK IN OTHERS'] },
        ],
        AOR: [{ lead: ['aor LEAD PHONE', 'aor LEAD REPAIR', 'aor LEAD CC'], walkin: ['aor WALK IN PHONE', 'aor WALK IN REPAIR', 'aor WALK IN CC'], others: ['aor LEAD OTHERS', 'aor WALK IN OTHERS'] }],
        SP: [{ lead: ['sgp LEAD PHONE', 'sgp LEAD REPAIR', 'sgp LEAD CC'], walkin: ['sgp WALK IN PHONE', 'sgp WALK IN REPAIR', 'sgp WALK IN CC'], others: ['sgp LEAD OTHERS', 'sgp WALK IN OTHERS'] }],
        PDG: [{ lead: ['pdg LEAD PHONE', 'pdg LEAD REPAIR', 'pdg LEAD CC'], walkin: ['pdg WALK IN PHONE', 'pdg WALK IN REPAIR', 'pdg WALK IN CC'], others: ['pdg LEAD OTHERS', 'pdg WALK IN OTHERS'] }],
      },
    },

    outlets: ['KUL', 'AOR', 'SP', 'PDG'],
    outletNames: { KUL: 'Kulim / Kelang Lama', AOR: 'Alor Setar', SP: 'Sg. Petani', PDG: 'Pendang', HQ: 'HQ', REPOST: 'Repost' },

    // Target rasmi bulanan (dimuktamadkan 5 Okt 2026)
    targets: {
      tiktokViews: 4000000,
      viewsPerPost: 3000000,
      likes: 150000,
      comments: 6000,
      shares: 8000,
      profileViews: 75000,
      newFollowers: 9000,
      netFollowersFloor: -3000,

      totalContent: 50,
      povCustomer: 25,
      strategic: 25,
      strategicType: { Educational: 10, Trend: 5, Review: 5, Promo: 5 },
      strategicSubject: { Buyback: 9, Repair: 8, 'Trade-in': 5, Phone: 3 },

      buckets: { iPhone: 1400000, Android: 400000, Repair: 60000, 'Trade-in / CC': 300000 },

      uniqueLinktree: 7000,
      ctrProfile: 17,
      ctrAction: 80,
      telegram: 1300,
      conversion: 40,

      // ===== Target lead & walk-in =====
      // Sumber: "WhatsApp Leads and Walk-in Required", Marketing reference Okt–Dis 2026 (PDF).
      // Kategori: phone / repair / cc. "cc" = CCTI Received dalam PDF. Pendang tiada repair.
      // Setiap bulan: [phone, repair, cc, total] ikut PDF. Angka company (seksyen 2 PDF) & total outlet
      // diambil terus dari PDF (bukan dijumlahkan semula) supaya sama dengan angka yang boss pegang.
      // Bulan yang tiada dalam `months` dan selepas `legacy.until` = "target belum ditetapkan".
      leadPlan: {
        // Hari outlet TUTUP (0 = Ahad … 3 = Rabu). Lead hari tutup dicatat hari bekerja berikutnya.
        // Kulim/Kelang Lama buka setiap hari.
        closedWeekdays: { KUL: [], AOR: [3], SP: [3], PDG: [3] },
        months: {
          '2026-10': {
            company: { lead: [1453, 816, 311, 2580], walkin: [436, 449, 118, 1003] },
            AOR: { lead: [349, 221, 93, 663], walkin: [105, 121, 35, 261] },
            SP:  { lead: [454, 287, 93, 835], walkin: [136, 158, 35, 330] },
            KUL: { lead: [488, 308, 93, 889], walkin: [146, 170, 35, 351] },
            PDG: { lead: [163, 0, 31, 194],   walkin: [49, 0, 12, 61] },
          },
          '2026-11': {
            company: { lead: [1254, 705, 311, 2270], walkin: [376, 387, 118, 882] },
            AOR: { lead: [301, 190, 93, 585], walkin: [90, 105, 35, 230] },
            SP:  { lead: [392, 248, 93, 733], walkin: [118, 136, 35, 289] },
            KUL: { lead: [421, 266, 93, 780], walkin: [126, 146, 35, 308] },
            PDG: { lead: [140, 0, 31, 171],   walkin: [42, 0, 12, 54] },
          },
          '2026-12': {
            company: { lead: [1562, 877, 311, 2751], walkin: [469, 483, 118, 1069] },
            AOR: { lead: [375, 237, 93, 705], walkin: [112, 130, 35, 278] },
            SP:  { lead: [488, 309, 93, 890], walkin: [146, 170, 35, 352] },
            KUL: { lead: [524, 331, 93, 949], walkin: [157, 182, 35, 375] },
            PDG: { lead: [175, 0, 31, 206],   walkin: [52, 0, 12, 64] },
          },
        },
        // Target lama (sebelum Okt 2026), dikekalkan untuk bulan sejarah sahaja.
        legacy: {
          until: '2026-09',
          KUL: { lead: [480, 210, 90, 780], walkin: [150, 180, 30, 360] },
          AOR: { lead: [480, 210, 90, 780], walkin: [150, 180, 30, 360] },
          SP:  { lead: [480, 210, 90, 780], walkin: [150, 180, 30, 360] },
          PDG: { lead: [480, 0, 90, 570],   walkin: [150, 0, 30, 180] },
        },
      },

      // Target lead/walk-in outlet TIDAK di sini lagi: lihat leadPlan di atas.
      outlet: {
        KUL: { rawPhone: 4, rawRepair: 2, customer: 52, beforeAfter: 26, wa: 1500, location: 300 },
        AOR: { rawPhone: 4, rawRepair: 2, customer: 52, beforeAfter: 26, wa: 1500, location: 300 },
        SP:  { rawPhone: 4, rawRepair: 2, customer: 52, beforeAfter: 26, wa: 1500, location: 300 },
        PDG: { rawPhone: 4, rawRepair: null, customer: 52, beforeAfter: null, wa: 1500, location: 300 },
      },
    },

    tiers: [
      { name: 'Diamond', min: 1000000 },
      { name: 'Gold', min: 300000 },
      { name: 'Silver', min: 100000 },
      { name: 'Bronze', min: 0 },
    ],
  };
  root.KLIKI_CONFIG = CONFIG;
  if (typeof module !== 'undefined') module.exports = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
