# 🏛️ Me'morAI — O'zbekiston Qurilish Me'yorlari va Qoidalarini (QMQ / ShNQ) Avtomatlashtirilgan AI Ekspertiza Tizimi

<div align="center">

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Celery](https://img.shields.io/badge/Celery-5.4+-37814A?style=for-the-badge&logo=celery&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7.0-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Norms](https://img.shields.io/badge/Normativ-QMQ%20%7C%20ShNQ-blueviolet?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

<p align="center">
  <strong>Arxitektura va qurilish chizmalarini O'zbekiston shaharsozlik qonunlari bo'yicha soniyalar ichida tekshiruvchi avtonom tahliliy platforma.</strong>
</p>

</div>

---

## 📌 Loyiha Haqida (Project Overview)

**Me'morAI** — O'zbekiston Respublikasi Qurilish va uy-joy kommunal xo'jaligi vazirligi tomonidan tasdiqlangan rasmiy me'yoriy hujjatlar (**QMQ** — Qurilish Me'yorlari va Qoidalari hamda **ShNQ** — Shaharsozlik Me'yorlari va Qoidalari) asosida arxitektura chizmalari, loyihalar va parametrlarni avtomatik audit qiluvchi yuqori unumdorlikdagi tizim.

Tizim 2 qavatli gibrid arxitekturada ishlaydi:
1. **Multimodal AI Vision:** Chizmalardan (PDF, DWG, DXF, render) geometriya, eksplikatsiya, xonalar o'lchamlari va belgilarni ajratib oladi (extraction).
2. **Deterministic Rules Engine:** Barcha hisob-kitoblar, pandus qiyaliklari, shift balandliklari, yong'in o'tish yo'llari va seysmik zonalarni rasmiy formulalar bo'yicha 100% matematik aniqlikda tekshiradi (pass/fail).

---

## 🏗️ Arxitektura Sxemasi (System Architecture)

```
                    +------------------------------------+
                    |  Foydalanuvchi / Veb / Telegram    |
                    +-----------------+------------------+
                                      | (HTTPS / HTTP)
                                      v
                    +------------------------------------+
                    |        Nginx Reverse Proxy         |
                    |         (Port 80 / 443)            |
                    |    Gzip, Security, Static, SSL     |
                    +--------+------------------+--------+
                             |                  |
               /api/*        v                  v   /uploads/*
        +----------------------------+   +-------------------+
        |      FastAPI Backend       |   |  Volume Storage   |
        |   (Port 8000 / ASGI Pool)  |   |  (Blueprints/PDF) |
        +--------------+-------------+   +-------------------+
                       |
                       | Asinxron tahlil vazifalari
                       v
        +----------------------------+
        |        Redis Cache         | <----+
        |   (Broker & Result Store)  |      |
        +--------------+-------------+      |
                       |                    |
                       v                    | Natijalar
        +----------------------------+      |
        |    Celery Worker Pool      | -----+
        |  (Ko'p bosqichli tahlil)   |
        +--------------+-------------+
                       |
         +-------------+-------------+
         |                           |
         v                           v
+------------------+       +-------------------+
|  QMQ / ShNQ      |       |  Multimodal AI    |
|  Rules Engine    |       |  Vision Service   |
| (mc.uz formulalar|       | (Gemini 2.5 Flash)|
+--------+---------+       +---------+---------+
         |                           |
         +-------------+-------------+
                       v
         +---------------------------+
         |    Supabase PostgreSQL    |
         |  (Loyihalar, Audit, Log)  |
         +---------------------------+
```

---

## 🚀 Servislar (Docker Stack Components)

| Servis | Vazifasi | Texnologiya | Port / Konteyner |
| :--- | :--- | :--- | :--- |
| **`nginx`** | Reverse proxy, Gzip, SSL, xavfsizlik sarlavhalari | Nginx Alpine | `80:80`, `443:443` (`memore_nginx`) |
| **`api`** | Asosiy REST API, loyiha qabul qilish, eksport | FastAPI, Uvicorn, Python 3.12 | `8000:8000` (`memore_api`) |
| **`worker`** | Og'ir hisob-kitoblar va chizmalarni tahlil qilish | Celery, Python 3.12 | Konteyner ichida (`memore_worker`) |
| **`redis`** | Task broker, tezkor kesh va navbat tizimi | Redis 7 Alpine | `6379:6379` (`memore_redis`) |

---

## 📋 QMQ / ShNQ Qamrovi (Supported Normative Codes)

| Qoida KODI | Rasmiy Manba | Me'yoriy Talab | Dvigatel Holati |
| :--- | :--- | :--- | :--- |
| **`UZ-ACCESS-001`** | **ShNQ 2.07.02-22**, §17 | Pandus qiyaligi: maksimal **8.33% (1:12)** | ✅ Deterministic Pass/Fail |
| **`UZ-ACCESS-002`** | **ShNQ 2.07.02-22**, §17 | Pandus toza kengligi: minimal **1.0 metr** | ✅ Deterministic Pass/Fail |
| **`UZ-PARKING-001`** | **ShNQ 2.08.01-19** | Avtoturargoh o'rni: **kamida 1.0 ta / 1 xonadon** | ✅ Deterministic Pass/Fail |
| **`UZ-CEILING-001`** | **ShNQ 2.08.01-19**, 2.1-b. | Yangi turar-joy shift balandligi: min **2.70 m** | ✅ Deterministic Pass/Fail |
| **`UZ-FIRE-EVAC-001`** | **ShNQ 2.01.02-04**, 4-b. | Asosiy evakuatsiya eshigi eni: min **0.90 m** | ✅ Deterministic Pass/Fail |
| **`UZ-FIRE-001`** | **ShNQ 2.01.02-04**, §3.10 | O't o'chirish mashinasi yo'li: min **6.0 metr** | ✅ Deterministic Pass/Fail |
| **`UZ-SEISMIC-001`** | **KMK 2.01.03-19**, 1-ilova | Hudud seysmik balli (Toshkent 9, Buxoro 8...) | ✅ Seysmik Zona Bazasi |

---

## 🛠️ Tezkor Boshlash (Quick Start)

### 1. Repozitoriyani klonlash va papkaga kirish
```bash
cd D:\ALLProjects\memore-ai
```

### 2. Muhit sozlamalarini tayyorlash
```bash
cp .env.example .env
```
`.env` faylini oching va kerakli API kalitlarni kiriting (masalan, `GEMINI_API_KEY`, `SUPABASE_URL`, `DATABASE_URL`).

### 3. Docker Compose orqali ishga tushirish (Tavsiya etiladi)
```bash
docker compose up -d --build
```

Konteynerlar holatini tekshirish:
```bash
docker compose ps
```

Loglarni kuzatish:
```bash
docker compose logs -f api
```

### 4. Lokal ishlab chiqish muhiti (Docker-siz)
```bash
# Virtual muhit yaratish
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Bog'liqliklarni o'rnatish
pip install -r requirements.txt

# Qoidalar dvigateli testlarini ishga tushirish
python rules/test_rules_engine.py
# Yoki pytest orqali:
pytest rules/ -v
```

---

## 🌐 API Hujjatlari va Salomatlik Tekshiruvi

Tizim ishga tushgach, quyidagi havolalar faol bo'ladi:
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs) (yoki Nginx orqali [http://localhost/docs](http://localhost/docs))
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **API Salomatlik:** [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Nginx Salomatlik:** [http://localhost/nginx_health](http://localhost/nginx_health)

---

## 📁 Loyiha Strukturasi (Directory Tree)

```
D:\ALLProjects\memore-ai\
├── .env.example              # Muhit o'zgaruvchilari namunasi (maxfiy ma'lumotlarsiz)
├── .gitignore                # Git e'tiborsiz qoldiradigan fayllar (xavfsizlik kafolati)
├── Dockerfile                # Multi-stage Python 3.12 slim ishlab chiqarish imidji
├── docker-compose.yml        # Multi-container orkestratsiyasi (API, Celery, Redis, Nginx)
├── README.md                 # Loyiha bosh qo'llanmasi va arxitektura hujjati
├── requirements.txt          # Python bog'liqliklar ro'yxati
├── nginx/
│   └── nginx.conf            # Nginx reverse proxy, gzip va xavfsizlik konfiguratsiyasi
└── rules/
    ├── qmq_rules_v1.json     # QMQ/ShNQ rasmiy qoidalar bazasi (JSON formatida)
    ├── rules_engine.py       # Deterministic hisob-kitoblar va tekshiruv dvigateli
    └── test_rules_engine.py  # 20 ta to'liq qamrovli avtomatlashtirilgan testlar
```

---

## 🚢 Ishlab Chiqarish va Coolify-ga Deploy (Production Deployment)

Ushbu infratuzilma **Coolify (v4)** yoki har qanday Docker-ni qo'llab-quvvatlovchi VPS serveriga 1-klikda joylashtirish uchun optimallashtirilgan:
1. Coolify Dashboard-da yangi loyiha qo'shing (**Docker Compose** turi bo'yicha).
2. Git repozitoriyasini ulang.
3. `.env` o'zgaruvchilarini Coolify Environment bo'limiga kiriting.
4. **Deploy** tugmasini bosing. Nginx avtomatik ravishda SSL sertifikatlar va proksilashni o'z zimmasiga oladi.

---

## 🔒 Xavfsizlik va Maxfiylik Kafolati (Zero-Secret-Leakage)

- Hech qanday maxfiy kalit (API tokenlar, parollar) kod ichida hardcode qilinmagan.
- `.env` fayli `.gitignore` orqali to'liq qulflangan.
- Barcha konteynerlar xavfsiz **non-root user** (`appuser:appgroup`, UID/GID 1001) ostida ishlaydi.
- Nginx sarlavhalari orqali `clickjacking` va `MIME-sniffing` hujumlaridan himoyalangan.

---

<div align="center">
  <sub>Loyiha muallifi: <strong>Javohirbek Asqarov (Jasper)</strong> | Me'morAI muhandislik jamoasi</sub>
</div>
