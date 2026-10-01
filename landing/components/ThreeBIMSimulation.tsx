"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Boxes,
  Sliders,
  RotateCcw,
  Flame,
  Grid,
  ShieldCheck,
  ShieldAlert,
  Wind,
  Activity,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Building,
  Layers,
  ChevronDown,
  ChevronUp,
  Box,
  Shapes,
  Cpu
} from "lucide-react";

interface ThreeBIMProps {
  initialFloors?: number;
  selectedCity?: string;
  isScanning?: boolean;
}

type BuildingShape = "box" | "l-shape" | "cylinder" | "tapered";
type StructuralSystem = "core-frame" | "tube" | "outrigger" | "frame-only";
type SimulationMode = "static" | "quake" | "wind";
type MobilePanelTab = "params" | "telemetry" | "view";

export default function ThreeBIMSimulation({
  initialFloors = 20,
  selectedCity = "Toshkent",
  isScanning = false,
}: ThreeBIMProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Fullscreen va Mobil UI Rejimlari
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<MobilePanelTab>("params");

  // 1. Parametrik Model Sozlamalari
  const [shape, setShape] = useState<BuildingShape>("box");
  const [floors, setFloors] = useState<number>(initialFloors);
  const [floorH, setFloorH] = useState<number>(3.3);
  const [width, setWidth] = useState<number>(24);
  const [depth, setDepth] = useState<number>(24);
  const [system, setSystem] = useState<StructuralSystem>("core-frame");
  const [seismicBall, setSeismicBall] = useState<number>(
    selectedCity === "Toshkent" || selectedCity === "Samarqand" || selectedCity === "Andijon" ? 9 : 8
  );

  // 2. Qatlamlar (Layers)
  const [layerCore, setLayerCore] = useState<boolean>(true);
  const [layerColumns, setLayerColumns] = useState<boolean>(true);
  const [layerSlabs, setLayerSlabs] = useState<boolean>(true);
  const [layerRaft, setLayerRaft] = useState<boolean>(true);

  // 3. Vizual Rejimlar
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [heatmap, setHeatmap] = useState<boolean>(false);
  const [simMode, setSimMode] = useState<SimulationMode>("static");
  const [isPanelCollapsed, setIsPanelCollapsed] = useState<boolean>(false);

  // 4. Telemetriya Hisoblari (QMQ 2.01.03-19)
  const [totalHeightM, setTotalHeightM] = useState<number>(floors * floorH);
  const [totalWeightTonnes, setTotalWeightTonnes] = useState<number>(14250);
  const [periodT1Sec, setPeriodT1Sec] = useState<number>(1.42);
  const [baseShearKn, setBaseShearKn] = useState<number>(18420);
  const [driftMm, setDriftMm] = useState<number>(42);
  const [driftLimitMm, setDriftLimitMm] = useState<number>(132);
  const [isDriftSafe, setIsDriftSafe] = useState<boolean>(true);

  // Ref obyektlari — Three.js loop tezkor ishlashi uchun
  const stateRef = useRef({
    shape,
    floors,
    floorH,
    width,
    depth,
    system,
    seismicBall,
    layerCore,
    layerColumns,
    layerSlabs,
    layerRaft,
    wireframe,
    heatmap,
    simMode,
    isScanning,
    quakeTime: 0,
  });

  useEffect(() => {
    stateRef.current = {
      shape,
      floors,
      floorH,
      width,
      depth,
      system,
      seismicBall,
      layerCore,
      layerColumns,
      layerSlabs,
      layerRaft,
      wireframe,
      heatmap,
      simMode,
      isScanning,
      quakeTime: stateRef.current.quakeTime,
    };
  }, [
    shape,
    floors,
    floorH,
    width,
    depth,
    system,
    seismicBall,
    layerCore,
    layerColumns,
    layerSlabs,
    layerRaft,
    wireframe,
    heatmap,
    simMode,
    isScanning,
  ]);

  // Three.js Core Handles
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const buildingGroupRef = useRef<THREE.Group | null>(null);
  const foundationGroupRef = useRef<THREE.Group | null>(null);
  const floorMeshesRef = useRef<Array<{ group: THREE.Group; floorIndex: number }>>([]);
  const animFrameIdRef = useRef<number | null>(null);

  // QMQ Telemetriya hisobi funksiyasi
  const calculateTelemetry = () => {
    const H = floors * floorH;
    const areaFactor = shape === "l-shape" ? 0.75 : shape === "cylinder" ? 0.785 : 1.0;
    const area = width * depth * areaFactor;
    const weightTonnes = Math.round(area * floors * 0.55);

    let tFactor = 0.08;
    if (system === "frame-only") tFactor = 0.11;
    if (system === "outrigger" || system === "tube") tFactor = 0.065;
    const t1 = parseFloat((tFactor * Math.pow(H, 0.75)).toFixed(2));

    let A = 0;
    if (seismicBall === 7) A = 0.1;
    else if (seismicBall === 8) A = 0.2;
    else if (seismicBall === 9) A = 0.4;

    const beta = Math.min(2.5, Math.max(0.8, 1.2 / Math.max(t1, 0.1)));
    const kPsi = system === "frame-only" ? 0.35 : 0.25;
    const baseShear = Math.round(weightTonnes * 9.81 * A * beta * kPsi);

    let driftFactor = 0.00045;
    if (system === "tube") driftFactor *= 0.6;
    if (system === "outrigger") driftFactor *= 0.7;
    if (system === "frame-only") driftFactor *= 1.8;

    const topDrift = Math.round((A * 10 + 0.5) * Math.pow(H, 1.35) * driftFactor * 10);
    const limit = Math.round((H * 1000) / 500);

    setTotalHeightM(H);
    setTotalWeightTonnes(weightTonnes);
    setPeriodT1Sec(t1);
    setBaseShearKn(baseShear);
    setDriftMm(topDrift);
    setDriftLimitMm(limit);
    setIsDriftSafe(topDrift <= limit);
  };

  // Rebuild 3D Meshes
  const rebuild3DStructure = () => {
    const buildingGroup = buildingGroupRef.current;
    const foundationGroup = foundationGroupRef.current;
    const controls = controlsRef.current;
    if (!buildingGroup || !foundationGroup) return;

    // Tozalash
    while (buildingGroup.children.length > 0) {
      const obj = buildingGroup.children[0] as THREE.Mesh;
      buildingGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    }
    while (foundationGroup.children.length > 0) {
      const obj = foundationGroup.children[0] as THREE.Mesh;
      foundationGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    }
    floorMeshesRef.current = [];

    const totalH = floors * floorH;
    if (controls) {
      controls.target.set(0, totalH * 0.42, 0);
    }

    // Materiallar
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      roughness: 0.5,
      metalness: 0.15,
      wireframe: stateRef.current.wireframe,
    });

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x90a4ae,
      roughness: 0.4,
      metalness: 0.1,
      wireframe: stateRef.current.wireframe,
    });

    const columnMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.3,
      metalness: 0.3,
      wireframe: stateRef.current.wireframe,
    });

    // Helper material heatmap generator
    const getFloorMaterial = (floorIdx: number, baseMat: THREE.Material) => {
      if (!stateRef.current.heatmap) return baseMat;
      const stressRatio = 1.0 - floorIdx / floors;
      const color = new THREE.Color();
      if (stressRatio < 0.33) {
        color.lerpColors(new THREE.Color(0x06b6d4), new THREE.Color(0x10b981), stressRatio / 0.33);
      } else if (stressRatio < 0.66) {
        color.lerpColors(new THREE.Color(0x10b981), new THREE.Color(0xfbbf24), (stressRatio - 0.33) / 0.33);
      } else {
        color.lerpColors(new THREE.Color(0xfbbf24), new THREE.Color(0xef4444), (stressRatio - 0.66) / 0.34);
      }
      return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.2,
        wireframe: stateRef.current.wireframe,
      });
    };

    // 1. Poydevor Plitasi (Raft Slab)
    if (stateRef.current.layerRaft) {
      const raftThick = 2.4;
      const raftGeo = new THREE.BoxGeometry(width + 4, raftThick, depth + 4);
      const raftMesh = new THREE.Mesh(raftGeo, concreteMat);
      raftMesh.position.set(0, -raftThick / 2, 0);
      raftMesh.receiveShadow = true;
      raftMesh.castShadow = true;
      foundationGroup.add(raftMesh);
    }

    // 2. Qavatma-qavat konstruktiv elementlar
    const columnSpacing = 6;
    const coreSizeX = Math.max(6, width * 0.28);
    const coreSizeZ = Math.max(6, depth * 0.28);

    for (let f = 0; f < floors; f++) {
      const floorGroup = new THREE.Group();
      const yBase = f * floorH;

      let scale = 1.0;
      if (stateRef.current.shape === "tapered") {
        scale = 1.0 - (f / floors) * 0.38;
      }

      const curW = width * scale;
      const curD = depth * scale;

      // A. Plitalar (Slabs)
      if (stateRef.current.layerSlabs) {
        let slabMesh: THREE.Object3D;
        if (stateRef.current.shape === "cylinder") {
          const slabGeo = new THREE.CylinderGeometry(curW / 2, curW / 2, 0.28, 32);
          slabMesh = new THREE.Mesh(slabGeo, getFloorMaterial(f, concreteMat));
          slabMesh.position.y = yBase + floorH;
        } else if (stateRef.current.shape === "l-shape") {
          const slabGroup = new THREE.Group();
          const part1 = new THREE.Mesh(
            new THREE.BoxGeometry(curW, 0.28, curD * 0.55),
            getFloorMaterial(f, concreteMat)
          );
          part1.position.set(0, yBase + floorH, -curD * 0.225);

          const part2 = new THREE.Mesh(
            new THREE.BoxGeometry(curW * 0.55, 0.28, curD * 0.45),
            getFloorMaterial(f, concreteMat)
          );
          part2.position.set(-curW * 0.225, yBase + floorH, curD * 0.275);

          slabGroup.add(part1);
          slabGroup.add(part2);
          slabMesh = slabGroup;
        } else {
          const slabGeo = new THREE.BoxGeometry(curW, 0.28, curD);
          slabMesh = new THREE.Mesh(slabGeo, getFloorMaterial(f, concreteMat));
          slabMesh.position.y = yBase + floorH;
        }
        slabMesh.castShadow = true;
        slabMesh.receiveShadow = true;
        floorGroup.add(slabMesh);
      }

      // B. Qattiqlik Yadrosi (Shear Core)
      if (stateRef.current.layerCore && stateRef.current.system !== "frame-only") {
        const cThick = 0.4;
        const cMat = getFloorMaterial(f, coreMat);

        const wN = new THREE.Mesh(new THREE.BoxGeometry(coreSizeX * scale, floorH, cThick), cMat);
        wN.position.set(0, yBase + floorH / 2, (coreSizeZ * scale) / 2);

        const wS = new THREE.Mesh(new THREE.BoxGeometry(coreSizeX * scale, floorH, cThick), cMat);
        wS.position.set(0, yBase + floorH / 2, -(coreSizeZ * scale) / 2);

        const wE = new THREE.Mesh(new THREE.BoxGeometry(cThick, floorH, coreSizeZ * scale), cMat);
        wE.position.set((coreSizeX * scale) / 2, yBase + floorH / 2, 0);

        const wW = new THREE.Mesh(new THREE.BoxGeometry(cThick, floorH, coreSizeZ * scale), cMat);
        wW.position.set(-(coreSizeX * scale) / 2, yBase + floorH / 2, 0);

        wN.castShadow = true;
        wS.castShadow = true;
        wE.castShadow = true;
        wW.castShadow = true;

        floorGroup.add(wN, wS, wE, wW);
      }

      // C. Ustunlar (Columns)
      if (stateRef.current.layerColumns) {
        const colThick = Math.max(0.45, 0.85 - (f / floors) * 0.35);
        const colGeo = new THREE.BoxGeometry(colThick, floorH, colThick);
        const colMatInstance = getFloorMaterial(f, columnMat);

        if (stateRef.current.shape === "cylinder") {
          const rad = curW / 2 - 1.2;
          const count = stateRef.current.system === "tube" ? 24 : 12;
          for (let i = 0; i < count; i++) {
            const ang = (i / count) * Math.PI * 2;
            const col = new THREE.Mesh(colGeo, colMatInstance);
            col.position.set(Math.cos(ang) * rad, yBase + floorH / 2, Math.sin(ang) * rad);
            col.castShadow = true;
            floorGroup.add(col);
          }
        } else {
          const numX = Math.round(curW / columnSpacing);
          const numZ = Math.round(curD / columnSpacing);
          const stepX = curW / numX;
          const stepZ = curD / numZ;

          for (let ix = 0; ix <= numX; ix++) {
            for (let iz = 0; iz <= numZ; iz++) {
              const px = -curW / 2 + ix * stepX;
              const pz = -curD / 2 + iz * stepZ;

              const isPerimeter = ix === 0 || ix === numX || iz === 0 || iz === numZ;
              if (stateRef.current.system === "tube" && !isPerimeter) continue;

              if (stateRef.current.layerCore && stateRef.current.system !== "frame-only") {
                if (
                  Math.abs(px) < (coreSizeX * scale) / 2 - 0.4 &&
                  Math.abs(pz) < (coreSizeZ * scale) / 2 - 0.4
                ) {
                  continue;
                }
              }

              if (stateRef.current.shape === "l-shape" && px > 0 && pz > 0) continue;

              const col = new THREE.Mesh(colGeo, colMatInstance);
              col.position.set(px, yBase + floorH / 2, pz);
              col.castShadow = true;
              floorGroup.add(col);
            }
          }
        }
      }

      // D. Outrigger Ferma Tizimi (Mid-height va 3/4 balandlikda po'lat fermalar)
      if (stateRef.current.system === "outrigger") {
        const isOutriggerStory =
          f === Math.floor(floors * 0.45) || f === Math.floor(floors * 0.78);
        if (isOutriggerStory) {
          const trussMat = new THREE.MeshStandardMaterial({
            color: 0xf43f5e,
            metalness: 0.8,
            roughness: 0.25,
          });
          const beamX = new THREE.Mesh(new THREE.BoxGeometry(curW, 1.2, 0.45), trussMat);
          beamX.position.set(0, yBase + floorH / 2, 0);

          const beamZ = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, curD), trussMat);
          beamZ.position.set(0, yBase + floorH / 2, 0);

          floorGroup.add(beamX, beamZ);
        }
      }

      buildingGroup.add(floorGroup);
      floorMeshesRef.current.push({ group: floorGroup, floorIndex: f });
    }
  };

  // Three.js Initsializatsiyasi
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const widthPx = container.clientWidth || 800;
    const heightPx = container.clientHeight || 560;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712);
    scene.fog = new THREE.FogExp2(0x030712, 0.007);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, widthPx / heightPx, 1, 1000);
    camera.position.set(65, 55, 75);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(widthPx, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.target.set(0, 25, 0);
    controlsRef.current = controls;

    // Yoritish tizimi
    const ambient = new THREE.AmbientLight(0xdbeafe, 0.65);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.95);
    sun.position.set(70, 120, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);

    const blueRim = new THREE.DirectionalLight(0x06b6d4, 0.6);
    blueRim.position.set(-60, 40, -60);
    scene.add(blueRim);

    // Zamin va muhandislik koordinata to'ri
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(320, 320),
      new THREE.MeshStandardMaterial({ color: 0x050914, roughness: 0.9, metalness: 0.1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(160, 40, 0x06b6d4, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    // Asosiy guruhlar
    const bGroup = new THREE.Group();
    scene.add(bGroup);
    buildingGroupRef.current = bGroup;

    const fGroup = new THREE.Group();
    scene.add(fGroup);
    foundationGroupRef.current = fGroup;

    // Birinchi qurilish
    rebuild3DStructure();
    calculateTelemetry();

    // Resize tinglovchi
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Animatsiya tsikli
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const state = stateRef.current;
      const floorMeshes = floorMeshesRef.current;

      if (state.simMode === "quake" && state.seismicBall > 0) {
        state.quakeTime += 0.055;
        const amplitude = state.seismicBall * 0.12;

        floorMeshes.forEach((item) => {
          const normalizedH = item.floorIndex / Math.max(state.floors, 1);
          const swayX =
            Math.sin(state.quakeTime * 2.5) * Math.pow(normalizedH, 1.8) * amplitude * 2.8;
          const swayZ =
            Math.cos(state.quakeTime * 1.8) * Math.pow(normalizedH, 2.0) * (amplitude * 1.2);

          item.group.position.x = swayX;
          item.group.position.z = swayZ;
          item.group.rotation.z = -swayX * 0.008;
          item.group.rotation.x = swayZ * 0.008;
        });
      } else if (state.simMode === "wind") {
        state.quakeTime += 0.03;
        const gust = Math.sin(state.quakeTime * 4.0) * 0.35 + 1.0;

        floorMeshes.forEach((item) => {
          const normalizedH = item.floorIndex / Math.max(state.floors, 1);
          const deflX = Math.pow(normalizedH, 1.9) * 2.2 * gust;
          item.group.position.x = deflX;
          item.group.position.z = 0;
          item.group.rotation.z = -deflX * 0.007;
          item.group.rotation.x = 0;
        });
      } else {
        floorMeshes.forEach((item) => {
          item.group.position.lerp(new THREE.Vector3(0, 0, 0), 0.1);
          item.group.rotation.z *= 0.85;
          item.group.rotation.x *= 0.85;
        });
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
      container.innerHTML = "";
    };
  }, []);

  // Parametrlar o'zgarganda qayta qurish
  // Fullscreen o'zgarganda 3D renderer o'lchamini yangilash
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const timer = setTimeout(handleResize, 120);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // Parametrlar o'zgarganda qayta qurish
  useEffect(() => {
    rebuild3DStructure();
    calculateTelemetry();
  }, [shape, floors, floorH, width, depth, system, layerCore, layerColumns, layerSlabs, layerRaft, wireframe, heatmap, seismicBall]);

  return (
    <div
      className={`transition-all duration-300 ${
        isFullscreen
          ? "fixed inset-0 z-[100] w-screen h-screen overflow-hidden bg-[#030712]"
          : "relative w-full h-[620px] sm:h-[680px] lg:h-[720px] rounded-3xl overflow-hidden border border-cyan-500/30 bg-[#030712] shadow-[0_0_50px_rgba(6,182,212,0.1)]"
      }`}
    >
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Yuqori Panel (Header Toolbar) */}
      <header className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 right-2.5 sm:right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Sarlavha & Logo */}
        <div className="backdrop-blur-xl bg-slate-900/85 border border-white/10 px-3 py-1.5 sm:py-2 rounded-2xl flex items-center gap-2.5 pointer-events-auto shadow-xl">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
            <Boxes size={16} />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold font-mono tracking-tight text-white flex items-center gap-1.5">
              <span>STRUKTURA 3D</span>
              <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                QMQ 2.01.03-19
              </span>
            </h2>
            <p className="hidden sm:block text-[10px] text-slate-400 font-mono">Parametrik bino va seysmik tahlili</p>
          </div>
        </div>

        {/* Mobil & Planshet Tab Switcher (Kichik ekranda overlap'ni 100% yo'qotadi) */}
        <div className="flex lg:hidden backdrop-blur-xl bg-slate-900/90 border border-cyan-500/30 p-1 rounded-2xl gap-1 pointer-events-auto shadow-xl">
          <button
            onClick={() => setMobileTab("params")}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
              mobileTab === "params"
                ? "bg-cyan-500 text-black shadow-[0_0_10px_#06b6d4]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sliders size={12} />
            <span>Sozlash</span>
          </button>
          <button
            onClick={() => setMobileTab("telemetry")}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
              mobileTab === "telemetry"
                ? "bg-emerald-400 text-black shadow-[0_0_10px_#10b981]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Activity size={12} />
            <span>QMQ</span>
          </button>
          <button
            onClick={() => setMobileTab("view")}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
              mobileTab === "view"
                ? "bg-blue-600 text-white shadow-[0_0_10px_#2563eb]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Eye size={12} />
            <span>3D</span>
          </button>
        </div>

        {/* Tezkor Tugmalar */}
        <div className="backdrop-blur-xl bg-slate-900/85 border border-white/10 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl flex items-center gap-1 sm:gap-1.5 pointer-events-auto shadow-xl">
          <button
            onClick={() => {
              if (cameraRef.current && controlsRef.current) {
                cameraRef.current.position.set(65, 55, 75);
                controlsRef.current.target.set(0, (floors * floorH) * 0.42, 0);
              }
            }}
            title="Kamerani tiklash"
            className="px-2 py-1 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium flex items-center gap-1 transition-all"
          >
            <RotateCcw size={13} className="text-cyan-400" />
            <span className="hidden md:inline">Kamera</span>
          </button>
          <button
            onClick={() => setWireframe(!wireframe)}
            title="Simli karkas rejimi"
            className={`px-2 py-1 sm:py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-1 transition-all ${
              wireframe ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-slate-800 hover:bg-slate-700 text-slate-200"
            }`}
          >
            <Grid size={13} className="text-amber-400" />
            <span className="hidden md:inline">Wireframe</span>
          </button>
          <button
            onClick={() => setHeatmap(!heatmap)}
            title="Zo'riqish gradiyenti (Stress Heatmap)"
            className={`px-2 py-1 sm:py-1.5 rounded-xl text-xs font-mono font-medium flex items-center gap-1 transition-all ${
              heatmap ? "bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)]" : "bg-slate-800 hover:bg-slate-700 text-slate-200"
            }`}
          >
            <Flame size={13} className="text-rose-400" />
            <span className="text-[11px] sm:text-xs">Heatmap: {heatmap ? "ON" : "OFF"}</span>
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Kichraytirish" : "To'liq ekranga yoyish"}
            className="p-1 sm:px-2 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-mono font-medium flex items-center gap-1 transition-all"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="hidden md:inline">{isFullscreen ? "Chiqish" : "To'liq"}</span>
          </button>
        </div>
      </header>

      {/* Chap Sozlamalar Paneli (Configurator) */}
      <aside
        className={`absolute top-16 left-2.5 sm:left-3 bottom-3 z-20 backdrop-blur-xl bg-slate-950/90 border border-white/10 rounded-2xl flex-col pointer-events-auto transition-all duration-300 overflow-hidden shadow-2xl ${
          isPanelCollapsed ? "w-12" : "w-[calc(100%-20px)] sm:w-80 max-w-[340px]"
        } ${
          mobileTab === "params" ? "flex" : "hidden lg:flex"
        }`}
      >
        <div className="px-3.5 py-2.5 border-b border-white/10 flex justify-between items-center bg-slate-900/60">
          {!isPanelCollapsed && (
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2 font-mono">
              <Sliders size={14} /> Parametrik Sozlash
            </span>
          )}
          <button
            onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
            title={isPanelCollapsed ? "Panelni ochish" : "Panelni yashirish"}
          >
            {isPanelCollapsed ? <Sliders size={16} className="text-cyan-400" /> : <ChevronDown size={16} />}
          </button>
        </div>

        {!isPanelCollapsed && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 space-y-3.5 text-xs font-mono">
            {/* 1. Me'moriy Shakl */}
            <div className="space-y-1.5 bg-slate-900/40 p-2.5 rounded-xl border border-white/5">
              <label className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
                <span>ARXITEKTURA SHAKLI</span>
                <Shapes size={12} className="text-cyan-400" />
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ["box", "To'g'ri burchakli"],
                    ["l-shape", "L-Shaklli"],
                    ["cylinder", "Silindrsimon"],
                    ["tapered", "Torayuvchi"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setShape(key)}
                    className={`px-2 py-2 rounded-lg font-semibold text-[10px] sm:text-[11px] text-center leading-tight transition-all ${
                      shape === key
                        ? "bg-cyan-600 text-white font-bold shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                        : "bg-slate-800/80 hover:bg-slate-700 text-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. O'lchamlar va Qavatlar */}
            <div className="space-y-2.5 bg-slate-900/40 p-2.5 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold text-slate-400 block">QAVAT VA GABARITLAR</span>
              <div>
                <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
                  <span>Qavatlar soni:</span>
                  <span className="font-bold text-cyan-400">{floors} qavat</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="45"
                  value={floors}
                  onChange={(e) => setFloors(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg cursor-pointer accent-cyan-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 mb-1 text-[11px]">
                  <span>Qavat balandligi:</span>
                  <span className="font-bold text-cyan-400">{floorH.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  min="3.0"
                  max="4.5"
                  step="0.1"
                  value={floorH}
                  onChange={(e) => setFloorH(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg cursor-pointer accent-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-slate-300 mb-1 text-[10px]">
                    <span>Kenglik (X):</span>
                    <span className="text-cyan-400 font-bold">{width}m</span>
                  </div>
                  <input
                    type="range"
                    min="16"
                    max="48"
                    step="4"
                    value={width}
                    onChange={(e) => setWidth(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg cursor-pointer accent-cyan-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-300 mb-1 text-[10px]">
                    <span>Uzunlik (Z):</span>
                    <span className="text-cyan-400 font-bold">{depth}m</span>
                  </div>
                  <input
                    type="range"
                    min="16"
                    max="48"
                    step="4"
                    value={depth}
                    onChange={(e) => setDepth(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* 3. Konstruktiv Tizim */}
            <div className="space-y-1.5 bg-slate-900/40 p-2.5 rounded-xl border border-white/5">
              <label className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
                <span>KONSTRUKTIV TIZIM</span>
                <Cpu size={12} className="text-cyan-400" />
              </label>
              <select
                value={system}
                onChange={(e) => setSystem(e.target.value as StructuralSystem)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-[11px] rounded-lg p-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none font-mono"
              >
                <option value="core-frame">Karkas-Diafragma (Core + Frame)</option>
                <option value="tube">Trubasimon (Tube-in-Tube)</option>
                <option value="outrigger">Outrigger Ferma Tizimi</option>
                <option value="frame-only">Oddiy Ramali Karkas</option>
              </select>
            </div>

            {/* 4. Konstruktiv Qatlamlar */}
            <div className="space-y-1.5 bg-slate-900/40 p-2.5 rounded-xl border border-white/5">
              <span className="text-[10px] font-bold text-slate-400 block mb-1">QATLAMLARNI BOSHQARISH</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={layerCore}
                    onChange={(e) => setLayerCore(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-0"
                  />
                  <span>Yadro (Core)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={layerColumns}
                    onChange={(e) => setLayerColumns(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-0"
                  />
                  <span>Ustunlar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={layerSlabs}
                    onChange={(e) => setLayerSlabs(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-0"
                  />
                  <span>Plitalar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={layerRaft}
                    onChange={(e) => setLayerRaft(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-0"
                  />
                  <span>Poydevor</span>
                </label>
              </div>
            </div>

            {/* 5. Dinamik Yuklama & Zilzila */}
            <div className="space-y-2 bg-slate-900/40 p-2.5 rounded-xl border border-white/5">
              <div className="flex justify-between text-slate-300 text-[11px]">
                <span>Seysmiklik:</span>
                <span className="font-bold text-rose-400">{seismicBall} Ball (A={seismicBall === 9 ? "0.4g" : seismicBall === 8 ? "0.2g" : "0.1g"})</span>
              </div>
              <input
                type="range"
                min="7"
                max="9"
                step="1"
                value={seismicBall}
                onChange={(e) => setSeismicBall(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg cursor-pointer accent-rose-500"
              />

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setSimMode(simMode === "quake" ? "static" : "quake")}
                  className={`flex-1 py-1.5 rounded-lg text-white font-semibold flex items-center justify-center gap-1.5 transition text-[11px] ${
                    simMode === "quake" ? "bg-rose-600 ring-2 ring-white" : "bg-rose-600/80 hover:bg-rose-600"
                  }`}
                >
                  <Activity size={13} /> Zilzila
                </button>
                <button
                  onClick={() => setSimMode(simMode === "wind" ? "static" : "wind")}
                  className={`flex-1 py-1.5 rounded-lg text-white font-semibold flex items-center justify-center gap-1.5 transition text-[11px] ${
                    simMode === "wind" ? "bg-cyan-600 ring-2 ring-white" : "bg-cyan-700/80 hover:bg-cyan-600"
                  }`}
                >
                  <Wind size={13} /> Shamol
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* O'ng Muhandislik Telemetriyasi (HUD Telemetry) */}
      <aside
        className={`absolute top-16 right-2.5 sm:right-3 bottom-3 sm:bottom-auto z-20 w-[calc(100%-20px)] sm:w-72 max-w-[320px] backdrop-blur-xl bg-slate-950/90 border border-white/10 rounded-2xl p-3 sm:p-3.5 pointer-events-auto space-y-2.5 font-mono shadow-2xl overflow-y-auto ${
          mobileTab === "telemetry" ? "block" : "hidden lg:block"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Activity size={14} className="text-cyan-400" /> Telemetriya (QMQ)
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Faol" />
        </div>

        {/* Asosiy Raqamlar */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
            <div className="text-[10px] text-slate-400">Balandlik (H)</div>
            <div className="text-sm font-bold text-cyan-400">{totalHeightM.toFixed(1)} m</div>
          </div>
          <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5">
            <div className="text-[10px] text-slate-400">Massa (D+0.5L)</div>
            <div className="text-sm font-bold text-slate-200">{totalWeightTonnes.toLocaleString()} t</div>
          </div>
        </div>

        {/* Xususiy davr T1 */}
        <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5 text-xs space-y-1">
          <div className="flex justify-between text-slate-400 text-[10px]">
            <span>Xususiy davr (T₁):</span>
            <span className="font-bold text-amber-300">{periodT1Sec} s</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-400 h-full transition-all duration-300"
              style={{ width: `${Math.min(100, (periodT1Sec / 3.0) * 100)}%` }}
            />
          </div>
        </div>

        {/* Kesuvchi Kuch Q0 */}
        <div className="bg-slate-900/60 p-2 rounded-xl border border-white/5 text-xs space-y-0.5">
          <div className="flex justify-between text-slate-400 text-[10px]">
            <span>Kesuvchi kuch (Q₀):</span>
            <span className="font-bold text-rose-400">{baseShearKn.toLocaleString()} kN</span>
          </div>
          <div className="text-[9px] text-slate-500 italic">Poydevor kesimi bo'yicha</div>
        </div>

        {/* Gorizontal Siljish (Drift Check) */}
        <div
          className={`p-2.5 rounded-xl border space-y-1 transition-colors ${
            isDriftSafe
              ? "bg-emerald-950/40 border-emerald-500/40"
              : "bg-rose-950/40 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 text-[10px]">Siljish (Δ):</span>
            <span className={`font-bold ${isDriftSafe ? "text-emerald-400" : "text-rose-400"}`}>
              {driftMm} mm
            </span>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Cheklov (H / 500):</span>
            <span>{driftLimitMm} mm</span>
          </div>
          <div
            className={`mt-1 text-[10px] font-bold text-center py-1 rounded flex items-center justify-center gap-1.5 ${
              isDriftSafe
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-rose-500/20 text-rose-300 animate-bounce"
            }`}
          >
            {isDriftSafe ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
            <span>{isDriftSafe ? "QMQ CHEKLOVIGA MOS (OK)" : "CHEKLOVDAN OSHDI (XAVF)"}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
