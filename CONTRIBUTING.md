# 🤝 Me'morAI Loyihasiga Hissa Qo'shish (Contributing Guide)

Me'morAI O'zbekiston arxitektorlari, muhandislari va IT mutaxassislari uchun ochiq standartlarga asoslangan me'yoriy ekspertiza platformasidir. Loyihaga yangi QMQ / ShNQ me'yorlarini qo'shish yoki kod sifatini oshirish bo'yicha hissa qo'shishingizni qutlaymiz!

---

## 📌 Qanday Qilib Hissa Qo'shish Mumkin?

1. **Yangi QMQ/ShNQ Qoidalarini Qo'shish:**
   - Yangi qoidalar `rules/qmq_rules_v1.json` fayliga kiritiladi.
   - Har bir qoidada rasmiy hujjat nomi (masalan, `ShNQ 2.07.02-22`), band raqami, tekshirish operatori (`<=`, `>=`, `==`), xatolik darajasi (`CRITICAL`, `WARNING`, `INFO`) va O'zbek hamda Rus tillaridagi xabarlar bo'lishi shart.
   - Yangi qoida uchun `rules/test_rules_engine.py` da unit test yozilishi majburiydir.

2. **Backend va CAD Parser:**
   - Python 3.12+ va FastAPI standartlariga rioya qiling.
   - Kod PEP 8 va zamonaviy Type Hints talablariga javob berishi kerak.
   - `python -m pytest rules/ tests/ -v` barcha 23+ testlarni 100% yashil o'tishi shart.

3. **Frontend va 3D Simulyatsiya:**
   - Next.js 15, React 19, Tailwind CSS va Three.js texnologiyalari.
   - 2026 Dark Neon & Clean Glassmorphism dizayn standartlariga amal qiling.

---

## 🚀 Git Ish Oqimi (Git Workflow)

1. Repozitoriyani fork qiling yoki yangi tarmoq (branch) oching:
   ```bash
   git checkout -b feat/add-seismic-soil-rules
   ```
2. O'zgarishlarni kiriting va testlarni tekshiring:
   ```bash
   python -m pytest rules/ tests/ -v
   ```
3. Conventional Commits standartida commit qiling:
   - `feat(rules): add ShNQ soil category compliance`
   - `fix(dxf): handle polyline bulge arcs`
   - `docs: update legal disclaimer in README`
4. Pull Request (PR) yuboring. CI testlari avtomatik ravishda tekshiruvdan o'tkazadi.
