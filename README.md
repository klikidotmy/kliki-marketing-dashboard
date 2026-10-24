# KLIKI Marketing Dashboard

Web app (PWA) untuk pantau prestasi marketing media sosial KLIKI. Data dibaca **terus dari Google Sheet** setiap kali app dibuka, jadi tiada data disimpan dalam repo ini.

## Sumber data

| Sheet | Tab | Digunakan untuk |
|---|---|---|
| CONTENT SUBMIT | Tiktok Insight, Facebook Insight, Instagram Insight | Views, engagement, followers harian |
| CONTENT SUBMIT | Supply Video V2, Customer, Before/After, Leads, Walk-in | KPI outlet |
| REPORT CONTENT DATA | Tab bulanan (JAN'26 … OKT'26) | Data per-post: content, bucket, outlet, tier |
| REPORT CONTENT DATA | LINKTREE | Klik WhatsApp, lokasi, Telegram, CTR (tahun 2026) |
| Mirror MASTER SHEET SALES OUTLET | masterFRONT (tarikh + blok lead/walk-in sahaja) | Lead & Walk-in company ikut Phone / Repair / Cash Converter |

### Lead & Walk-in company (Overview, paling atas)
- Target ikut brief **WhatsApp Leads and Walk-in Required, Okt–Dis 2026** (`targets.leadPlan` dalam `js/config.js`). Target berbeza setiap bulan dan setiap outlet. Kategori Phone / Repair / CC (CC = "CCTI Received" dalam brief). Pendang tiada repair.

  | Company | Okt | Nov | Dis |
  |---|---|---|---|
  | Lead (Phone / Repair / CC) | 2,580 (1,453 / 816 / 311) | 2,270 (1,254 / 705 / 311) | 2,751 (1,562 / 877 / 311) |
  | Walk-in | 1,003 (436 / 449 / 118) | 882 (376 / 387 / 118) | 1,069 (469 / 483 / 118) |

- Angka company & total outlet diambil terus dari brief (bukan dijumlahkan semula), jadi jumlah kategori outlet boleh beza 1 akibat pembundaran brief.
- **Hari operasi:** Alor Setar, Sg Petani, Pendang tutup Rabu; Kulim/Kelang Lama buka setiap hari (`leadPlan.closedWeekdays`). Lead hari tutup dicatat hari bekerja berikutnya.
- **Status on track** = actual ÷ jangkaan sehingga tarikh data terakhir, dengan jangkaan = jumlah (target outlet × hari operasi dah lepas ÷ hari operasi sebulan).
- **Harian** = target sehari pada hari biasa (semua outlet buka). **Perlu sehari** = jumlah baki setiap outlet ÷ baki hari operasi outlet itu. Purata kalendar brief (target ÷ hari sebulan) dipapar sebagai rujukan sahaja.
- Bulan sebelum Okt 2026 guna target lama (`leadPlan.legacy`: Lead 780 / Walk-in 360 per outlet, Pendang 570 / 180). Bulan selepas Dis 2026 tanpa entri dalam `leadPlan.months` = "target belum ditetapkan" (tiada status).
- Kulim & Kelang Lama dikira satu kedai: kolum `kul` sehingga 19/08/2026, `kll` mulai 20/08/2026.
- **Jumlah ikut target** = Phone + Repair + CC sahaja (cincin %, status, harian, perlu sehari, scorecard, outlet, trend, funnel). **Semua (incl. others)** = Phone + Repair + CC + Others, dipapar di hero Overview sebagai "Total lead" / "Total walk-in" tanpa target. Others (kolum AF:AM masterFRONT) diisi auto dari Outlet Tracker mulai 23/10/2026 dan tiada target sendiri. Blok OVERALL dalam masterFRONT tidak dibaca (formula Lead Repair tertinggal AOR).
- MASTER SHEET asal ada angka jualan RM, jadi app **tidak** baca terus. App baca sheet mirror *KLIKI Lead Walk-in Mirror (untuk Dashboard)* (`sheets.leadDetail` dalam `js/config.js`). Sejak 24/10/2026 sheet ini ialah master sendiri (bukan lagi IMPORTRANGE): tab `masterFRONT` = DATE + 30 kolum lead/walk-in (kul, aor, sgp, pdg, kll) + 8 kolum Others. Sehingga 22/10/2026 diisi manual; mulai 23/10/2026 diisi auto setiap 5 minit oleh `mirror.gs` (`syncLiveToDashboard`) dalam Apps Script *KLIKI Outlet Tracker API*. Formula asal disimpan dalam tab `_backup_formula`.
- Jika header kolum dalam master bertukar, kemaskini julat dalam formula mirror dan nama header dalam `leadDetail.outlets`. Jika `sheets.leadDetail` = null, jumlah lead/walk-in diambil dari tab Leads / Walk-in CONTENT SUBMIT (tiada pecahan kategori).

