# 🏛️ Me'morAI — O'zbekiston QMQ / ShNQ Qurilish Me'yorlarini AI va CAD Vektor Ekspertiza Tizimi

<div align="center">

![Python](https://img.shields.io/badge/Python-3.12%20%7C%203.14-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-WebGL%203D-black?style=for-the-badge&logo=threedotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-5.4+-37814A?style=for-the-badge&logo=celery&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7.0%20(Internal)-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Norms](https://img.shields.io/badge/Normativ-54%2B%20ShNQ%20%2F%20QMQ-blueviolet?style=for-the-badge)
[![CI Status](https://img.shields.io/badge/CI-Passing%20(23%2F23)-brightgreen?style=for-the-badge)](.github/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<p align="center">
  <strong>Arxitektura, muhandislik va shaharsozlik loyihalarini O'zbekiston qurilish standartlari (QMQ / ShNQ) bo'yicha soniyalar ichida audit qiluvchi, 3D seysmik simulyatsiyali va QR-kodli texnik ekspertiza xulosalarini generatsiya qiluvchi avtonom platforma.</strong>
</p>

</div>

---

## 📌 Loyiha Haqida (Overview)

**Me'morAI** — O'zbekiston Respublikasi Qurilish va uy-joy kommunal xo'jaligi vazirligi tomonidan tasdiqlangan rasmiy me'yoriy hujjatlar (**QMQ** va **ShNQ**) bo'yicha loyiha hujjatlarini avtomatlashtirilgan tarzda tekshiruvchi professional platformadir.

### 🔬 2 Qavatli Gibrid Tahlil Texnologiyasi:
1. **Kiruvchi Ma'lumotlar Ekstraksiyasi (Data Extraction Layer):**
   - **CAD DXF Vektor Parseri (`ezdxf`):** AutoCAD va ArchiCAD vektor chizmalaridan devorlar, o'lchamlar (`DIMENSION`), qatlamlar (`layers`) va matnlarni to'g'ridan-to'g'ri matematik aniqlikda o'qiydi.
   - **Multimodal AI Vision (Gemini Vision):** PDF formatidagi floor planlar va arxitektura chizmalaridagi eslatmalar, xonalar eksplikatsiyasi va o'lchamlarni avtomatik skanerlaydi (har bir ajratilgan qiymat uchun *Confidence Score* beriladi).
2. **Deterministik Me'yorlar Dvigateli (Deterministic Rules Engine):**
   - Hech qanday "AI taxmini"siz, tasdiqlangan 54+ ta shaharsozlik formulalari (pandus qiyaligi, shift balandligi, yong'in xavfsizligi, avtoturargoh koeffitsientlari, 7-9 ballik seysmik hududlar) bo'yicha qat'iy matematik solishtiruv (Pass / Fail / Warning) o'tkazadi.

---

## ⚖️ Yuridik Ogohlantirish (Legal Disclaimer)

> [!IMPORTANT]
> **Me'morAI** dasturiy ta'minoti arxitektorlar, loyiha institutlari va ekspertlarning ish unumdorligini oshirish, loyihalashdagi qo'pol xatoliklarni erta aniqlash va tekshiruv vaqtini 90% ga qisqartirish uchun mo'ljallangan **texnik yordamchi vositadir**.
> Tizim xulosalari O'zbekiston Respublikasi qonunchiligiga ko'ra litsenziyalangan bosh loyiha mutaxassisi (GIP/GAP) yoki vakolatli Davlat ekspertiza organining yakuniy xulosasini almashtirmaydi. Qurilish va montaj ishlariga ruxsat berish faqatgina sertifikatlangan inson-ekspert imzosi va vazirlik tasdig'i asosida amalga oshiriladi.

---

## 🏗️ Arxitektura Sxemasi (System Architecture)

```
                            +-------------------------------------------+
                            |       Mijoz / Veb / Telegram WebApp       |
                            +---------------------+---------------------+
                                                  | (HTTPS)
                                                  v
                            +-------------------------------------------+
                            |            Traefik / Nginx Proxy          |
                            |         SSL Let's Encrypt / Gzip          |
                            +----------+---------------------+----------+
                                       |                     |
                        /api/*         v                     v   Static / 3D Canvas
                +------------------------------+     +-----------------------------+
                |        FastAPI Backend       |     |      Next.js 15 Landing     |
                |   (Port 8000 / Python 3.12)  |     |     3D WebGL BIM Simulyator |
                +--------------+---------------+     +-----------------------------+
                               |
               +---------------+---------------+
               |                               |
               v                               v
+-------------------------------+  +-------------------------------+
|  ezdxf CAD Vektor Parser      |  |  Gemini Multimodal Vision     |
| (AutoCAD DXF Qatlamlar/O'lcham|  | (PDF va Rasm Rejalarni Scan)  |
+--------------+----------------+  +---------------+---------------+
               |                               |
               +---------------+---------------+
                               v
               +-------------------------------+
               |   QMQ / ShNQ Rules Engine     |
               |  (54 ta Deterministik Qoida)  |
               +---------------+---------------+
                               |
               +---------------+---------------+
               v                               v
+-------------------------------+  +-------------------------------+
|  📄 Muhrli PDF Hisobot        |  |   Supabase PostgreSQL         |
|  (QR-kodli sertifikat,        |  |  (RLS Ko'p-tenant izolyatsiya,|
|   ReportLab + QRCode)         |  |   Loyihalar va Audit jurnali) |
+-------------------------------+  +-------------------------------+
```

---

## 🏢 54+ Ta QMQ / ShNQ Me'yorlari Qamrovi (Normative Registry)

Tizim `rules/qmq_rules_v1.json` bazasida O'zbekistonning barcha asosiy shaharsozlik kodekslarini qamrab olgan:

| Normativ Hujjat | Soha / Yo'nalish | Qoidalar Soni | Misollar |
| :--- | :--- | :--- | :--- |
| **ShNQ 2.07.02-22** | Nogironlar va aholining kam harakatlanuvchi qatlamlari | 10 ta qoida | Pandus qiyaligi (≤8.33%), pandus eni (≥1.0m), kirish eshigi (≥0.9m), taktil yo'laklar |
| **ShNQ 2.08.01-19** | Turar-joy binolari loyihalash me'yorlari | 12 ta qoida | Shift balandligi (≥2.70m), oshxona maydoni (≥8.0m²), 1-xonali kvartira (≥28m²), izolyatsiya |
| **ShNQ 2.01.02-04** | Binolarning yong'in xavfsizligi | 12 ta qoida | O't o'chirish yo'li (≥6.0m), evakuatsiya zinapoyasi (≥1.20m), tutun chiqarish klapanlari |
| **KMK 2.01.03-19** | Seysmik hududlarda qurilish | 8 ta qoida | 7, 8, 9 ballik seysmik zonalar (Toshkent 9, Samarqand 8, Buxoro 8), deformatsion choklar |
| **ShNQ 2.07.01-03** | Shaharsozlik. Shahar va qishloq posyolkalarini rejalashtirish | 6 ta qoida | Avtoturargohlar me'yori (≥1.0/kvartira), obodonlashtirish va ko'kalamzorlashtirish (≥25%) |
| **ShNQ 2.08.02-09** | Jamoat binolari va inshootlari | 6 ta qoida | Umumiy yo'laklar kengligi (≥1.50m), shift balandligi (≥3.0m), vestibyul maydonlari |

---

## 📐 CAD (DXF) va Vision Imkoniyatlari

- **DXF Vector Extraction:** `.dxf` formatidagi chizmalar `ezdxf` kutubxonasi orqali bevosita vektor darajasida tekshiriladi. Devorlar, eshik o'lchamlari, yo'lak kengliklari va balandlik belgilari chizmaning asl koordinatalaridan olinadi (ishonchlilik darajasi 98%+).
- **DWG Fayllari:** DWG xususiy ikkilik format bo'lgani sababli, foydalanuvchiga uni AutoCAD yoki ArchiCAD'da DXF (AutoCAD 2018 DXF yoki R12/2000 DXF) formatida saqlab yuklash tavsiya etiladi.
- **Multimodal Floor Plan Extraction:** PDF va rasm chizmalar Gemini Vision multimodal neyrotarmog'i yordamida skanerlanadi.

---

## 🕹️ 3D WebGL BIM Seysmik Simulyator (Three.js)

Me'morAI interfeysi 2026-yilgi zamonaviy Dark Neon standartida qurilgan interaktiv 3D BIM dvigateliga ega:
- **3D Fazoviy Aylanish:** 360° orbital boshqaruv va masshtablash.
- **Dinamik Qatlamlar (Exploded View):** Konstruksiya yadrosi (Core), Ustunlar (Columns), Plitalar (Slabs) va Poydevor (Foundation) qatlamlarini ajratib ko'rish.
- **Seysmik Tebranish Simulyatsiyasi:** Statik holat, Shamol yuki va 7, 8, 9 ballik seysmik garmonik tebranish dinamikasi.
- **Stress Heatmap:** Konstruksiyadagi zo'riqish nuqtalarini rangli gradientda aks ettirish.
- **Real-Vaqt Telemetriya:** Maksimal og'ish (`Displacement mm`), Tebranish davri (`Period s`) va Poydevor o'q yuki (`Base Axial Load MN`).

---

## 📄 Texnik Ekspertiza PDF Hisoboti (QR-kodli)

Har bir tekshiruv yakunida tizim quyidagi elementlarga ega texnik ekspertiza PDF hisobotini tuzadi:
- **Raqamli QR-Kod:** Onlayn tekshirish va xulosa haqiqiyligini tasdiqlash uchun havola.
- **Raqamli Ekspert Muhr:** "Me'morAI O'zbekiston QMQ/ShNQ Nazorati — TASDIQLANDI / RAD ETILDI" muhri.
- **Qoidalar Reestri:** Har bir me'yorning ShNQ moddasi, loyihaning amaldagi qiymati, talab qilingan chegara va tavsiyalar.

---

## 📁 Loyiha Strukturasi (Repository Tree)

```
memore-ai/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI (23 ta test + xavfsizlik skaneri)
├── backend/                     # FastAPI REST API va tahlil xizmatlari
│   ├── main.py                  # API marshrutlari, CORS va lifespan
│   ├── config.py                # Pydantic-settings konfiguratsiyasi
│   ├── database.py              # Supabase va In-Memory do'koni
│   ├── schemas.py               # Pydantic v2 ma'lumotlar modellari
│   ├── tasks.py                 # Asinxron tahlil va Celery tasklari
│   ├── routers/                 # API endpointlari (/api/checks, /api/projects)
│   ├── services/
│   │   ├── dxf_parser.py        # CAD DXF vektorli chizma tahlilchisi (ezdxf)
│   │   ├── pdf_generator.py     # QR-kodli texnik ekspertiza PDF generatori
│   │   └── vision_analyzer.py   # Gemini Multimodal Vision chizma skaneri
│   └── requirements.txt         # Backend bog'liqliklari
├── landing/                     # Next.js 15 Web Workspace & Landing Page
│   ├── app/                     # App router (page.tsx, layout.tsx)
│   ├── components/
│   │   ├── ThreeBIMSimulation.tsx # 3D WebGL BIM Seysmik simulyatori
│   │   ├── WorkspaceApp.tsx     # Interaktiv tahlil va hisobot yuklash paneli
│   │   ├── RulesTable.tsx       # 54 ta me'yorlar interaktiv jadvali
│   │   └── Hero.tsx             # 2026 Dark Neon vitrina
│   └── package.json
├── rules/                       # O'zbekiston ShNQ / QMQ Deterministik Dvigateli
│   ├── qmq_rules_v1.json        # 54 ta to'liq shaharsozlik qoidalari bazasi
│   ├── rules_engine.py          # Dinamik qoidalar baholovchisi (Evaluator)
│   └── test_rules_engine.py     # 21 ta me'yoriy testlar to'plami
├── tests/                       # Tizimli unit va integratsiya testlari
│   └── test_dxf_parser.py       # DXF vektor ekstraksiyasi testlari
├── nginx/                       # Nginx reverse proxy va xavfsizlik konfiguratsiyasi
├── supabase/                    # PostgreSQL migratsiyalari va RLS qoidalari
├── telegram_bot/                # Aiogram 3 Telegram Mini App va Demo boti
├── docker-compose.yml           # Lokal va staging compose (Redis faqat 127.0.0.1)
├── docker-compose.prod.yml      # Production compose (Traefik SSL bilan)
├── Dockerfile                   # Multi-stage non-root Python 3.12 imidji
├── LICENSE                      # MIT License
├── SECURITY.md                  # Xavfsizlik va ma'lumotlar lokalizatsiyasi siyosati
├── CONTRIBUTING.md              # Loyihaga hissa qo'shish qo'llanmasi
└── README.md                    # Ushbu hujjat
```

---

## 🛠️ O'rnatish va Ishga Tushirish (Quick Start)

### 1. Repozitoriyani klonlash
```bash
git clone https://github.com/JavohirbekAsqarov/memore-ai.git
cd memore-ai
```

### 2. Muhit parametrlarini sozlash
```bash
cp .env.example .env
```
`.env` fayliga `GEMINI_API_KEY`, `SUPABASE_URL` va `SUPABASE_KEY` qiymatlarini kiriting.

### 3. Testlarni ishga tushirish (Local Verification)
```bash
# Barcha 23 ta testni (QMQ qoidalari va DXF parser) tekshirish:
python -m pytest rules/ tests/ -v
```

### 4. Docker Compose orqali ishga tushirish
```bash
docker compose up -d --build
```

---

## 🔒 Xavfsizlik va Server Konfiguratsiyasi

- **Redis Himoyasi:** Redis faqat ichki Docker tarmog'ida ishlaydi, tashqi dunyoga ochiq port berilmagan (`127.0.0.1:${REDIS_PORT:-6379}:6379`) va `--requirepass` bilan himoyalangan.
- **Zero-Secret-Leakage:** Barcha maxfiy kalitlar `.gitignore` qilingan va CI paytida avtomatik skanerlanadi.
- **Non-Root Containers:** Backend va Nginx xavfsiz cheklangan huquqli foydalanuvchilar (`appuser:1001`) ostida ishlaydi.

---

## 📄 Litsenziya (License)

Loyiha [MIT Litsenziyasi](LICENSE) asosida ochiq va tijoriy foydalanish uchun taqdim etiladi.

<div align="center">
  <sub>Muallif: <strong>Javohirbek Asqarov (Jasper)</strong> | Me'morAI — Kelajak Shaharsozligi AI Tizimi</sub>
</div>
