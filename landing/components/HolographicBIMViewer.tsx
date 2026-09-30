"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, Layers, Activity, ShieldCheck, ShieldAlert,
  Flame, Accessibility, Ruler, Eye, ArrowRight, RefreshCw, Zap
} from "lucide-react";

interface BIMViewerProps {
  isScanning: boolean;
  selectedCity: string;
  rampSlope: number;
  ceilingHeight: number;
  fireRoadWidth: number;
  activeLayer: string;
  setActiveLayer: (layer: string) => void;
  floorsCount?: number;
}

export default function HolographicBIMViewer({
  isScanning,
  selectedCity,
  rampSlope,
  ceilingHeight,
  fireRoadWidth,
  activeLayer,
  setActiveLayer,
  floorsCount = 8,
}: BIMViewerProps) {
  // 4 xil konstruktiv tizim (2-rasmdagi kabi)
  const [structuralSystem, setStructuralSystem] = useState<"shear" | "braced" | "tube" | "outrigger">("shear");
  const [showLateralLoads, setShowLateralLoads] = useState<boolean>(true);
  const [isExploded, setIsExploded] = useState<boolean>(false);

  const isRampError = rampSlope > 8.33;
  const isCeilingError = ceilingHeight < 2.70;
  const isFireError = fireRoadWidth < 6.0;

  // Qavatlar soni va geometriyasi
  const visibleFloors = Math.min(12, Math.max(4, floorsCount));
  const floorHeightSvg = 26; // har bir qavat balandligi px
  const buildingHeightSvg = visibleFloors * floorHeightSvg;
  const groundY = 320;
  const buildingTopY = groundY - buildingHeightSvg;

  return (
    <div className="relative w-full rounded-3xl bg-[#020617] border border-cyan-500/30 overflow-hidden shadow-[0_0_60px_rgba(6,182,212,0.18)] select-none">
      {/* 2026 Arxitektura Millimetrovka Grid Foni */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(6,182,212,0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6,182,212,0.2) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px"
        }}
      />

      {/* YUQORI BOSHQARUV: 4 TA ARXITEKTURA KONSTRUKTIV TIZIMI (2-rasmdagi kabi) */}
      <div className="relative z-20 p-4 sm:p-5 border-b border-cyan-500/20 bg-black/60 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Building2 size={18} />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white font-mono tracking-wide uppercase">
                High-Rise Structural BIM Model (QMQ 2.01.03-19)
              </h3>
            </div>
            <p className="text-xs text-cyan-400/80 font-mono mt-0.5">
              Konstruktiv tizim: <span className="text-white font-bold">{
                structuralSystem === "shear" ? "1. Shear Wall Core (Markaziy Monolit Yadro)" :
                structuralSystem === "braced" ? "2. Braced Frame (Diagonal Bog'lamli Karkas)" :
                structuralSystem === "tube" ? "3. Tube System (Perimetral Qobiq Ustunlar)" :
                "4. Core-and-Outrigger (Yadro va Autriger Fermalar)"
              }</span> • {visibleFloors} Qavat ({selectedCity} - 9 ball)
            </p>
          </div>

          {/* 4 Ta Tizim Selektori */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full lg:w-auto bg-black/50 p-1.5 rounded-2xl border border-cyan-500/25">
            {[
              { id: "shear", num: "1", title: "Shear Core", sub: "Yadro" },
              { id: "braced", num: "2", title: "Braced", sub: "Bog'lam" },
              { id: "tube", num: "3", title: "Tube", sub: "Qobiq" },
              { id: "outrigger", num: "4", title: "Outrigger", sub: "Autriger" },
            ].map((sys) => {
              const active = structuralSystem === sys.id;
              return (
                <button
                  key={sys.id}
                  onClick={() => setStructuralSystem(sys.id as any)}
                  className={`flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl font-mono text-xs transition-all ${
                    active
                      ? "bg-cyan-500/25 border border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.35)]"
                      : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <span className="font-bold text-[11px]">{sys.num}. {sys.title}</span>
                  <span className="text-[9px] text-slate-400">{sys.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rejimlar & Qatlamlar Qatori */}
        <div className="flex items-center justify-between flex-wrap gap-2 mt-3 pt-3 border-t border-cyan-500/10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExploded(!isExploded)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all border ${
                isExploded 
                  ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)]" 
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {isExploded ? "▼ Qavatlarni Yig'ish" : "▲ Exploded View (Ajratish)"}
            </button>

            <button
              onClick={() => setShowLateralLoads(!showLateralLoads)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-all border ${
                showLateralLoads 
                  ? "bg-blue-500/20 border-blue-400 text-blue-300" 
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              {showLateralLoads ? "⚡ Seysmik Kuchlar: Faol" : "Seysmik Kuchlar: O'chiq"}
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Shift balandligi: <span className={isCeilingError ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>{ceilingHeight}m</span> • Pandus: <span className={isRampError ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>{rampSlope}%</span>
          </div>
        </div>
      </div>

      {/* ASOSIY 2D/3D BIM KONSTRUKTIV CHIZMA SAHNASI (Aynan 2-rasmga o'xshash) */}
      <div className="relative z-10 w-full min-h-[460px] sm:min-h-[500px] flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        {/* Lazerli Skanerlash Chizig'i (Scan Beam) */}
        {isScanning && (
          <motion.div
            initial={{ top: "0%" }}
            animate={{ top: "100%" }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-40 pointer-events-none shadow-[0_0_25px_#22d3ee]"
          >
            <div className="w-full h-28 bg-gradient-to-b from-cyan-400/20 to-transparent -translate-y-full" />
          </motion.div>
        )}

        {/* SVG ARXITEKTURA VA KONSTRUKSIYA CHIZMASI */}
        <svg 
          viewBox="0 0 760 480" 
          className="w-full h-full max-h-[460px] drop-shadow-2xl"
        >
          <defs>
            {/* Lazer nurlar filtri */}
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-core" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="core-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#0369a1" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#075985" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="ground-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#451a03" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#1c1917" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* 1. SEIZMIK LATERAL LOADS (Chap tomondan keluvchi gorizontal seysmik yuklar - 2-rasmdagi kabi) */}
          {showLateralLoads && (
            <g className="animate-pulse">
              <text x="70" y="70" fill="#38bdf8" fontSize="12" fontFamily="monospace" fontWeight="bold">
                LATERAL LOADS
              </text>
              <text x="70" y="85" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                (9 Ball Seysmik / Shamol)
              </text>
              {Array.from({ length: 6 }).map((_, i) => {
                const yPos = 110 + i * 36;
                return (
                  <g key={i}>
                    <line x1="80" y1={yPos} x2="165" y2={yPos} stroke="#38bdf8" strokeWidth="2.5" />
                    <polygon points={`175,${yPos} 162,${yPos - 5} 162,${yPos + 5}`} fill="#38bdf8" />
                  </g>
                );
              })}
            </g>
          )}

          {/* 2. ZAMIN VA SVAYALI POYDEVOR (Soil & Pile Foundation - 2-rasmdagi kabi) */}
          <g>
            {/* Grunt qatlami */}
            <rect x="180" y="340" width="380" height="85" fill="url(#ground-gradient)" stroke="#78350f" strokeWidth="1.5" />
            <text x="190" y="415" fill="#a8a29e" fontSize="10" fontFamily="monospace">
              GRUNT & SEYSMIK POYDEVOR ASOSI (ShNQ 2.02.01)
            </text>

            {/* Temir-beton Svayalar (Piles) */}
            {[210, 245, 280, 315, 350, 385, 420, 455, 490, 525].map((pileX, idx) => (
              <g key={idx}>
                <rect x={pileX} y="355" width="10" height="60" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1" />
                <line x1={pileX} y1="365" x2={pileX + 10} y2="375" stroke="#475569" strokeWidth="1" />
                <line x1={pileX} y1="385" x2={pileX + 10} y2="395" stroke="#475569" strokeWidth="1" />
              </g>
            ))}

            {/* Monolit Poydevor Plitasi (Raft Slab) */}
            <rect x="190" y="325" width="360" height="20" fill="#64748b" stroke="#cbd5e1" strokeWidth="2" />
            <text x="320" y="339" fill="#0f172a" fontSize="10" fontFamily="monospace" fontWeight="bold">
              MONOLIT POYDEVOR PLITASI (RAFT SLAB)
            </text>
          </g>

          {/* 3. BINO ASOSIY KARKASI VA QAVATLARI */}
          <g id="building-structure">
            {/* Binoning Tashqi Vertikal Karkas Ustunlari */}
            <line x1="220" y1="325" x2="220" y2={buildingTopY} stroke="#38bdf8" strokeWidth="3" />
            <line x1="520" y1="325" x2="520" y2={buildingTopY} stroke="#38bdf8" strokeWidth="3" />

            {/* Markaziy Yadro (Central Shear Wall Core / Lift Shaxtasi - 2-rasmdagi ko'k ustun) */}
            <rect 
              x="330" 
              y={buildingTopY} 
              width="80" 
              height={buildingHeightSvg} 
              fill="url(#core-gradient)" 
              stroke="#0284c7" 
              strokeWidth="2.5"
              filter="url(#glow-core)"
            />
            {/* Yadro ichidagi lift & xonadon chiziqlari */}
            {Array.from({ length: visibleFloors }).map((_, idx) => (
              <line 
                key={`core-line-${idx}`} 
                x1="330" 
                y1={buildingTopY + idx * floorHeightSvg} 
                x2="410" 
                y2={buildingTopY + idx * floorHeightSvg} 
                stroke="#38bdf8" 
                strokeWidth="1" 
                strokeOpacity="0.4"
              />
            ))}
            <text x="340" y={buildingTopY + 20} fill="#ffffff" fontSize="9" fontFamily="monospace" fontWeight="bold">
              CORE
            </text>

            {/* Qavatlar va Orayopma Plitalari (Floor Slabs & Columns) */}
            {Array.from({ length: visibleFloors }).map((_, idx) => {
              const floorIndexFromBottom = visibleFloors - idx;
              // Exploded view da qavatlar havoga ajraladi
              const explodedShift = isExploded ? (visibleFloors - 1 - idx) * 8 : 0;
              const yLevel = buildingTopY + idx * floorHeightSvg - explodedShift;

              return (
                <g key={`floor-${idx}`}>
                  {/* Orayopma Plitasi (Concrete Slab) */}
                  <rect 
                    x="215" 
                    y={yLevel} 
                    width="310" 
                    height="5" 
                    fill="#cbd5e1" 
                    stroke="#94a3b8" 
                    strokeWidth="1" 
                  />

                  {/* Qavatlararo Vertikal Ustunlar (Columns Grid) */}
                  <line x1="260" y1={yLevel + 5} x2="260" y2={yLevel + floorHeightSvg} stroke="#0284c7" strokeWidth="2" strokeDasharray={structuralSystem === "tube" ? "none" : "3 1"} />
                  <line x1="300" y1={yLevel + 5} x2="300" y2={yLevel + floorHeightSvg} stroke="#0284c7" strokeWidth="2" strokeDasharray={structuralSystem === "tube" ? "none" : "3 1"} />
                  <line x1="440" y1={yLevel + 5} x2="440" y2={yLevel + floorHeightSvg} stroke="#0284c7" strokeWidth="2" strokeDasharray={structuralSystem === "tube" ? "none" : "3 1"} />
                  <line x1="480" y1={yLevel + 5} x2="480" y2={yLevel + floorHeightSvg} stroke="#0284c7" strokeWidth="2" strokeDasharray={structuralSystem === "tube" ? "none" : "3 1"} />

                  {/* Qavat Belgisi (L1, L2, L3...) */}
                  <text x="195" y={yLevel + 16} fill="#64748b" fontSize="9" fontFamily="monospace">
                    L{floorIndexFromBottom}
                  </text>
                </g>
              );
            })}

            {/* 4. KONSTRUKTIV TIZIM BO'YICHA XUSUSIY ELEMENTLAR (2-rasmdagi kabi) */}

            {/* 2. BRACED FRAME: Diagonal Seysmik Bog'lamlar (X-Bracing) */}
            {structuralSystem === "braced" && (
              <g stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.8">
                {Array.from({ length: Math.floor(visibleFloors / 2) }).map((_, i) => {
                  const y1 = buildingTopY + i * (floorHeightSvg * 2);
                  const y2 = y1 + floorHeightSvg * 2;
                  return (
                    <g key={`brace-${i}`}>
                      {/* Chap panel X-bog'lam */}
                      <line x1="220" y1={y1} x2="330" y2={y2} />
                      <line x1="330" y1={y1} x2="220" y2={y2} />
                      {/* O'ng panel X-bog'lam */}
                      <line x1="410" y1={y1} x2="520" y2={y2} />
                      <line x1="520" y1={y1} x2="410" y2={y2} />
                    </g>
                  );
                })}
              </g>
            )}

            {/* 3. TUBE SYSTEM: Zich Perimetral Fasad Ustunlari */}
            {structuralSystem === "tube" && (
              <g stroke="#38bdf8" strokeWidth="2.5">
                {[220, 235, 250, 265, 280, 295, 310, 325, 415, 430, 445, 460, 475, 490, 505, 520].map((colX) => (
                  <line key={colX} x1={colX} y1="325" x2={colX} y2={buildingTopY} stroke="#0ea5e9" strokeOpacity="0.7" />
                ))}
              </g>
            )}

            {/* 4. CORE-AND-OUTRIGGER: Autriger Fermalar (Outrigger Trusses) */}
            {structuralSystem === "outrigger" && (
              <g>
                {/* O'rta qavat autriger ferma */}
                <rect x="220" y={buildingTopY + Math.floor(visibleFloors / 2) * floorHeightSvg} width="300" height="22" fill="#0369a1" fillOpacity="0.4" stroke="#38bdf8" strokeWidth="2" />
                <line x1="220" y1={buildingTopY + Math.floor(visibleFloors / 2) * floorHeightSvg} x2="330" y2={buildingTopY + Math.floor(visibleFloors / 2) * floorHeightSvg + 22} stroke="#f59e0b" strokeWidth="2" />
                <line x1="410" y1={buildingTopY + Math.floor(visibleFloors / 2) * floorHeightSvg} x2="520" y2={buildingTopY + Math.floor(visibleFloors / 2) * floorHeightSvg + 22} stroke="#f59e0b" strokeWidth="2" />
                {/* Tom qavat autriger ferma */}
                <rect x="220" y={buildingTopY} width="300" height="22" fill="#0369a1" fillOpacity="0.4" stroke="#38bdf8" strokeWidth="2" />
                <line x1="220" y1={buildingTopY} x2="330" y2={buildingTopY + 22} stroke="#f59e0b" strokeWidth="2" />
                <line x1="410" y1={buildingTopY} x2="520" y2={buildingTopY + 22} stroke="#f59e0b" strokeWidth="2" />
              </g>
            )}
          </g>

          {/* 5. ARXITEKTURA ME'YORIY CALLOUTS (Ko'rsatkichlar & Xatolar) */}
          <g>
            {/* Shift Balandligi Ko'rsatkichi */}
            <g transform={`translate(535, ${buildingTopY + 40})`}>
              <line x1="0" y1="0" x2="25" y2="0" stroke={isCeilingError ? "#f43f5e" : "#38bdf8"} strokeWidth="1.5" />
              <rect x="25" y="-12" width="165" height="26" rx="6" fill="#020617" stroke={isCeilingError ? "#f43f5e" : "#0284c7"} strokeWidth="1.5" />
              <text x="32" y="5" fill={isCeilingError ? "#fda4af" : "#bae6fd"} fontSize="10" fontFamily="monospace" fontWeight="bold">
                Shift: H={ceilingHeight}m {isCeilingError ? "(≤2.7m XATO!)" : "(≥2.7m OK)"}
              </text>
            </g>

            {/* Inkluziv Kirish Pandusi (ShNQ 2.07.02-22) */}
            <g transform="translate(140, 310)">
              {/* Pandus qiyaligi chizig'i */}
              <polygon points="0,15 50,0 50,15" fill={isRampError ? "#ef4444" : "#10b981"} fillOpacity="0.4" stroke={isRampError ? "#f43f5e" : "#10b981"} strokeWidth="2" />
              <line x1="25" y1="7" x2="25" y2="-20" stroke={isRampError ? "#f43f5e" : "#10b981"} strokeWidth="1.5" />
              <rect x="-30" y="-45" width="160" height="24" rx="6" fill="#020617" stroke={isRampError ? "#f43f5e" : "#10b981"} strokeWidth="1.5" />
              <text x="-24" y="-30" fill={isRampError ? "#fda4af" : "#6ee7b7"} fontSize="10" fontFamily="monospace" fontWeight="bold">
                Pandus {rampSlope}% {isRampError ? "(Tik! ShNQ 2.07)" : "(≤8.33% OK)"}
              </text>
            </g>

            {/* Yong'in Yo'li Eni (ShNQ 2.01.02-04) */}
            <g transform="translate(535, 315)">
              <line x1="0" y1="0" x2="35" y2="0" stroke={isFireError ? "#f43f5e" : "#10b981"} strokeWidth="2" />
              <rect x="35" y="-12" width="165" height="26" rx="6" fill="#020617" stroke={isFireError ? "#f43f5e" : "#10b981"} strokeWidth="1.5" />
              <text x="42" y="5" fill={isFireError ? "#fda4af" : "#6ee7b7"} fontSize="10" fontFamily="monospace" fontWeight="bold">
                Yong'in yo'li: {fireRoadWidth}m {isFireError ? "(≤6m XATO)" : "(≥6m OK)"}
              </text>
            </g>
          </g>
        </svg>

        {/* Konstruktiv Tizim Xulosasi Legendasi (Pastki burchak) */}
        <div className="absolute bottom-3 left-4 text-[10px] font-mono text-cyan-400/90 bg-black/80 border border-cyan-500/25 px-3 py-1.5 rounded-xl backdrop-blur flex items-center gap-2">
          <Activity size={14} className="text-cyan-400" />
          <span>
            {structuralSystem === "shear" && "Shear Wall Core: Lift va zinapoya monolit yadrosi barcha gorizontal seysmik kuchlarni qabul qiladi."}
            {structuralSystem === "braced" && "Braced Frame: Diagonal po'lat va temir-beton fermalar lateral yuklarni uchburchaklar bo'yicha so'ndiradi."}
            {structuralSystem === "tube" && "Tube System: Fasad bo'ylab zich joylashgan ustunlar binoni fazoviy quvur kabi mustahkamlaydi."}
            {structuralSystem === "outrigger" && "Core-and-Outrigger: Markaziy yadro va tashqi ustunlar autriger fermalar bilan bog'lanib, eng yuqori qatlam barqarorligini beradi."}
          </span>
        </div>
      </div>

      {/* PASTKI EKSPERTIZA XULOSA STATUSI */}
      <div className="relative z-20 px-4 py-3 bg-[#020617]/95 border-t border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isRampError ? "bg-rose-500 animate-ping" : "bg-emerald-400"}`} />
            <span className="text-slate-300">ShNQ 2.07 Pandus:</span>
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

        <div className="flex items-center gap-2 text-cyan-400">
          <ShieldCheck size={15} />
          <span>O'zR Qurilish Vazirligi Me'yorlari (2026)</span>
        </div>
      </div>
    </div>
  );
}
