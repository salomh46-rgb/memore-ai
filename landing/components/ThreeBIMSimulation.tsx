"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { 
  Building2, 
  Wind, 
  Activity, 
  Play, 
  Pause, 
  RotateCcw, 
  Layers, 
  ShieldCheck, 
  Sliders, 
  Eye, 
  Info,
  Maximize2
} from "lucide-react";

interface ThreeBIMProps {
  initialFloors?: number;
  selectedCity?: string;
  isScanning?: boolean;
}

export default function ThreeBIMSimulation({
  initialFloors = 16,
  selectedCity = "Toshkent",
  isScanning = false,
}: ThreeBIMProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  // Boshqaruv parametrlari
  const [core, setCore] = useState<boolean>(true);
  const [columns, setColumns] = useState<boolean>(true);
  const [slabs, setSlabs] = useState<boolean>(true);
  const [foundation, setFoundation] = useState<boolean>(true);
  const [mode, setMode] = useState<"Static" | "Wind" | "Seismic">("Seismic");
  const [intensity, setIntensity] = useState<number>(selectedCity === "Toshkent" ? 9.0 : 8.0);
  const [floors, setFloors] = useState<number>(initialFloors);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Jonli telemetriya hisoblari (HUD)
  const [displacementMm, setDisplacementMm] = useState<number>(0);
  const [vibPeriodSec, setVibPeriodSec] = useState<string>("1.44");
  const [baseLoadMN, setBaseLoadMN] = useState<string>("76.8");

  // Three.js boshqaruv obyektlari ref
  const paramsRef = useRef({
    core: true,
    columns: true,
    slabs: true,
    foundation: true,
    mode: "Seismic" as "Static" | "Wind" | "Seismic",
    intensity: 9.0,
    floors: 16,
    isPlaying: true,
  });

  // State o'zgarganda refni yangilash
  useEffect(() => {
    paramsRef.current = {
      core,
      columns,
      slabs,
      foundation,
      mode,
      intensity,
      floors,
      isPlaying,
    };
  }, [core, columns, slabs, foundation, mode, intensity, floors, isPlaying]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 800;
    let height = container.clientHeight || 460;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712); // Deep obsidian background

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    const initialH = paramsRef.current.floors * 2.5;
    camera.position.set(48, initialH * 0.75 + 12, 58);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Yer ostiga tushib ketmaslik
    controls.minDistance = 15;
    controls.maxDistance = 160;

    // 2. Chiroqlar (Lighting - Neon & Professional Studio)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2); // Tsian asosiy nur
    dirLight1.position.set(40, 70, 45);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 1024;
    dirLight1.shadow.mapSize.height = 1024;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x0284c7, 0.6); // Chuqur ko'k to'ldiruvchi nur
    dirLight2.position.set(-40, 25, -35);
    scene.add(dirLight2);

    // 3. Grunt va Seysmik To'r (Ground Grid)
    const gridColor = new THREE.Color(0x1e293b);
    const gridCenterColor = new THREE.Color(0x0284c7);
    const grid = new THREE.GridHelper(90, 45, gridCenterColor, gridColor);
    grid.position.y = -1.2;
    scene.add(grid);

    // 4. Binoni qurish mantiqi
    const buildingGroup = new THREE.Group();
    scene.add(buildingGroup);

    let floorNodes: any[] = [];
    let foundationMesh: THREE.Mesh | null = null;
    let currentFloorsCount = 0;

    const coreGeo = new THREE.BoxGeometry(8, 2.5, 8);
    const colGeo = new THREE.BoxGeometry(0.75, 2.5, 0.75);
    const slabGeo = new THREE.BoxGeometry(20, 0.28, 20);
    const fndGeo = new THREE.BoxGeometry(25, 1.4, 25);

    const coreEdgeGeo = new THREE.EdgesGeometry(coreGeo);
    const colEdgeGeo = new THREE.EdgesGeometry(colGeo);
    const slabEdgeGeo = new THREE.EdgesGeometry(slabGeo);
    const fndEdgeGeo = new THREE.EdgesGeometry(fndGeo);

    function getStressColor(ratio: number) {
      const r = Math.min(1.0, Math.max(0.0, ratio));
      const c = new THREE.Color();
      if (r < 0.33) {
        c.lerpColors(new THREE.Color(0x0284c7), new THREE.Color(0x06b6d4), r / 0.33);
      } else if (r < 0.66) {
        c.lerpColors(new THREE.Color(0x06b6d4), new THREE.Color(0xf59e0b), (r - 0.33) / 0.33);
      } else {
        c.lerpColors(new THREE.Color(0xf59e0b), new THREE.Color(0xef4444), (r - 0.66) / 0.34);
      }
      return c;
    }

    function buildBuilding(numFloors: number) {
      // Eskilarni tozalash
      while (buildingGroup.children.length > 0) {
        const child = buildingGroup.children[0];
        buildingGroup.remove(child);
      }
      floorNodes = [];

      // Poydevor (Foundation / Raft Slab)
      const fndMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x1e293b),
        roughness: 0.6,
        metalness: 0.2,
      });
      foundationMesh = new THREE.Mesh(fndGeo, fndMat);
      foundationMesh.position.y = -0.7;
      foundationMesh.receiveShadow = true;

      const fndLine = new THREE.LineSegments(
        fndEdgeGeo,
        new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 })
      );
      foundationMesh.add(fndLine);
      buildingGroup.add(foundationMesh);

      const h = 2.5;

      for (let i = 0; i < numFloors; i++) {
        const floorGroup = new THREE.Group();
        const yCenter = i * h + h / 2;
        floorGroup.position.set(0, yCenter, 0);

        const stressRatio = (numFloors - i) / numFloors;
        const baseColor = getStressColor(stressRatio);

        // A. Markaziy Monolit Yadro (Core / Lift Shaxtasi)
        const coreMat = new THREE.MeshStandardMaterial({
          color: baseColor.clone(),
          roughness: 0.35,
          metalness: 0.15,
          transparent: true,
          opacity: 0.92,
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.castShadow = true;
        coreMesh.receiveShadow = true;

        const coreLine = new THREE.LineSegments(
          coreEdgeGeo,
          new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.6 })
        );
        coreMesh.add(coreLine);
        floorGroup.add(coreMesh);

        // B. Perimetr Ustunlari (8 ta karkas ustuni)
        const columnMeshes: THREE.Mesh[] = [];
        const colMat = new THREE.MeshStandardMaterial({
          color: baseColor.clone(),
          roughness: 0.25,
          metalness: 0.3,
        });

        const colOffsets = [
          [-8.5, -8.5], [0, -8.5], [8.5, -8.5],
          [-8.5, 0],               [8.5, 0],
          [-8.5, 8.5],  [0, 8.5],  [8.5, 8.5],
        ];

        colOffsets.forEach(([cx, cz]) => {
          const colMesh = new THREE.Mesh(colGeo, colMat);
          colMesh.position.set(cx, 0, cz);
          colMesh.castShadow = true;
          colMesh.receiveShadow = true;

          const colLine = new THREE.LineSegments(
            colEdgeGeo,
            new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 })
          );
          colMesh.add(colLine);
          floorGroup.add(colMesh);
          columnMeshes.push(colMesh);
        });

        // C. Qavatlararo Monolit Plita (Slab)
        const slabMat = new THREE.MeshStandardMaterial({
          color: baseColor.clone().lerp(new THREE.Color(0xffffff), 0.4),
          roughness: 0.2,
          metalness: 0.1,
          transparent: true,
          opacity: 0.82,
        });
        const slabMesh = new THREE.Mesh(slabGeo, slabMat);
        slabMesh.position.set(0, h / 2 - 0.14, 0);
        slabMesh.receiveShadow = true;

        const slabLine = new THREE.LineSegments(
          slabEdgeGeo,
          new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.4 })
        );
        slabMesh.add(slabLine);
        floorGroup.add(slabMesh);

        buildingGroup.add(floorGroup);

        floorNodes.push({
          group: floorGroup,
          level: i,
          baseY: yCenter,
          coreMesh,
          coreMat,
          columnMeshes,
          colMat,
          slabMesh,
          slabMat,
          baseStressRatio: stressRatio,
        });
      }

      currentFloorsCount = numFloors;
      controls.target.set(0, (numFloors * h) / 2, 0);
    }

    buildBuilding(paramsRef.current.floors);

    // 5. Animatsiya va Fizik Tebranish Sikli (RAF)
    let animationFrameId: number;
    let simTime = 0;
    let lastTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const p = paramsRef.current;

      // Qavatlar soni o'zgarsa qayta qurish
      if (p.floors !== currentFloorsCount) {
        buildBuilding(p.floors);
      }

      // Qatlamlar ko'rinishi
      if (foundationMesh) foundationMesh.visible = p.foundation;
      floorNodes.forEach((node) => {
        if (node.coreMesh) node.coreMesh.visible = p.core;
        if (node.columnMeshes) node.columnMeshes.forEach((m: THREE.Mesh) => (m.visible = p.columns));
        if (node.slabMesh) node.slabMesh.visible = p.slabs;
      });

      if (p.isPlaying || p.mode !== "Static") {
        simTime += dt * 1.6;
      }

      const numFloors = p.floors;
      const h = 2.5;
      const H = numFloors * h;

      let targetAmp = 0;
      if (p.mode === "Wind") {
        targetAmp = 0.85;
      } else if (p.mode === "Seismic") {
        const intensityFactor = Math.pow(1.7, p.intensity - 7);
        targetAmp = 0.65 * intensityFactor;
      }

      let swayXTop = 0;
      let swayZTop = 0;

      // Har bir qavatning deformatsiyasi va tebranish to'lqini
      floorNodes.forEach((node, idx) => {
        const levelY = (node.level + 1) * h;
        const r = levelY / H;

        let dx = 0;
        let dz = 0;

        if (p.mode === "Wind") {
          const windPhase = simTime * 2.2;
          dx = targetAmp * Math.pow(r, 1.8) * (Math.sin(windPhase) + 0.25 * Math.sin(windPhase * 2.4));
          dz = 0.25 * targetAmp * Math.pow(r, 1.8) * Math.cos(windPhase * 1.5);
        } else if (p.mode === "Seismic") {
          const seismicPhase = simTime * 4.8;
          const groundMotion = Math.sin(seismicPhase * 2.2) * 0.12;
          dx =
            targetAmp *
              (Math.pow(r, 2.0) * Math.sin(seismicPhase) +
                0.22 * Math.pow(r, 3.0) * Math.sin(seismicPhase * 2.2)) +
            groundMotion;
          dz =
            0.3 *
            targetAmp *
            (Math.pow(r, 2.0) * Math.cos(seismicPhase * 1.4) +
              0.15 * Math.sin(seismicPhase * 2.8));
        }

        const rotZ = (-1.8 * dx) / H;
        const rotX = (1.8 * dz) / H;

        node.group.position.x = dx;
        node.group.position.z = dz;
        node.group.rotation.z = rotZ;
        node.group.rotation.x = rotX;

        if (idx === floorNodes.length - 1) {
          swayXTop = dx;
          swayZTop = dz;
        }

        // Stress Heatmap: egilish va yuklama bo'yicha rang o'zgarishi
        const bendingEnvelope = Math.pow(1.0 - r * 0.8, 2.0);
        const dynamicBoost = (Math.hypot(dx, dz) / (targetAmp || 1)) * 0.35 * bendingEnvelope;
        const effectiveStress = Math.min(1.0, node.baseStressRatio + dynamicBoost);

        const stressColor = getStressColor(effectiveStress);
        node.coreMat.color.copy(stressColor);
        node.colMat.color.copy(stressColor);
        node.slabMat.color.copy(stressColor).lerp(new THREE.Color(0xffffff), 0.35);
      });

      // Zamin tebranishi (Ground motion)
      if (foundationMesh) {
        if (p.mode === "Seismic" && p.isPlaying) {
          foundationMesh.position.x = Math.sin(simTime * 9.5) * 0.08 * (p.intensity - 6);
          foundationMesh.position.z = Math.cos(simTime * 8.5) * 0.05 * (p.intensity - 6);
        } else {
          foundationMesh.position.x = 0;
          foundationMesh.position.z = 0;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      // Telemetriyani hisoblash (Top displacement, period, axial load)
      const topDisp = Math.round(Math.hypot(swayXTop, swayZTop) * 1000);
      const vibPeriod = (0.09 * numFloors).toFixed(2);
      const baseLoad = ((numFloors * 20 * 20 * 12) / 1000).toFixed(1);

      setDisplacementMm(topDisp);
      setVibPeriodSec(vibPeriod);
      setBaseLoadMN(baseLoad);
    };

    animate();

    // 6. Resize kuzatuvchisi
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      controls.dispose();
      if (container) container.innerHTML = "";
    };
  }, []);

  return (
    <div className="w-full bg-[#050608]/90 border border-cyan-500/25 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(2,132,199,0.15)] relative overflow-hidden backdrop-blur-xl">
      {/* 1. Sarlavha va Rejim Boshqaruvi */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Building2 size={20} />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-mono text-white flex items-center gap-2">
                <span>HIGH-RISE 3D STRUCTURAL INTEGRITY SIMULATION</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  QMQ 2.01.03-19
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Haqiqiy WebGL 3D seysmik tebranish, karkas yuki va elastik deformatsiya modeli
              </p>
            </div>
          </div>
        </div>

        {/* Yuklama Ssenariysi (Mode: Static, Wind, Seismic) */}
        <div className="flex items-center gap-1.5 p-1 bg-black/60 border border-white/10 rounded-2xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setMode("Static")}
            className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 ${
              mode === "Static"
                ? "bg-cyan-500 text-black shadow-[0_0_15px_#06b6d4]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity size={14} />
            <span>Statik</span>
          </button>

          <button
            onClick={() => setMode("Wind")}
            className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 ${
              mode === "Wind"
                ? "bg-cyan-500 text-black shadow-[0_0_15px_#06b6d4]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Wind size={14} />
            <span>Shamol</span>
          </button>

          <button
            onClick={() => setMode("Seismic")}
            className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 ${
              mode === "Seismic"
                ? "bg-gradient-to-r from-amber-500 to-rose-500 text-black font-bold shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity size={14} />
            <span>Seysmik ({intensity} ball)</span>
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all ml-1"
            title={isPlaying ? "To'xtatish" : "Davom ettirish"}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          </button>
        </div>
      </div>

      {/* 2. REAL-TIME TELEMETRIYA HUD BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-black/50 border border-cyan-500/20 rounded-2xl p-3">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
            Top Displacement
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-400">
              {displacementMm}
            </span>
            <span className="text-xs font-mono text-slate-500">mm</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Limit: ≤ {Math.round((floors * 2.5 * 1000) / 500)} mm (H/500)
          </span>
        </div>

        <div className="bg-black/50 border border-cyan-500/20 rounded-2xl p-3">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
            Vibration Period (T)
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
              {vibPeriodSec}
            </span>
            <span className="text-xs font-mono text-slate-500">soniya</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            T ≈ 0.09 · {floors} qavat
          </span>
        </div>

        <div className="bg-black/50 border border-cyan-500/20 rounded-2xl p-3">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
            Base Axial Load
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
              {baseLoadMN}
            </span>
            <span className="text-xs font-mono text-slate-500">MN</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Raft Slab yuk taqsimoti
          </span>
        </div>

        <div className="bg-black/50 border border-cyan-500/20 rounded-2xl p-3">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
            Seysmik Xavfsizlik
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-sm sm:text-base font-bold font-mono ${
              displacementMm < (floors * 2.5 * 1000) / 500 ? "text-emerald-400" : "text-rose-400"
            }`}>
              {displacementMm < (floors * 2.5 * 1000) / 500 ? "✅ TALABGA MOS" : "⚠️ CHEGARADAN OSHDI"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {selectedCity} (MSK-64: {intensity} ball)
          </span>
        </div>
      </div>

      {/* 3. 3D WebGL Canvas Qutisi */}
      <div className="relative w-full h-[400px] sm:h-[480px] rounded-2xl overflow-hidden border border-white/10 bg-[#030712] shadow-inner">
        {/* Three.js DOM render konteyneri */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* 3D Kursor ko'rsatmasi */}
        <div className="absolute top-3 left-3 pointer-events-none bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-2">
          <Maximize2 size={13} className="text-cyan-400" />
          <span>Sichqoncha / barmoq bilan 360° aylantiring va yaqinlashtiring</span>
        </div>

        {/* Stress Gradient Legend */}
        <div className="absolute bottom-3 right-3 pointer-events-none bg-black/70 backdrop-blur-md p-2.5 rounded-xl border border-white/10 text-[10px] font-mono space-y-1">
          <span className="text-slate-400 block font-bold">KARKAS ZO'RIQISHI (STRESS):</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded bg-cyan-500 inline-block" />
            <span className="text-slate-300">Kam yuk (0.3)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded bg-amber-500 inline-block" />
            <span className="text-slate-300">O'rtacha (0.6)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded bg-rose-500 inline-block" />
            <span className="text-slate-300">Maksimal (0.9+)</span>
          </div>
        </div>
      </div>

      {/* 4. Interaktiv Konstruksiya Qatlamlari va Slayderlar */}
      <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
        {/* Qatlamlar (Toggles) */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-400 mr-1 flex items-center gap-1">
            <Layers size={14} className="text-cyan-400" />
            <span>Qatlamlar:</span>
          </span>

          <button
            onClick={() => setCore(!core)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all border ${
              core
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-white/5 text-slate-500 border-white/5 hover:text-slate-300"
            }`}
          >
            🏢 Yadro (Core)
          </button>

          <button
            onClick={() => setColumns(!columns)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all border ${
              columns
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-white/5 text-slate-500 border-white/5 hover:text-slate-300"
            }`}
          >
            🏛️ Ustunlar (Columns)
          </button>

          <button
            onClick={() => setSlabs(!slabs)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all border ${
              slabs
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-white/5 text-slate-500 border-white/5 hover:text-slate-300"
            }`}
          >
            🔲 Plitalar (Slabs)
          </button>

          <button
            onClick={() => setFoundation(!foundation)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all border ${
              foundation
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                : "bg-white/5 text-slate-500 border-white/5 hover:text-slate-300"
            }`}
          >
            🧱 Poydevor (Raft)
          </button>
        </div>

        {/* Qavatlar va Seysmik Ball Slayderlari */}
        <div className="flex items-center gap-5 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Qavatlar:</span>
            <input
              type="range"
              min="10"
              max="30"
              step="1"
              value={floors}
              onChange={(e) => setFloors(parseInt(e.target.value))}
              className="w-24 sm:w-32 accent-cyan-400 cursor-pointer"
            />
            <span className="text-xs font-bold font-mono text-cyan-400 w-6">{floors}</span>
          </div>

          {mode === "Seismic" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Ball:</span>
              <input
                type="range"
                min="7"
                max="9"
                step="0.1"
                value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                className="w-20 sm:w-28 accent-amber-400 cursor-pointer"
              />
              <span className="text-xs font-bold font-mono text-amber-400 w-8">{intensity}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
