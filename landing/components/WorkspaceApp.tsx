"use client";

import { useState, useRef, ChangeEvent } from "react";
import { 
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle, 
  ShieldAlert, ShieldCheck, ArrowRight, RefreshCw, Download, 
  Layers, Building2, Flame, Accessibility, Car, Ruler, FileCheck,
  Compass, Cpu, FileSpreadsheet
} from "lucide-react";
import HolographicBIMViewer from "./HolographicBIMViewer";
import ThreeBIMSimulation from "./ThreeBIMSimulation";

interface AuditResultItem {
  id: string;
  code: string;
  clause: string;
  category: string;
  title: string;
  severity: "critical" | "high" | "medium";
  status: "pass" | "fail";
  actual_value: string;
  required_value: string;
  message: string;
  recommendation: string;
}

export default function WorkspaceApp() {
  const [file, setFile] = useState<File | null>(null);
  const [buildingType, setBuildingType] = useState<string>("residential");
  const [city, setCity] = useState<string>("Toshkent");
  const [floors, setFloors] = useState<number>(9);
  const [ceilingHeight, setCeilingHeight] = useState<number>(2.70);
  const [rampSlope, setRampSlope] = useState<number>(8.0);
  const [fireRoadWidth, setFireRoadWidth] = useState<number>(6.0);
  const [parkingRatio, setParkingRatio] = useState<number>(1.0);
  const [activeLayer, setActiveLayer] = useState<string>("all");

  const [isAuditing, setIsAuditing] = useState(false);
  const [auditStep, setAuditStep] = useState<string>("");
  const [results, setResults] = useState<AuditResultItem[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const [currentCheckId, setCurrentCheckId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [coveragePercent, setCoveragePercent] = useState<number | null>(null);
  const [isEkspertizaReady, setIsEkspertizaReady] = useState<boolean | null>(null);

  const runAudit = async () => {
    setIsAuditing(true);
    setResults(null);
    setErrorMessage(null);
    setAuditStep("Chizma tahlili uchun serverga uzatilmoqda...");

    try {
      // 1. Faylni tayyorlash (agar fayl tanlanmagan bo'lsa, namunaviy chizma yaratamiz)
      let uploadFile = file;
      if (!uploadFile) {
        setAuditStep("Namunaviy arxitektura chizmasi tayyorlanmoqda...");
        const samplePdf = `%PDF-1.4\n% Me'morAI Namunaviy Loyiha Chizmasi\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n212\n%%EOF`;
        uploadFile = new File([samplePdf], "namuna_turar_joy.pdf", { type: "application/pdf" });
      }

      setAuditStep("Chizma yuklanmoqda (POST /api/checks/run)...");

      const buildingData = {
        city,
        building_type: buildingType,
        floors,
        ceiling_height_m: ceilingHeight,
        ramp_slope_percent: rampSlope,
        ramp_rise_m: 0.5,
        ramp_run_m: Number((0.5 / (rampSlope / 100)).toFixed(2)),
        ramp_width_m: 1.2,
        fire_access_road_width_m: fireRoadWidth,
        parking_ratio: parkingRatio,
        apartments: 48,
        parking_spots: Math.round(48 * parkingRatio),
        evacuation_door_width_m: 0.95
      };

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("project_id", "a0000000-0000-0000-0000-000000000001");
      formData.append("building_data", JSON.stringify(buildingData));

      const response = await fetch("/api/checks/run", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server xatosi: ${response.status}`);
      }

      const checkReport = await response.json();
      const checkId = checkReport.id;
      setCurrentCheckId(checkId);

      setAuditStep("QMQ / ShNQ qoidalari dvigateli tahlilni boshladi...");

      // 2. Natijani polling orqali kutish (har 800ms)
      let attempts = 0;
      const maxAttempts = 35;
      let completedReport: any = null;

      while (attempts < maxAttempts) {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 800));

        if (attempts === 2) setAuditStep("ShNQ 2.07.02-22 (Inkluzivlik, pandus va yo'laklar) tahlili...");
        if (attempts === 4) setAuditStep("ShNQ 2.01.02-04 (Yong'in xavfsizligi va oraliqlar) tahlili...");
        if (attempts === 6) setAuditStep("QMQ 2.01.03-19 (Seysmik mustahkamlik va choklar)...");

        try {
          const pollRes = await fetch(`/api/checks/${checkId}`);
          if (pollRes.ok) {
            const current = await pollRes.json();
            if (
              current.status === "completed" ||
              current.status === "requires_review" ||
              current.status === "failed"
            ) {
              completedReport = current;
              break;
            }
          }
        } catch {
          // Tarmoq vaqtinchalik uzilishida davom etamiz
        }
      }

      if (!completedReport) {
        throw new Error("Tahlil vaqti tugadi yoki serverdan javob kelmadi.");
      }

      if (completedReport.status === "failed") {
        throw new Error(completedReport.error_message || "Chizmani tekshirish jarayonida xatolik yuz berdi.");
      }

      // 3. Backend javobini UI formatiga o'tkazish
      const rawResults = completedReport.results || [];
      const mappedResults: AuditResultItem[] = rawResults.map((r: any) => ({
        id: r.rule_id || r.id || "RULE",
        code: r.code || "QMQ",
        clause: r.clause || "§1",
        category: r.category || "Arxitektura",
        title: r.title_uz || r.title || "Qurilish me'yori",
        severity: (r.severity === "critical" || r.severity === "high" || r.severity === "medium") ? r.severity : "medium",
        status: (r.status === "pass" || r.status === "fail") ? r.status : (r.status === "requires_review" ? "fail" : "pass"),
        actual_value: r.actual_value !== undefined && r.actual_value !== null ? String(r.actual_value) : "—",
        required_value: r.required_value !== undefined && r.required_value !== null ? String(r.required_value) : "—",
        message: r.message_uz || r.message || "Tahlil yakunlandi.",
        recommendation: r.recommendation_uz || r.recommendation || "Me'yor talablariga rioya qiling."
      }));

      setResults(mappedResults);
      if (completedReport.summary) {
        setCoveragePercent(completedReport.summary.coverage_percent ?? null);
        setIsEkspertizaReady(Boolean(completedReport.summary.ekspertiza_ready));
      }

      if (typeof window !== "undefined" && (window as any).Telegram?.WebApp?.HapticFeedback) {
        const hasFailures = mappedResults.some((r) => r.status === "fail");
        (window as any).Telegram.WebApp.HapticFeedback.notificationOccurred(hasFailures ? "error" : "success");
      }
    } catch (err: any) {
      console.error("Audit xatoligi:", err);
      setErrorMessage(err.message || "Tahlil jarayonida kutilmagan xatolik yuz berdi.");
    } finally {
      setIsAuditing(false);
      setAuditStep("");
    }
  };

  const handleDownloadReport = () => {
    if (!currentCheckId) {
      alert("Iltimos, avval ekspertiza tekshiruvini ishga tushiring.");
      return;
    }
    const reportUrl = `/api/checks/${currentCheckId}/pdf`;
    const link = document.createElement("a");
    link.href = reportUrl;
    link.target = "_blank";
    link.download = `MeMorAI_Texnik_Ekspertiza_${currentCheckId.slice(0, 8)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const failCount = results ? results.filter(r => r.status === "fail").length : 0;
  const passCount = results ? results.filter(r => r.status === "pass").length : 0;

  const [viewMode, setViewMode] = useState<"3d_webgl" | "2d_blueprint">("3d_webgl");

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 pb-20 space-y-6">
      {/* 1. BIM VIZUAL REJIM TANLASH (3D WebGL vs 2D Blueprint) */}
      <div className="flex items-center justify-between gap-3 px-1 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-black/60 border border-white/10 rounded-2xl">
          <button
            onClick={() => setViewMode("3d_webgl")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              viewMode === "3d_webgl"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🏢 3D WebGL Simulyatsiya (Seysmik & Dinamika)</span>
          </button>
          <button
            onClick={() => setViewMode("2d_blueprint")}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-2 ${
              viewMode === "2d_blueprint"
                ? "bg-cyan-500 text-black shadow-[0_0_20px_#06b6d4]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>📐 2D Konstruktiv Tizimlar (BIM Blueprint)</span>
          </button>
        </div>
      </div>

      {/* 2. FAOL BIM STUDIYASI */}
      {viewMode === "3d_webgl" ? (
        <ThreeBIMSimulation
          initialFloors={floors}
          selectedCity={city}
          isScanning={isAuditing}
        />
      ) : (
        <HolographicBIMViewer
          isScanning={isAuditing}
          selectedCity={city}
          rampSlope={rampSlope}
          ceilingHeight={ceilingHeight}
          fireRoadWidth={fireRoadWidth}
          activeLayer={activeLayer}
          setActiveLayer={setActiveLayer}
          floorsCount={floors}
        />
      )}

      {/* Xatolik xabarnomasi */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-mono flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <XCircle size={18} className="text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button 
            onClick={() => setErrorMessage(null)} 
            className="text-xs text-rose-400 hover:text-white underline font-bold"
          >
            Yopish
          </button>
        </div>
      )}

      {/* 2. CHIZMA YUKLASH VA QMQ PARAMETRLARI */}
      {!results && !isAuditing && (
        <div className="space-y-5">
          {/* Arxitektura Drag & Drop Zone */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              file 
                ? "border-emerald-500/50 bg-emerald-950/20" 
                : "border-cyan-500/20 bg-[#030712]/80 hover:border-cyan-500/50 hover:bg-cyan-500/5 shadow-[0_0_30px_rgba(6,182,212,0.06)]"
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".pdf,.dxf,.png,.jpg,.jpeg" 
              className="hidden" 
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <FileCheck size={30} />
                </div>
                <div className="text-sm font-semibold text-white mt-1">{file.name}</div>
                <div className="text-xs text-slate-400 font-mono">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Chizma yuklandi
                </div>
                <span className="text-[11px] text-cyan-400 underline mt-1">Boshqa chizmani tanlash</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Upload size={28} />
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  Arxitektura chizmasini (PDF yoki DXF) tashlang
                </div>
                <div className="text-xs text-slate-400 font-mono max-w-sm">
                  Formatlar: <strong>PDF</strong> (Vision AI), <strong>DXF</strong> (Vektor CAD), <strong>PNG/JPG</strong>
                  <span className="block text-[11px] text-amber-400/90 mt-1">AutoCAD (.dwg) fayllarini DXF formatida saqlab yuklang.</span>
                </div>
                <span className="mt-2 text-xs font-mono font-medium px-3.5 py-1.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  + Faylni yuklash
                </span>
              </div>
            )}
          </div>

          {/* QMQ / ShNQ Parametrlari va Nazorat Paneli */}
          <div className="bg-[#030712]/90 border border-cyan-500/20 rounded-3xl p-5 sm:p-6 space-y-4 shadow-[0_0_30px_rgba(6,182,212,0.08)]">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-cyan-500/10">
              <div className="flex items-center gap-2 text-sm font-bold text-white font-mono uppercase tracking-wide">
                <Cpu size={18} className="text-cyan-400" />
                <span>Ekspertiza Parametrlari & Me'yoriy Nazorat</span>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-black border border-cyan-500/20 text-cyan-300">
                Deterministik tekshiruv
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  Bino vazifasi va turi:
                </label>
                <select
                  value={buildingType}
                  onChange={(e) => setBuildingType(e.target.value)}
                  className="w-full bg-black/60 border border-cyan-500/20 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="residential">Ko'p xonadonli turar-joy binosi</option>
                  <option value="public">Jamoat va ma'muriy bino</option>
                  <option value="commercial">Tijorat va savdo markazi</option>
                  <option value="highrise">Baland bino (50 metrdan yuqori)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  Qurilish hududi (QMQ 2.01.03-19):
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-black/60 border border-cyan-500/20 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Toshkent">Toshkent shahri (9 ball)</option>
                  <option value="Samarqand">Samarqand (9 ball)</option>
                  <option value="Andijon">Andijon (9 ball)</option>
                  <option value="Namangan">Namangan (9 ball)</option>
                  <option value="Buxoro">Buxoro (8 ball)</option>
                  <option value="Farg'ona">Farg'ona (8 ball)</option>
                  <option value="Qarshi">Qarshi (7 ball)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">
                  BIM Qavatlar soni: <strong className="text-cyan-300">{floors} qavat</strong>
                </label>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="range"
                    min="3"
                    max="10"
                    value={floors}
                    onChange={(e) => setFloors(parseInt(e.target.value) || 6)}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-cyan-300 w-8 text-right">{floors}Q</span>
                </div>
              </div>
            </div>

            {/* O'lcham Ko'rsatkichlari */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-black/40 border border-cyan-500/15 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-cyan-400/90 font-mono mb-1">
                  <Ruler size={14} />
                  <span>Shift balandligi</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.05"
                    min="2.0"
                    max="5.0"
                    value={ceilingHeight}
                    onChange={(e) => setCeilingHeight(parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent text-sm font-bold font-mono text-white focus:outline-none"
                  />
                  <span className="text-xs text-slate-400 font-mono">m</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">ShNQ 2.08: ≥2.70m</span>
              </div>

              <div className="bg-black/40 border border-cyan-500/15 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-cyan-400/90 font-mono mb-1">
                  <Accessibility size={14} />
                  <span>Pandus qiyaligi</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="25"
                    value={rampSlope}
                    onChange={(e) => setRampSlope(parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent text-sm font-bold font-mono text-white focus:outline-none"
                  />
                  <span className="text-xs text-slate-400 font-mono">%</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">ShNQ 2.07: ≤8.33%</span>
              </div>

              <div className="bg-black/40 border border-cyan-500/15 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-cyan-400/90 font-mono mb-1">
                  <Flame size={14} />
                  <span>Yong'in yo'li</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    min="2"
                    max="15"
                    value={fireRoadWidth}
                    onChange={(e) => setFireRoadWidth(parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent text-sm font-bold font-mono text-white focus:outline-none"
                  />
                  <span className="text-xs text-slate-400 font-mono">m</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">ShNQ 2.01: ≥6.0m</span>
              </div>

              <div className="bg-black/40 border border-cyan-500/15 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-cyan-400/90 font-mono mb-1">
                  <Car size={14} />
                  <span>Parkovka nisbati</span>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0.2"
                    max="3"
                    value={parkingRatio}
                    onChange={(e) => setParkingRatio(parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent text-sm font-bold font-mono text-white focus:outline-none"
                  />
                  <span className="text-xs text-slate-400 font-mono">joy</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">ShNQ 2.08: ≥1.0</span>
              </div>
            </div>

            {/* Boshlash Tugmasi */}
            <button
              onClick={runAudit}
              className="w-full mt-4 py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.4)]"
            >
              <span>⚡ QMQ / ShNQ EKSPERTIZA TAHLILINI BOSHLASH</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 3. NATIJALAR DOSKASI */}
      {results && (
        <div className="space-y-6">
          {/* Ekspertiza Xulosa Qutisi */}
          <div className={`rounded-3xl p-5 sm:p-7 border ${
            failCount > 0 
              ? "bg-rose-950/20 border-rose-500/40 shadow-[0_0_40px_rgba(244,63,94,0.15)]" 
              : "bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.15)]"
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  failCount > 0 
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" 
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`}>
                  {failCount > 0 ? <ShieldAlert size={30} /> : <ShieldCheck size={30} />}
                </div>
                <div>
                  <h2 className="text-base sm:text-xl font-bold font-mono text-white">
                    {failCount > 0 
                      ? `🔴 ME'YORIY NOMUVOFIQLIKLAR ANIQLANDI (${failCount} TA TAQIQ)` 
                      : "🟢 ShNQ / QMQ ME'YORLARIGA PARAMETRIK MOS (PASS)"}
                  </h2>
                  <p className="text-xs font-mono text-slate-300 mt-1">
                    {file ? file.name : "Kiritilgan BIM parametrlari"} • {passCount} ta talab bajarildi, {failCount} ta cheklovdan oshish aniqlandi
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={handleDownloadReport}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500/30 to-blue-600/30 hover:from-cyan-500/40 hover:to-blue-600/40 text-cyan-200 border border-cyan-400/50 font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all"
                  title="ShNQ va QMQ andozasidagi QR-kodli muhandislik hisobot ma'lumotnomasi"
                >
                  <Download size={16} className="text-cyan-400" />
                  <span>📄 Muhandislik Hisoboti PDF (QR)</span>
                </button>
                <button
                  onClick={() => setResults(null)}
                  className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs flex items-center justify-center"
                  title="Qayta tekshirish"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            {/* Qonuniy Mas'uliyat Cheklovi (Legal Disclaimer) */}
            <div className="mt-4 pt-3.5 border-t border-white/10 flex items-start gap-2.5 text-[11px] font-mono text-slate-400">
              <ShieldAlert size={15} className="text-amber-400 shrink-0 mt-0.5" />
              <p>
                <strong>Yuridik Eslatma (O'zR Shaharsozlik Kodeksi 37-38 moddalari):</strong> Ushbu ma'lumotnoma axborot-muhandislik hisobi bo'lib, davlat shaharsozlik ekspertizasi o'rnini bosmaydi. Konstruktiv xavfsizlik va loyiha yechimlari bo'yicha yakuniy javobgarlik Bosh loyiha muhandisi (GIP) va Bosh loyiha me'mori (GAP) zimmasida qoladi.
              </p>
            </div>
          </div>

          {/* Qoidalar Bo'yicha Tafsilot */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 px-1">
              BIM Qatlamlari va Me'yoriy Moddalar Tafsiloti:
            </h3>

            {results.map((item) => (
              <div 
                key={item.id}
                className={`bg-[#030712]/90 border rounded-2xl p-4 sm:p-5 transition-all ${
                  item.status === "pass" 
                    ? "border-emerald-500/25 hover:border-emerald-500/45" 
                    : "border-rose-500/35 hover:border-rose-500/60 bg-rose-950/10 shadow-[0_0_20px_rgba(244,63,94,0.08)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    {item.status === "pass" ? (
                      <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle size={20} className="text-rose-400 shrink-0" />
                    )}
                    <h4 className="text-sm font-bold font-mono text-white">{item.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-0.5 rounded bg-black/60 text-cyan-300 font-mono text-[11px] border border-cyan-500/20">
                      {item.code} {item.clause}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                      item.status === "pass" 
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                        : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    }`}>
                      {item.status === "pass" ? "MUVOFIQ" : "RAD ETILADI"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 my-2 text-xs bg-black/50 p-3 rounded-xl border border-white/5 font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Chizma qiymati:</span>
                    <strong className={item.status === "pass" ? "text-emerald-300" : "text-rose-300"}>
                      {item.actual_value}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Rasmiy me'yor:</span>
                    <strong className="text-slate-200">{item.required_value}</strong>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-2 font-mono">
                  {item.message}
                </p>

                {item.status === "fail" && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2.5 font-mono">
                    <AlertTriangle size={16} className="shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <strong>Tuzatish tavsiyasi:</strong> {item.recommendation}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Qayta Boshlash */}
          <div className="pt-4 text-center">
            <button
              onClick={() => { setResults(null); setFile(null); }}
              className="px-6 py-3 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-medium text-xs transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw size={16} />
              <span>Yangi chizma tekshirish</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
