import React from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Scale, AlertOctagon, FileText } from "lucide-react";

export default function TermsOfServicePage() {
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
              <Scale size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
              Foydalanish Shartlari (Terms of Service)
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Kuchga kirish sanasi: 1-Oktyabr, 2026-yil • O'zbekiston Respublikasi Qonunchiligi asosida
          </p>
        </header>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed font-sans">
          {/* 1. Umumiy Qoidalar */}
          <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 space-y-2">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <FileText size={16} className="text-cyan-400" /> 1. Umumiy Qoidalar va Platforma Maqomi
            </h2>
            <p>
              1.1. Me'morAI — bu arxitektura va qurilish sohasida loyiha chizmalarini O'zbekiston Respublikasi shaharsozlik normalari va qoidalari (ShNQ / QMQ) asosida dasturiy parametrik tahlil qiluvchi muhandislik yordamchisi tizimidir.
            </p>
            <p>
              1.2. <strong>Muhim:</strong> Me'morAI platformasi mustaqil akkreditatsiyalangan davlat ekspertiza organi hisoblanmaydi va O'zbekiston Respublikasi Qurilish va uy-joy kommunal xo'jaligi vazirligi huzuridagi davlat shaharsozlik ekspertizasi xulosasining o'rnini bosmaydi.
            </p>
          </section>

          {/* 2. Javobgarlikni Cheklash (Limitation of Liability) */}
          <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 space-y-2">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <AlertOctagon size={16} className="text-amber-400" /> 2. Mas'uliyat va Javobgarlikning Cheklanishi (GIP / GAP Javobgarligi)
            </h2>
            <p>
              2.1. O'zbekiston Respublikasining <strong>Shaharsozlik Kodeksi 37-38 moddalari</strong>ga asosan, har qanday bino va inshootning konstruktiv mustahkamligi, seysmik xavfsizligi, yong'in choralari va yakuniy me'moriy yechimlari uchun to'liq yuridik, ma'muriy va jinoiy javobgarlik loyihani imzolagan <strong>Bosh loyiha muhandisi (GIP)</strong> va <strong>Bosh loyiha me'mori (GAP)</strong> zimmasida qoladi.
            </p>
            <p>
              2.2. Me'morAI tomonidan berilgan natijalar, hisob-kitoblar, 3D simulyatsiyalar va PDF ma'lumotnomalar faqatgina tavsiyaviy va konsultatsion xarakterga ega.
            </p>
            <p>
              2.3. Platforma asoschilari, ishlab chiquvchilari va hamkorlari platforma tavsiyalariga asoslanib amalga oshirilgan loyiha xatolari, qurilishdagi kechikishlar, ekspertiza rad javoblari yoki yuzaga kelishi mumkin bo'lgan moddiy/ma'naviy zararlar uchun moddiy yoki jinoiy javobgar bo'lmaydi.
            </p>
          </section>

          {/* 3. Davlat Siri va Maxfiy Obyektlar */}
          <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 space-y-2">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <ShieldCheck size={16} className="text-rose-400" /> 3. Maxfiy Obyektlar va Davlat Sirini Saqlash Majburiyati
            </h2>
            <p>
              3.1. Foydalanuvchi platformaga O'zbekiston Respublikasi «Davlat sirlarini saqlash to'g'risida»gi Qonuniga muvofiq davlat siri, harbiy ahamiyatga ega obyektlar yoki maxfiy toifadagi strategik inshootlar chizmalarini yuklash taqiqlanganligini to'liq tan oladi.
            </p>
            <p>
              3.2. Agar foydalanuvchi qonunga zid ravishda bunday ma'lumotlarni yuklasa, barcha huquqiy oqibatlar va qonuniy javobgarlik to'liq foydalanuvchining o'z zimmasiga tushadi.
            </p>
          </section>

          {/* 4. To'lovlar va Kafolatlar */}
          <section className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 space-y-2">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Scale size={16} className="text-cyan-400" /> 4. Moliyaviy Cheklov va Da'volar Chegarasi
            </h2>
            <p>
              4.1. Platformadan foydalanish bilan bog'liq har qanday huquqiy nizo yoki da'voda Me'morAI tomonidan to'lanishi mumkin bo'lgan maksimal moddiy tovon summasi foydalanuvchi tomonidan oxirgi 1 oy davomida to'langan obuna narxidan oshmasligi tomonlar o'rtasida qat'iy kelishiladi.
            </p>
          </section>
        </div>

        <footer className="border-t border-white/10 pt-6 text-center text-xs font-mono text-slate-500">
          © 2026 Me'morAI • Barcha huquqlar himoyalangan.
        </footer>
      </div>
    </main>
  );
}
