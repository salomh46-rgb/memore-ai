"use client";

import { useState, useRef, useEffect, MouseEvent, TouchEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Layers, RotateCw, ZoomIn, ZoomOut, Scissors, SplitSquareVertical,
  Building, Compass, Flame, Accessibility, Activity, Maximize2, RefreshCw
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
  floorsCount = 6,
}: BIMViewerProps) {
  // 1. 360° Interaktiv 3D Orbit Holati
  const [rotX, setRotX] = useState<number>(24);
  const [rotY, setRotY] = useState<number>(-32);
  const [zoom, setZoom] = useState<number>(1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 2. Kinematik Rejimlar: Exploded View & Section Cut A-A
  const [isExploded, setIsExploded] = useState<boolean>(false);
  const [isSectionCut, setIsSectionCut] = useState<boolean>(false);
  const [sectionOffset, setSectionOffset] = useState<number>(50); // Kesim joylashuvi (%)

  const isRampError = rampSlope > 8.33;
  const isCeilingError = ceilingHeight < 2.70;
  const isFireError = fireRoadWidth < 6.0;

  // Qavatlar balandligining parametrik hisobi
  const floorHeightPx = Math.max(28, Math.min(52, ceilingHeight * 14));
  const visibleFloors = Math.min(10, Math.max(3, floorsCount));

  // Sichqoncha va sensorli aylantirish hodisalari (360° Orbit)
  const handleMouseDown = (e: MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    setRotY((prev) => (prev + deltaX * 0.6) % 360);
    setRotX((prev) => Math.max(-10, Math.min(75, prev - deltaY * 0.5)));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => setIsDragging(false);

  // Sensorli ekranlar (Smartfon / Telegram WebApp Touch)
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - lastMousePos.current.x;
    const deltaY = e.touches[0].clientY - lastMousePos.current.y;
    setRotY((prev) => (prev + deltaX * 0.7) % 360);
    setRotX((prev) => Math.max(-10, Math.min(75, prev - deltaY * 0.6)));
    lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Avtomatik qayta tiklash
  const resetCamera = () => {
    setRotX(24);
    setRotY(-32);
    setZoom(1);
    setIsExploded(false);
    setIsSectionCut(false);
  };

  return (
    <div className="relative w-full rounded-3xl bg-[#020617] border border-cyan-500/25 overflow-hidden shadow-[0_0_60px_rgba(6,182,212,0.15)] select-none">
      {/* 2026 Arxitektura Millimetrovka Grid Foni */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(6,182,212,0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(6,182,212,0.2) 1px, transparent 1px)
          `,
          backgroundSize: "28px 28px"
        }}
      />

      {/* Yuqori Boshqaruv & Arxitektura Rejimlari Paneli */}
      <div className="relative z-20 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 bg-black/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Building size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wider font-mono">
                BIM 3D Kinematic Studio
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                LOD 400
              </span>
            </div>
            <p className="text-[11px] text-cyan-400/80 font-mono">
              Orbit: {Math.round(rotY)}° Yaw, {Math.round(rotX)}° Pitch • {visibleFloors} Qavat ({selectedCity})
            </p>
          </div>
        </div>

        {/* 4 TA KINEMATIK REJIM TUGMALARI */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Exploded View Tugmasi */}
          <button
            onClick={() => setIsExploded(!isExploded)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all border ${
              isExploded 
                ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]" 
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-cyan-500/40"
            }`}
            title="Qavatlarni havoda ajratib ko'rsatish"
          >
            <SplitSquareVertical size={14} className={isExploded ? "animate-bounce" : ""} />
            <span>Exploded BIM</span>
          </button>

          {/* Section Cut A-A Tugmasi */}
          <button
            onClick={() => setIsSectionCut(!isSectionCut)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all border ${
              isSectionCut 
                ? "bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.4)]" 
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-cyan-500/40"
            }`}
            title="Lazerli arxitektura kesimi"
          >
            <Scissors size={14} className={isSectionCut ? "rotate-90" : ""} />
            <span>Kesim A-A</span>
          </button>

          {/* Zoom & Reset */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setZoom((z) => Math.min(1.5, z + 0.15))}
              className="p-1.5 text-slate-300 hover:text-cyan-300 rounded-lg"
              title="Kattalashtirish"
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.65, z - 0.15))}
              className="p-1.5 text-slate-300 hover:text-cyan-300 rounded-lg"
              title="Kichraytirish"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={resetCamera}
              className="p-1.5 text-slate-300 hover:text-amber-400 rounded-lg"
              title="Kamerani boshlang'ich holatga qaytarish"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 3D INTERAKTIV SAHNA (3D Perspective Viewport) */}
      <div 
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative z-10 h-80 sm:h-[420px] w-full flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
        style={{ perspective: "1100px" }}
      >
        {/* Lazerli Skanerlash Chizig'i (Scan Beam) */}
        {isScanning && (
          <motion.div
            initial={{ top: "-10%" }}
            animate={{ top: "110%" }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-40 pointer-events-none shadow-[0_0_30px_#22d3ee]"
          >
            <div className="w-full h-32 bg-gradient-to-b from-cyan-400/25 to-transparent -translate-y-full" />
          </motion.div>
        )}

        {/* Kesim Lazer Tekisligi (Section Cut Plane) */}
        {isSectionCut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-y-0 w-1 bg-rose-500/70 z-30 pointer-events-none shadow-[0_0_30px_#f43f5e]"
            style={{ left: `${sectionOffset}%` }}
          >
            <div className="absolute top-4 left-2 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500 text-rose-300 text-[10px] font-mono whitespace-nowrap">
              Kesim A-A (X={sectionOffset}m)
            </div>
          </motion.div>
        )}

        {/* 3D BINO MODELI (CSS 3D Transforms) */}
        <motion.div
          animate={{
            rotateX: rotX,
            rotateY: rotY,
            scale: zoom,
          }}
          transition={{ type: "spring", stiffness: 220, damping: 25 }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative w-56 sm:w-64 h-56 sm:h-64 flex items-center justify-center"
        >
          {/* 1. ZAMIN VA KADASTR TEKISLIGI (Ground Grid Plane) */}
          <div 
            style={{
              transform: `rotateX(90deg) translateZ(-80px)`,
              transformStyle: "preserve-3d",
            }}
            className="absolute w-80 sm:w-96 h-80 sm:h-96 rounded-3xl border border-cyan-500/30 bg-cyan-950/20 shadow-[0_0_50px_rgba(6,182,212,0.15)] flex items-center justify-center"
          >
            {/* Koordinata markazi */}
            <div className="w-full h-[1px] bg-cyan-500/40 absolute" />
            <div className="h-full w-[1px] bg-cyan-500/40 absolute" />
            <span className="absolute bottom-2 right-4 text-[10px] font-mono text-cyan-400">
              KADASTR: {selectedCity} (48m × 36m)
            </span>

            {/* Yong'in Yo'li Perimetri */}
            <div 
              className={`absolute inset-4 rounded-2xl border-2 transition-colors ${
                isFireError 
                  ? "border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)] border-dashed animate-pulse" 
                  : "border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              }`}
            >
              <span className={`absolute -top-3 left-4 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                isFireError ? "bg-rose-950 border border-rose-500 text-rose-300" : "bg-emerald-950 border border-emerald-500 text-emerald-300"
              }`}>
                Yong'in yo'li: {fireRoadWidth}m {isFireError ? "(QOIDABUZARLIK)" : "(OK)"}
              </span>
            </div>

            {/* Inkluziv Pandus Zonasi */}
            <div 
              className={`absolute -bottom-6 left-12 w-28 h-10 rounded-lg border-2 transition-all ${
                isRampError 
                  ? "border-rose-500 bg-rose-950/60 shadow-[0_0_20px_rgba(244,63,94,0.5)]" 
                  : "border-cyan-400 bg-cyan-950/60 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              }`}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white">
                Pandus {rampSlope}%
              </span>
            </div>
          </div>

          {/* 2. PARAMETRIK QAVATLAR (Exploded View & Morphing) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transformStyle: "preserve-3d" }}>
            {Array.from({ length: visibleFloors }).map((_, idx) => {
              const floorNum = idx + 1;
              const isTopFloor = floorNum === visibleFloors;

              // Exploded view da har bir qavat orasidagi vertikal masofa
              const explodedGap = isExploded ? idx * 45 : 0;
              const zLevel = -60 + (idx * floorHeightPx) + explodedGap;

              return (
                <motion.div
                  key={floorNum}
                  initial={false}
                  animate={{
                    transform: `translateZ(${zLevel}px)`,
                  }}
                  transition={{ type: "spring", stiffness: 180, damping: 22 }}
                  style={{ transformStyle: "preserve-3d" }}
                  className={`absolute w-44 sm:w-52 h-44 sm:h-52 rounded-2xl border-2 transition-all duration-300 ${
                    isTopFloor 
                      ? "border-cyan-400 bg-cyan-500/25 shadow-[0_0_35px_rgba(6,182,212,0.4)]" 
                      : "border-sky-500/50 bg-[#0f172a]/80 shadow-[0_0_20px_rgba(14,165,233,0.15)]"
                  } ${isSectionCut ? "border-r-rose-500 border-r-4" : ""}`}
                >
                  {/* Qavat raqami va Lazer marker */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 font-mono text-[10px] text-cyan-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>L{floorNum} ({idx === 0 ? "Kirish" : isTopFloor ? "Tom" : "Turar"})</span>
                  </div>

                  {/* Shift Balandligi Ko'rsatkichi (Faqat 1-2 qavatda) */}
                  {idx === 1 && (
                    <div className="absolute right-2 top-2 px-2 py-0.5 rounded bg-black/70 border border-cyan-500/30 text-[10px] font-mono">
                      <span className={isCeilingError ? "text-rose-400 font-bold" : "text-cyan-300"}>
                        H={ceilingHeight}m {isCeilingError ? "(≤2.7m Xato)" : ""}
                      </span>
                    </div>
                  )}

                  {/* Ichki Xonalar va Ustunlar To'ri (Section Kesimda Ko'rinadi) */}
                  {isSectionCut && (
                    <div className="absolute inset-2 border border-rose-500/40 rounded-lg flex items-center justify-center font-mono text-[10px] text-rose-300 bg-rose-950/20">
                      <span>Xonadon 3A • Koridor 1.8m</span>
                    </div>
                  )}

                  {/* 4 Burchak Ustunlari (Structural BIM Columns) */}
                  <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                  <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 rounded bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                  <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                </motion.div>
              );
            })}

            {/* Antiseysmik Belbog' Qatlami (QMQ 2.01.03) */}
            <motion.div
              animate={{
                transform: `translateZ(${-60 + (visibleFloors * floorHeightPx) + (isExploded ? visibleFloors * 45 : 0) + 20}px)`,
              }}
              style={{ transformStyle: "preserve-3d" }}
              className="absolute w-48 sm:w-56 h-48 sm:h-56 rounded-2xl border-2 border-purple-500 border-dashed shadow-[0_0_30px_rgba(168,85,247,0.4)] pointer-events-none flex items-center justify-center"
            >
              <span className="text-[10px] font-mono text-purple-300 bg-black/80 px-2 py-0.5 rounded border border-purple-500/40">
                Seysmik chok va karkas ({selectedCity} - 9 ball)
              </span>
            </motion.div>
          </div>
        </motion.div>

        {/* Sahna Pastidagi Arxitektor Maslahati */}
        <div className="absolute bottom-3 left-4 text-[10px] font-mono text-cyan-400/80 bg-black/70 border border-cyan-500/20 px-3 py-1.5 rounded-xl backdrop-blur flex items-center gap-2 pointer-events-none">
          <RotateCw size={13} className="animate-spin" style={{ animationDuration: "12s" }} />
          <span>Binoni barmoq yoki sichqoncha bilan 360° aylantirishingiz mumkin</span>
        </div>
      </div>

      {/* Pastki Nazorat & Status Bar */}
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
          <Compass size={14} />
          <span>O'zR Qurilish Vazirligi Standartlari</span>
        </div>
      </div>
    </div>
  );
}
