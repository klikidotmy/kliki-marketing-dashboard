# KLIKI Marketing Dashboard

Dashboard level company untuk pantau sama ada content marketing menolak **Lead** dan **Walk-in** ke arah target.

`Content (TikTok + FB + IG) → Profile visit → Linktree → Klik WhatsApp / Lokasi → Lead → Walk-in`

## Cara ia berfungsi

```
Google Sheets (sumber kebenaran)
  ├─ MASTER SHEET SALES OUTLET / masterFRONT   lead & walk-in harian (staf outlet)
  ├─ CONTENT SUBMIT / Tiktok, Facebook, Instagram Insight   insight harian
  └─ REPORT CONTENT DATA / LINKTREE + tab bulanan (SEPT'26, OKT'26 …)
        │
        ▼  GitHub Action setiap jam  →  scripts/build-data.mjs
data/dashboard.json   (semua KPI dah dikira di sini)
        │
        ▼
index.html + assets/app.js   (paparan sahaja, tiada formula KPI)
```

## Peraturan kiraan

| Perkara | Peraturan |
|---|---|
| Target outlet | Lead 780 (Phone 480 / Repair 210 / CC 90), Walk-in 360 (150 / 180 / 30) |
| Pendang | Tiada repair: Lead 570, Walk-in 180 |
| Target company | Jumlah 4 outlet: Lead **2,910**, Walk-in **1,260** |
| Kulim / Kelang Lama | Satu kedai. Kolum `kul` sehingga 19/08/2026, `kll` mulai 20/08/2026. Linktree baris "Kulim". |
| Jumlah | Dikira dari Phone + Repair + CC. Blok OVERALL dalam masterFRONT **tidak** dibaca (formula Lead Repair tertinggal AOR). Kolum HQ CC **tidak** dibaca (cuma jumlah CC outlet). |
| Pace | Target × (hari data terakhir company ÷ hari dalam bulan). Outlet yang lewat isi data akan nampak ketinggalan. |
| Status | ≥100% pace hijau, 85–99% kuning, <85% merah |
| Target harian | Target bulanan ÷ 26, bundar biasa (label sahaja) |
| Content → kategori | Phone → Phone, Repair → Repair, Trade-in + Buyback → CC |
| Saluran HQ | Klik WA Online Postage + Buyback. Dipapar berasingan sebab HQ tiada rekod lead. |
| Reach | Tidak dijumlahkan (reach harian bertindih) |

Semua nilai ini dalam `scripts/config.mjs`.

## Setup sekali sahaja

1. **Kongsi sheet.** Ketiga-tiga Google Sheet mesti "Anyone with the link: Viewer". GitHub Action tak boleh login Google.
2. **Hidupkan GitHub Pages:** Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`.
3. **Hidupkan Action:** tab Actions → *Kemas kini data* → *Run workflow* sekali untuk tarik data live pertama.

## Bila buka tab bulan baru (contoh NOV'26)

Buka `scripts/config.mjs`, tambah satu baris dalam `contentMonths`:

```js
'2026-11': 123456789, // NOV'26  ← nombor selepas #gid= dalam URL tab
```

Jika nama header dalam masterFRONT berubah, Action akan gagal dengan mesej yang sebut kolum mana. Betulkan nama dalam `OUTLETS` di `config.mjs`.

## Jalankan sendiri

```bash
node scripts/build-data.mjs        # tarik data live (perlu internet)
python3 -m http.server 8000        # buka http://localhost:8000
```

`index.html` juga boleh dibuka terus dari fail (guna `data/dashboard.js`).

## Had yang perlu tahu

- Klik WhatsApp ≠ mesej dihantar, dan lead outlet datang dari semua sumber. Nisbah klik → lead ialah petunjuk, bukan conversion sebenar. Untuk buktikan impak marketing, outlet perlu rekod **sumber lead**.
- Linktree diisi bulanan, jadi bahagian funnel Linktree tiada data harian.
- Repo awam = dashboard awam. Data yang keluar cuma lead, walk-in dan content (tiada angka jualan RM).
