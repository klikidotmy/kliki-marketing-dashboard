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

    // Pecahan lead & walk-in (Phone / Repair / CC) ikut nama header masterFRONT.
    // Kulim tutup sementara, staf pindah ke Kelang Lama mulai 20/08/2026: dikira satu kedai (kunci KUL).
    leadDetail: {
      gid: 0, range: 'A1:AE2100',
      outlets: {
        KUL: [
          { until: '2026-08-19', lead: ['kul LEAD PHONE', 'kul LEAD REPAIR', 'kul LEAD CC'], walkin: ['kul WALK IN PHONE', 'kul WALK IN REPAIR', 'kul WALK IN CC'] },
          { from: '2026-08-20', lead: ['kll PHONE LEAD', 'kll REPAIR LEAD', 'kll CC LEAD'], walkin: ['kll PHONE WALK IN PHONE', 'kll REPAIR WALK IN REPAIR', 'kll WALK IN CC'] },
        ],
        AOR: [{ lead: ['aor LEAD PHONE', 'aor LEAD REPAIR', 'aor LEAD CC'], walkin: ['aor WALK IN PHONE', 'aor WALK IN REPAIR', 'aor WALK IN CC'] }],
        SP: [{ lead: ['sgp LEAD PHONE', 'sgp LEAD REPAIR', 'sgp LEAD CC'], walkin: ['sgp WALK IN PHONE', 'sgp WALK IN REPAIR', 'sgp WALK IN CC'] }],
        PDG: [{ lead: ['pdg LEAD PHONE', 'pdg LEAD REPAIR', 'pdg LEAD CC'], walkin: ['pdg WALK IN PHONE', 'pdg WALK IN REPAIR', 'pdg WALK IN CC'] }],
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

      // Target lead & walk-in SETIAP outlet ikut kategori. Target company = jumlah 4 outlet.
      // Pendang tiada servis repair. Target harian = bulanan ÷ 26 (label sahaja).
      leadCat: {
        KUL: { lead: { phone: 480, repair: 210, cc: 90 }, walkin: { phone: 150, repair: 180, cc: 30 } },
        AOR: { lead: { phone: 480, repair: 210, cc: 90 }, walkin: { phone: 150, repair: 180, cc: 30 } },
        SP:  { lead: { phone: 480, repair: 210, cc: 90 }, walkin: { phone: 150, repair: 180, cc: 30 } },
        PDG: { lead: { phone: 480, repair: 0,   cc: 90 }, walkin: { phone: 150, repair: 0,   cc: 30 } },
      },
      labelDays: 26,

      outlet: {
        KUL: { rawPhone: 4, rawRepair: 2, customer: 52, beforeAfter: 26, leads: 780, walkin: 360, wa: 1500, location: 300 },
        AOR: { rawPhone: 4, rawRepair: 2, customer: 52, beforeAfter: 26, leads: 780, walkin: 360, wa: 1500, location: 300 },
        SP:  { rawPhone: 4, rawRepair: 2, customer: 52, beforeAfter: 26, leads: 780, walkin: 360, wa: 1500, location: 300 },
        PDG: { rawPhone: 4, rawRepair: null, customer: 52, beforeAfter: null, leads: 570, walkin: 180, wa: 1500, location: 300 },
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
