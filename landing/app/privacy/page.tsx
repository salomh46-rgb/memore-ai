import React from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Database, EyeOff, Server } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#030712] text-slate-200 py-16 px-4 sm:px-6 lg:px-8 font-sans selection:bg-cyan-500 selection:text-black">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft size={14} /> Asosiy sahifaga qaytish
        </Link>

        <header className="border-b border-white/10 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Lock size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
              Maxfiylik Siyosati (Privacy Policy)
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Chizmalar xavfsizligi va shaxsiy ma'lumotlar muhofazasi • 2026-yil
          </p>
        </header>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-sans">
          {/* 1. Ma'lumotlarni Yig'ish va Maqsadi */}
          <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 space-y-2">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Database size={16} className="text-cyan-400" /> 1. Chizmalar va Yuklangan Ma'lumotlar
            </h2>
            <p>
              1.1. Me'morAI foydalanuvchilar tomonidan yuklangan arxitektura chizmalari (PDF, DXF) va kiritilgan bino parametrlarini faqat va faqat ShNQ/QMQ qoidalari bo'yicha hisob-kitob qilish hamda PDF ma'lumotnoma generatsiya qilish maqsadida qayta ishlaydi.
            </p>
            <p>
              1.2. Foydalanuvchi chizmalari yoki loyiha ma'lumotlari uchinchi tomon tijorat tashkilotlariga berilmaydi yoki ochiq tarmoqqa chiqarilmaydi.
            </p>
          </section>

          {/* 2. AI Modellar va Maxfiylik */}
          <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 space-y-2">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <EyeOff size={16} className="text-cyan-400" /> 2. Neyron Tarmoqlar (AI Vision) bilan Ishlash
            </h2>
            <p>
              2.1. Chizmalardan geometrik parametrlarni ajratish Google Gemini API korporativ xavfsiz shifrlangan kanali (TLS 1.3) orqali amalga oshiriladi.
            </p>
            <p>
              2.2. Google GenAI xizmat ko'rsatish shartlariga binoan, API orqali yuborilgan chizmalar umumiy modellarni qayta o'qitish (training) uchun ishlatilmaydi.
            </p>
          </section>

          {/* 3. Saqlash va O'chirish */}
          <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 space-y-2">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Server size={16} className="text-cyan-400" /> 3. Ma'lumotlarni Saqlash va O'chirish
            </h2>
            <p>
              3.1. Yuklangan vaqtinchalik chizma fayllari tahlil yakunlangach, xavfsizlik maqsadida avtomatik tarzda tozalanishi mumkin.
            </p>
            <p>
              3.2. Foydalanuvchi o'z tashkilotiga tegishli loyihalar va audit hisobotlarini istalgan vaqtda o'chirib tashlash huquqiga ega.
            </p>
          </section>
        </div>

        <footer className="border-t border-white/10 pt-6 text-center text-xs font-mono text-slate-500">
          © 2026 Me'morAI • Maxfiylik va Axborot Xavfsizligi Standarti
        </footer>
      </div>
    </main>
  );
}
