"""
Me'morAI Telegram Demo Bot - O'zbek Tili Matnlari
"""

# Asosiy salomlashish va til tanlash
WELCOME_CHOOSE_LANG = (
    "🇺🇿 **Assalomu alaykum! Me'morAI demo botiga xush kelibsiz.**\n"
    "🇷🇺 **Здравствуйте! Добро пожаловать в демо-бот Me'morAI.**\n\n"
    "Iltimos, muloqot tilini tanlang / Пожалуйста, выберите язык общения:"
)

START_MESSAGE = (
    "🏛 **Me'morAI — ShNQ va QMQ Avtomatik Ekspertiza Tizimi**\n\n"
    "O'zbekiston shaharsozlik normalari (ShNQ/QMQ) bo'yicha loyihalash xatolarini 30 soniyada aniqlang.\n\n"
    "🎁 **Sizda 1 ta BEPUL DEMO tekshiruv mavjud!**\n"
    "Quyidagi 4 ta asosiy tekshiruvdan birini tanlang va parametrlarni kiriting:"
)

MAIN_MENU_TITLE = "👇 **Tekshiruv turini tanlang:**"

# Tugmalar matnlari
BTN_RAMP_SLOPE = "📐 Pandus qiyaligi"
BTN_CEILING_HEIGHT = "📏 Shift balandligi"
BTN_PARKING_RATIO = "🚗 Avtoturargoh o'rinlari"
BTN_FIRE_ROAD = "🚒 Yong'in o'tish yo'li"
BTN_PRO_VERSION = "🚀 Me'morAI Pro (To'liq versiya)"
BTN_CONTACT = "📞 Mutaxassis bilan bog'lanish"
BTN_CANCEL = "❌ Bekor qilish"
BTN_CHANGE_LANG = "🌐 Tilni o'zgartirish"

# Demo so'rovlari
PROMPT_RAMP_RISE = (
    "📐 **Pandus qiyaligi tekshiruvi (1/2)**\n\n"
    "Pandusning **ko'tarilish balandligini** (rise) metrda kiriting.\n"
    "*(Masalan: `0.5` yoki `0.8`)*:"
)

PROMPT_RAMP_RUN = (
    "📐 **Pandus qiyaligi tekshiruvi (2/2)**\n\n"
    "Pandusning **gorizontal uzunligini** (run) metrda kiriting.\n"
    "*(Masalan: `6.0` yoki `10.0`)*:"
)

PROMPT_CEILING_HEIGHT = (
    "📏 **Shift balandligi tekshiruvi**\n\n"
    "Yashash xonasining **shift balandligini** metrda kiriting.\n"
    "*(Masalan: `2.8` yoki `3.0`)*:"
)

PROMPT_PARKING_SPOTS = (
    "🚗 **Avtoturargoh koeffitsienti (1/2)**\n\n"
    "Loyihalashtirilgan jami **avtoturargoh o'rinlari sonini** kiriting.\n"
    "*(Masalan: `40` yoki `60`)*:"
)

PROMPT_PARKING_APARTMENTS = (
    "🏢 **Avtoturargoh koeffitsienti (2/2)**\n\n"
    "Binodagi jami **xonadonlar sonini** kiriting.\n"
    "*(Masalan: `50` yoki `100`)*:"
)

PROMPT_FIRE_ROAD = (
    "🚒 **Yong'in o'chirish texnikasi yo'li**\n\n"
    "Bino atrofidagi yong'in o'chirish mashinalari o'tish yo'li **kengligini** metrda kiriting.\n"
    "*(Masalan: `6.0` yoki `5.5`)*:"
)

# Validatsiya xatoliklari
ERR_INVALID_NUMBER = "⚠️ Iltimos, faqat musbat son kiriting (masalan: `2.8` yoki `6`). Qayta urinib ko'ring:"
ERR_INVALID_INT = "⚠️ Iltimos, butun son kiriting (masalan: `50`). Qayta urinib ko'ring:"
ERR_ZERO_OR_NEGATIVE = "⚠️ Qiymat 0 dan katta bo'lishi shart! Qayta kiriting:"

# Demo limit tugaganligi
DEMO_LIMIT_REACHED = (
    "🔒 **Bepul demo imkoniyatingizdan foydalandingiz!**\n\n"
    "Siz 1 ta bepul tekshiruv huquqini ishlatib bo'ldingiz.\n\n"
    "To'liq arxitektura loyihasini (PDF, DWG chizmalar) 40+ QMQ/ShNQ normalari bo'yicha "
    "avtomatik tekshirish va rasmiy ekspertiza xulosasini olish uchun **Me'morAI Pro** versiyasiga o'ting!"
)

# Natija shablonlari
RESULT_PASS_HEADER = "✅ MUVOFIQ"
RESULT_FAIL_HEADER = "🔴 MUVAFFAQIYATSIZ"
RESULT_FAIL_NOTE = "Ekspertiza rad etilishiga olib keladi."
RESULT_PASS_NOTE = "Davlat ekspertizasi talablariga to'liq javob beradi."

# CTA matnlari
CTA_MESSAGE = (
    "━━━━━━━━━━━━━━━━━━\n"
    "🏢 **Me'morAI Pro imkoniyatlari:**\n"
    "• PDF/DWG chizmalarni 1 klikda to'liq tekshirish\n"
    "• 40+ ShNQ/QMQ moddalari bo'yicha tahlil\n"
    "• Davlat ekspertizasidan 100% o'tish kafolati\n"
    "• Qayta topshirish xarajatlarini 10 barobar qisqartirish\n\n"
    "👉 Hoziroq to'liq versiyani sinab ko'ring:"
)

ACTION_CANCELLED = "❌ Tekshirish bekor qilindi. Bosh menyuga qaytildi."
