"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Layers, Eye, EyeOff, Activity, ShieldAlert, ShieldCheck, 
  Flame, Accessibility, Building, Compass, Sparkles
} from "lucide-react";

interface BIMViewerProps {
  isScanning: boolean;
  selectedCity: string;
  rampSlope: number;
  ceilingHeight: number;
  fireRoadWidth: number;
  activeLayer: string;
  setActiveLayer: (layer: string) => void;
}

export default function HolographicBIMViewer({
  isScanning,
  selectedCity,
  rampSlope,
  ceilingHeight,
  fireRoadWidth,
  activeLayer,
  setActiveLayer,
}: BIMViewerProps) {
  const isRampError = rampSlope > 8.33;
  const isCeilingError = ceilingHeight < 2.70;
  const isFireError = fireRoadWidth < 6.0;

  return (
    <div className="relative w-full rounded-3xl bg-[#030712] border border-cyan-500/20 overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.12)]">
      {/* 2026 Aylanuvchi Neon Border-Beam */}
      <div className="absolute inset-0 pointer-events-none rounded-3xl overflow-hidden">
        <div className="absolute -inset-[100%] animate-[spin_8s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_340deg,#06b6d4_360deg)] opacity-40 blur-sm" />
        <div className="absolute inset-[1px] rounded-3xl bg-[#030712]/95" />
      </div>

      {/* Arxitektura Millimetrovka Grid Foni */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(6,182,212,0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6,182,212,0.15) 1px, transparent 1px),
            radial-gradient(circle at 50% 50%, rgba(6,182,212,0.08) 0%, transparent 70%)
          `,
          backgroundSize: "24px 24px, 24px 24px, 100% 100%"
        }}
      />

      {/* Sarlavha & Metrikalar Paneli */}
      <div className="relative z-10 p-4 sm:p-5 flex items-center justify-between border-b border-cyan-500/15 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Layers size={18} className="animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wider uppercase font-mono">
                BIM Holographic 3D Layer Studio
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                v2026.4
              </span>
            </div>
            <p className="text-[11px] text-cyan-400/70 font-mono">
              Koordinatalar: 41.2995° N, 69.2401° E ({selectedCity}) • LOD 400
            </p>
          </div>
        </div>

        {/* Qatlam Filtr Tugmalari */}
        <div className="hidden sm:flex items-center gap-1.5 bg-black/40 border border-cyan-500/20 rounded-xl p-1">
          {[
            { id: "all", label: "Barcha Qatlamlar", icon: Building },
            { id: "accessibility", label: "Pandus (ShNQ 2.07)", icon: Accessibility },
            { id: "fire", label: "Yong'in (ShNQ 2.01)", icon: Flame },
            { id: "structure", label: "Karkas (QMQ 2.01)", icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeLayer === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveLayer(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D Izometrik BIM Stage */}
      <div className="relative z-10 h-72 sm:h-96 w-full flex items-center justify-center p-4 overflow-hidden select-none">
        {/* Lazerli Skanerlash Chizig'i (Scan Beam) */}
        {isScanning && (
          <motion.div
            initial={{ top: "-10%" }}
            animate={{ top: "110%" }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-30 pointer-events-none shadow-[0_0_25px_#22d3ee]"
          >
            <div className="w-full h-24 bg-gradient-to-b from-cyan-500/20 to-transparent -translate-y-full" />
          </motion.div>
        )}

        {/* 3D BINO MODELI (Isometric SVG + Layers) */}
        <div className="relative w-72 sm:w-96 h-64 sm:h-80 flex items-center justify-center">
          <svg
            viewBox="0 0 500 400"
            className="w-full h-full drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]"
          >
            <defs>
              {/* Neon Glow Filters */}
              <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="grid-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0891b2" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* 1. ASOSIY ZAMIN VA KADASTR MAYDONI (Isometric Ground Plane) */}
            <g opacity="0.8">
              <polygon
                points="250,380 470,270 250,160 30,270"
                fill="url(#grid-grad)"
                stroke="#0891b2"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {/* O'qlar */}
              <line x1="250" y1="380" x2="490" y2="260" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.6" />
              <line x1="250" y1="380" x2="10" y2="260" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.6" />
              <text x="475" y="255" fill="#22d3ee" fontSize="10" fontFamily="monospace">X-AXIS (48.0m)</text>
              <text x="5" y="255" fill="#22d3ee" fontSize="10" fontFamily="monospace">Y-AXIS (36.0m)</text>
            </g>

            {/* 2. YONG'IN YO'LI QATLAMI (Fire Access Road Perimeter) */}
            {(activeLayer === "all" || activeLayer === "fire") && (
              <g>
                <polygon
                  points="250,365 440,270 250,175 60,270"
                  fill="none"
                  stroke={isFireError ? "#f43f5e" : "#10b981"}
                  strokeWidth={isFireError ? "3" : "2"}
                  strokeDasharray={isFireError ? "6 3" : "none"}
                  filter={isFireError ? "url(#glow-red)" : "url(#glow-cyan)"}
                />
                {/* Yong'in Yo'li Eni Label */}
                <circle cx="155" cy="318" r="4" fill={isFireError ? "#f43f5e" : "#10b981"} />
                <line x1="155" y1="318" x2="100" y2="345" stroke={isFireError ? "#f43f5e" : "#10b981"} strokeWidth="1" />
                <rect x="50" y="340" width="105" height="22" rx="4" fill="#030712" stroke={isFireError ? "#f43f5e" : "#10b981"} strokeWidth="1" />
                <text x="56" y="355" fill={isFireError ? "#fda4af" : "#6ee7b7"} fontSize="10" fontFamily="monospace" fontWeight="bold">
                  Yong'in: {fireRoadWidth}m {isFireError ? "(≤6m XATO)" : "(≥6m OK)"}
                </text>
              </g>
            )}

            {/* 3. BINO IZOMETRIK KARKASI (Isometric 3-Tier Multi-Story Structure) */}
            <g>
              {/* Qavat 1 (L1) */}
              <g opacity={activeLayer === "all" || activeLayer === "accessibility" ? 1 : 0.35}>
                {/* Chap tomon devor */}
                <polygon points="120,290 250,355 250,290 120,225" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1.5" />
                {/* O'ng tomon devor */}
                <polygon points="250,355 380,290 380,225 250,290" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />
                {/* L1 Orayopma plitasi */}
                <polygon points="250,290 380,225 250,160 120,225" fill="#0891b2" fillOpacity="0.15" stroke="#38bdf8" strokeWidth="2" />
              </g>

              {/* Qavat 2 (L2) */}
              <g opacity={activeLayer === "all" || activeLayer === "structure" ? 1 : 0.35}>
                <polygon points="120,225 250,290 250,225 120,160" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="2 2" />
                <polygon points="250,290 380,225 380,160 250,225" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="2 2" />
                <polygon points="250,225 380,160 250,95 120,160" fill="#0891b2" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="2" />
              </g>

              {/* Qavat 3 / Tom (Roof & Sky Level) */}
              <g opacity={activeLayer === "all" || activeLayer === "structure" ? 1 : 0.35}>
                <polygon points="120,160 250,225 250,160 120,95" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1.5" />
                <polygon points="250,225 380,160 380,95 250,160" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />
                <polygon points="250,160 380,95 250,30 120,95" fill="#06b6d4" fillOpacity="0.25" stroke="#22d3ee" strokeWidth="2" filter="url(#glow-cyan)" />
              </g>

              {/* Ustunlar (BIM Structural Columns) */}
              <line x1="250" y1="355" x2="250" y2="30" stroke="#22d3ee" strokeWidth="2" strokeDasharray="3 3" opacity="0.7" />
              <line x1="120" y1="290" x2="120" y2="95" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.5" />
              <line x1="380" y1="290" x2="380" y2="95" stroke="#0ea5e9" strokeWidth="1.5" opacity="0.5" />
            </g>

            {/* 4. SHIFT BALANDLIGI LAZER KO'RSATGICHI (Ceiling Dimension Ray) */}
            {(activeLayer === "all" || activeLayer === "structure") && (
              <g>
                <line x1="255" y1="350" x2="255" y2="295" stroke={isCeilingError ? "#f43f5e" : "#22d3ee"} strokeWidth="2" />
                <circle cx="255" cy="350" r="3" fill={isCeilingError ? "#f43f5e" : "#22d3ee"} />
                <circle cx="255" cy="295" r="3" fill={isCeilingError ? "#f43f5e" : "#22d3ee"} />
                <line x1="255" y1="322" x2="330" y2="330" stroke={isCeilingError ? "#f43f5e" : "#22d3ee"} strokeWidth="1" />
                <rect x="330" y="320" width="100" height="22" rx="4" fill="#030712" stroke={isCeilingError ? "#f43f5e" : "#22d3ee"} strokeWidth="1" />
                <text x="336" y="335" fill={isCeilingError ? "#fda4af" : "#a5f3fc"} fontSize="10" fontFamily="monospace" fontWeight="bold">
                  H={ceilingHeight}m {isCeilingError ? "(≤2.7m XATO)" : "(≥2.7m OK)"}
                </text>
              </g>
            )}

            {/* 5. INKLUZIV PANDUS QATLAMI (Ramp Geometry & Slope Indicator) */}
            {(activeLayer === "all" || activeLayer === "accessibility") && (
              <g>
                {/* Pandus platformasi */}
                <polygon
                  points="210,340 240,355 200,375 170,360"
                  fill={isRampError ? "#ef4444" : "#10b981"}
                  fillOpacity="0.4"
                  stroke={isRampError ? "#f43f5e" : "#10b981"}
                  strokeWidth="2"
                  filter={isRampError ? "url(#glow-red)" : "url(#glow-cyan)"}
                />
                {/* Pandus qiyaligi Callout */}
                <circle cx="185" cy="368" r="4" fill={isRampError ? "#f43f5e" : "#10b981"} />
                <line x1="185" y1="368" x2="140" y2="400" stroke={isRampError ? "#f43f5e" : "#10b981"} strokeWidth="1" />
                <rect x="80" y="380" width="130" height="22" rx="4" fill="#030712" stroke={isRampError ? "#f43f5e" : "#10b981"} strokeWidth="1" />
                <text x="86" y="395" fill={isRampError ? "#fda4af" : "#6ee7b7"} fontSize="10" fontFamily="monospace" fontWeight="bold">
                  Pandus: {rampSlope}% {isRampError ? "(Tik! §17)" : "(≤8.33% OK)"}
                </text>
              </g>
            )}

            {/* 6. SEYSMIKA CHOKI VA BELBOG'I (Seismic Ring & Joints) */}
            <g opacity="0.6">
              <polygon
                points="250,225 380,160 250,95 120,160"
                fill="none"
                stroke="#a855f7"
                strokeWidth="2"
                strokeDasharray="5 3"
              />
              <text x="210" y="100" fill="#d8b4fe" fontSize="9" fontFamily="monospace">
                Antiseysmik belbog' ({selectedCity} - 9 ball)
              </text>
            </g>
          </svg>

          {/* Hologram Markazi Koordinata Viziri */}
          <div className="absolute top-3 left-3 text-[10px] font-mono text-cyan-400/80 bg-black/60 border border-cyan-500/20 px-2 py-1 rounded backdrop-blur">
            <div>CAM: ISO-30° | ORTHO</div>
            <div>FPS: 60 | COMPLIANCE: REAL-TIME</div>
          </div>
        </div>
      </div>

      {/* Pastki Qatlam Holati & Ogohlantirishlar Satri */}
      <div className="relative z-10 px-4 py-3 bg-[#020617]/90 border-t border-cyan-500/15 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isRampError ? "bg-rose-500 animate-ping" : "bg-emerald-400"}`} />
            <span className="text-slate-300">ShNQ 2.07 Inkluzivlik:</span>
            <strong className={isRampError ? "text-rose-400 font-bold" : "text-emerald-400"}>
              {isRampError ? "RAD ETILDI" : "MUVOFIQ"}
            </strong>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isFireError ? "bg-rose-500 animate-ping" : "bg-emerald-400"}`} />
            <span className="text-slate-300">ShNQ 2.01 Yong'in:</span>
            <strong className={isFireError ? "text-rose-400 font-bold" : "text-emerald-400"}>
              {isFireError ? "RAD ETILDI" : "MUVOFIQ"}
            </strong>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isCeilingError ? "bg-rose-500 animate-ping" : "bg-emerald-400"}`} />
            <span className="text-slate-300">ShNQ 2.08 Shift:</span>
            <strong className={isCeilingError ? "text-rose-400 font-bold" : "text-emerald-400"}>
              {isCeilingError ? "RAD ETILDI" : "MUVOFIQ"}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-cyan-400/80">
          <Compass size={14} />
          <span>O'zR Qurilish Vazirligi Me'yorlari</span>
        </div>
      </div>
    </div>
  );
}
