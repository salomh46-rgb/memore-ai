# 🛡️ Security Policy — Me'morAI

Me'morAI O'zbekiston arxitektura va shaharsozlik ekspertizasi uchun ishlab chiqilgan bo'lib, davlat va tijorat obyektlarining loyiha-smeta hujjatlari, chizmalari va shaharsozlik ma'lumotlarining daxlsizligi va maxfiyligini birinchi o'ringa qo'yadi.

---

## 🔒 Qo'llab-quvvatlanadigan Versiyalar

| Versiya | Qo'llab-quvvatlash |
| :--- | :--- |
| `v1.2.x` |  Faol qo'llab-quvvatlanadi (Hozirgi) |
| `v1.0.x` |  Xavfsizlik yangilanishlari |
| `< v1.0` | ❌ Eskirgan |

---

## 🏢 Korporativ Ma'lumotlar Himoyasi va Mahalliylashtirish (Data Sovereignty)

1. **O'zbekiston Respublikasi Qonunchiligi:**
   - O'zbekiston Respublikasining "Shaxsiy ma'lumotlar to'g'risida"gi Qonuni (O'RQ-547) talablariga muvofiq, O'zbekiston fuqarolari va strategik davlat ob'ektlariga tegishli loyiha chizmalari mahalliy serverlarda saqlanishi kerak.
   - **Self-Hosted / On-Premise:** Me'morAI korxona va davlat muassasalari uchun 100% yopiq lokal tarmoqda (on-premise Docker/Kubernetes) ishlashga to'liq moslashtirilgan.

2. **Zero-Secret-Leakage Kafolati:**
   - Repozitoriyda hech qachon maxfiy API kalitlar, Telegram bot tokenlari yoki ma'lumotlar bazasi parollari saqlanmaydi.
   - Barcha kalitlar faqat `.env` (git e'tiboridan chetda) yoki server sirlar boshqaruvi (Coolify Secrets / HashiCorp Vault) orqali kiritiladi.

3. **Izolyatsiyalangan Multi-Tenancy:**
   - Har bir loyihachi tashkilot ma'lumotlari PostgreSQL Row Level Security (RLS) orqali to'liq izolyatsiya qilingan. Boshqa korxona loyihasini ko'rish texnik jihatdan imkonsiz.

---

## 🚨 Zaifliklar Haqida Xabar Berish (Reporting a Vulnerability)

Agar siz tizimda xavfsizlik zaifligini topsangiz:
- Iltimos, xatolikni ommaviy GitHub Issues orqali **ochmang**.
- To'g'ridan-to'g'ri loyiha xavfsizlik muhandisiga xabar bering:
  - **Email:** `security@memore.uz` yoki shaxsiy aloqa orqali
  - **Telegram:** `@jasper_ai`
- Barcha hisobotlar 24 soat ichida ko'rib chiqiladi va tanqidiy zaifliklar uchun 72 soat ichida xavfsizlik yamoqlari (security patches) chiqariladi.
