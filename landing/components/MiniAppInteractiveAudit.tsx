"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, Zap } from "lucide-react";

export default function MiniAppInteractiveAudit() {
  const [activeTab, setActiveTab] = useState<"ramp" | "ceiling" | "parking" | "fire">("ramp");

  // Ramp state
  const [rampRise, setRampRise] = useState<number>(0.5);
  const [rampRun, setRampRun] = useState<number>(6.0);

  // Ceiling state
  const [ceilingHeight, setCeilingHeight] = useState<number>(2.75);

  // Parking state
  const [apartments, setApartments] = useState<number>(48);
  const [parkingSpots, setParkingSpots] = useState<number>(50);

  // Fire road state
  const [fireRoadWidth, setFireRoadWidth] = useState<number>(6.5);

  // Ramp calculation: 1:12 = 8.33%
  const rampSlope = rampRun > 0 ? (rampRise / rampRun) * 100 : 0;
  const isRampPass = rampSlope <= 8.33;

  // Ceiling calculation: min 2.70m for new
  const isCeilingPass = ceilingHeight >= 2.70;

  // Parking calculation: min 1.0 spot per apartment
  const parkingRatio = apartments > 0 ? parkingSpots / apartments : 0;
  const isParkingPass = parkingRatio >= 1.0;

  // Fire road calculation: min 6.0m
  const isFireRoadPass = fireRoadWidth >= 6.0;

  const triggerHaptic = (success: boolean) => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred(success ? "success" : "error");
    }
  };

  return (
    <section className="w-full max-w-4xl mx-auto px-4 py-8" id="live-demo">
      <div className="bg-[#0b1329]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 sm:p-7 shadow-[0_0_40px_rgba(79,142,247,0.15)]">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#4F8EF7]/20 text-[#4F8EF7]">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Jonli QMQ / ShNQ Tekshiruvi</h2>
              <p className="text-xs text-slate-400">Telegram Mini App ichida tezkor ekspertiza</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            mc.uz rasmiy qoidalari
          </span>
        </div>

        {/* Tab buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          <button
            onClick={() => { setActiveTab("ramp"); triggerHaptic(true); }}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === "ramp"
                ? "bg-[#4F8EF7] text-white shadow-lg shadow-[#4F8EF7]/30"
                : "bg-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            ♿ Pandus qiyaligi
          </button>
          <button
            onClick={() => { setActiveTab("ceiling"); triggerHaptic(true); }}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === "ceiling"
                ? "bg-[#4F8EF7] text-white shadow-lg shadow-[#4F8EF7]/30"
                : "bg-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            📏 Shift balandligi
          </button>
          <button
            onClick={() => { setActiveTab("parking"); triggerHaptic(true); }}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === "parking"
                ? "bg-[#4F8EF7] text-white shadow-lg shadow-[#4F8EF7]/30"
                : "bg-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            🚗 Avtoturargoh
          </button>
          <button
            onClick={() => { setActiveTab("fire"); triggerHaptic(true); }}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              activeTab === "fire"
                ? "bg-[#4F8EF7] text-white shadow-lg shadow-[#4F8EF7]/30"
                : "bg-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            🚒 Yong'in yo'li
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-black/30 border border-white/5 rounded-xl p-4 sm:p-5">
          {activeTab === "ramp" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Ko'tarilish balandligi (H, metr):
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    value={rampRise}
                    onChange={(e) => setRampRise(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4F8EF7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Bo'ylama uzunlik (L, metr):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={rampRun}
                    onChange={(e) => setRampRun(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4F8EF7]"
                  />
                </div>
              </div>

              <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                isRampPass ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200" : "bg-rose-950/30 border-rose-500/30 text-rose-200"
              }`}>
                {isRampPass ? <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={20} /> : <XCircle className="text-rose-400 shrink-0 mt-0.5" size={20} />}
                <div className="text-xs sm:text-sm">
                  <div className="font-bold flex items-center gap-2">
                    <span>{isRampPass ? "✅ MUVOFIQ (Ekspertizadan o'tadi)" : "🔴 MUVAFFAQIYATSIZ (Rad etiladi)"}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-slate-300">ShNQ 2.07.02-22, §17</span>
                  </div>
                  <p className="mt-1 text-slate-300">
                    Sizning pandusingiz qiyaligi: <strong>{rampSlope.toFixed(2)}%</strong> (Me'yor: ≤ <strong>8.33%</strong> ya'ni 1:12).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "ceiling" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Xona pol-shift balandligi (metr):
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="2.0"
                  max="5.0"
                  value={ceilingHeight}
                  onChange={(e) => setCeilingHeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4F8EF7]"
                />
              </div>

              <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                isCeilingPass ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200" : "bg-rose-950/30 border-rose-500/30 text-rose-200"
              }`}>
                {isCeilingPass ? <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={20} /> : <XCircle className="text-rose-400 shrink-0 mt-0.5" size={20} />}
                <div className="text-xs sm:text-sm">
                  <div className="font-bold flex items-center gap-2">
                    <span>{isCeilingPass ? "✅ MUVOFIQ" : "🔴 MUVAFFAQIYATSIZ"}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-slate-300">ShNQ 2.08.01-19</span>
                  </div>
                  <p className="mt-1 text-slate-300">
                    Shift balandligi: <strong>{ceilingHeight.toFixed(2)}m</strong> (Yangi turar-joylarda minimal me'yor: <strong>2.70m</strong>).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "parking" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Jami xonadonlar soni:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={apartments}
                    onChange={(e) => setApartments(parseInt(e.target.value) || 1)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4F8EF7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Loyiha bo'yicha parkovka o'rinlari:
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={parkingSpots}
                    onChange={(e) => setParkingSpots(parseInt(e.target.value) || 0)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4F8EF7]"
                  />
                </div>
              </div>

              <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                isParkingPass ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200" : "bg-rose-950/30 border-rose-500/30 text-rose-200"
              }`}>
                {isParkingPass ? <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={20} /> : <XCircle className="text-rose-400 shrink-0 mt-0.5" size={20} />}
                <div className="text-xs sm:text-sm">
                  <div className="font-bold flex items-center gap-2">
                    <span>{isParkingPass ? "✅ MUVOFIQ" : "🔴 MUVAFFAQIYATSIZ"}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-slate-300">ShNQ 2.08.01-19</span>
                  </div>
                  <p className="mt-1 text-slate-300">
                    Ko'rsatkich: <strong>{parkingRatio.toFixed(2)}</strong> joy/xonadon (Minimal me'yor: <strong>1.0</strong> joy/xonadon).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "fire" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Yong'in o'chirish texnikasi o'tish yo'li kengligi (metr):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="2.0"
                  value={fireRoadWidth}
                  onChange={(e) => setFireRoadWidth(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#4F8EF7]"
                />
              </div>

              <div className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
                isFireRoadPass ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200" : "bg-rose-950/30 border-rose-500/30 text-rose-200"
              }`}>
                {isFireRoadPass ? <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={20} /> : <XCircle className="text-rose-400 shrink-0 mt-0.5" size={20} />}
                <div className="text-xs sm:text-sm">
                  <div className="font-bold flex items-center gap-2">
                    <span>{isFireRoadPass ? "✅ MUVOFIQ" : "🔴 MUVAFFAQIYATSIZ"}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-slate-300">ShNQ 2.01.02-04, §3.10</span>
                  </div>
                  <p className="mt-1 text-slate-300">
                    O'tish yo'li kengligi: <strong>{fireRoadWidth.toFixed(1)}m</strong> (Me'yor bo'yicha kamida <strong>6.0m</strong> bo'lishi shart).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CTA in Mini App */}
        <div className="mt-5 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-[#4F8EF7]" size={16} />
            <span>To'liq 15 ta me'yor tekshiruvi va DWG/PDF chizma tahlili</span>
          </div>
          <a
            href="https://t.me/MeMore_AIbot"
            className="w-full sm:w-auto text-center px-4 py-2 rounded-lg bg-[#4F8EF7] text-white font-medium hover:bg-blue-600 transition-colors"
          >
            Bot orqali tekshirish 🚀
          </a>
        </div>
      </div>
    </section>
  );
}