Semua sheet yang app baca (CONTENT SUBMIT, REPORT CONTENT DATA, mirror lead/walk-in) mesti dikongsi **"Anyone with the link → Viewer"** supaya app boleh baca.

## Tukar target / tambah tab bulan baru

Semua dalam `js/config.js`:
- `targets` — target rasmi bulanan. Target lead/walk-in bulan baru: tambah entri `'YYYY-MM'` dalam `targets.leadPlan.months` (format `[phone, repair, cc, total]`).
- `monthTabs` — `gid` tab per-post ikut bulan. Bulan yang tiada dalam senarai akan dicari ikut nama tab (contoh `NOV'26`, `DIS'26`) dan disahkan ikut tarikh dalam tab.

Semua formula KPI ada dalam `js/data.js`. `js/app.js` hanya paparan.

## Struktur tab (mesyuarat bulanan)

- **Overview: Company Marketing** (halaman utama): content output (Total / POV Customer / Strategic), Total Views, Total Engagement, Follower Growth merentas TikTok, Facebook, Instagram, WhatsApp Clicks & Leads, status KPI dan highlights. Tiada jadual outlet.
- **Content Performance**: output vs target, prestasi platform, trend views bulanan, top content, prestasi ikut TYPE / kategori / bucket, funnel TOFU-MOFU-BOFU (muncul automatik bila tab per-post ada lajur bernilai TOFU/MOFU/BOFU).
- **Marketing Analysis**: KPI capai / gagal / tiada data, perubahan vs bulan lepas, insights.
- **Funnel** ("Dari content ke kedai"): View content & Profile visit (TikTok + IG + FB) → Buka Linktree (unique) → Klik WhatsApp 4 outlet → Lead → Walk-in, dengan ratio setiap peringkat dan kotak Channel HQ (WA Online Postage, WA Buyback). Lebar bar tetap mengecil untuk visual, bukan ikut skala.
- **Outlet, Trend**: drill-down.

Peraturan data: sel kosong = tiada data (bukan 0). Views per-post (tab bulanan) tidak dicampur dengan views Insight akaun. Engagement FB/IG = lajur Interactions (tiada pecahan like/comment/share). Net follower hanya untuk TikTok (FB/IG tiada data unfollow).

## Pasang di phone

Buka URL GitHub Pages di phone:
- **iPhone (Safari):** Share → *Add to Home Screen*
- **Android (Chrome):** menu ⋮ → *Install app* / *Add to Home screen*

## Struktur

```
index.html            shell app
styles.css            gaya (Inter, biru KLIKI #1565FF / #0A2E8A, light/dark, sidebar navy)
js/config.js          ID sheet, gid tab, target
js/data.js            fetch CSV + parse + kira KPI
js/app.js             paparan 6 tab: Overview, Content, Analisis (mesyuarat bulanan) + Funnel, Outlet, Trend (drill-down)
sw.js                 service worker (buka laju, offline guna data terakhir)
manifest.webmanifest  maklumat app untuk "Add to Home Screen"
```
