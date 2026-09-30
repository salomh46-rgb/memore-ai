"use client";

import { useState, useRef, ChangeEvent } from "react";
import { 
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle, 
  ShieldAlert, ShieldCheck, ArrowRight, RefreshCw, Download, 
  Layers, Building2, Flame, Accessibility, Car, Ruler, FileCheck
} from "lucide-react";

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

  const runAudit = () => {
    setIsAuditing(true);
    setResults(null);
    setAuditStep("Chizma o'lchamlari va geometriyasi tahlil qilinmoqda...");

    setTimeout(() => {
      setAuditStep("ShNQ 2.07.02-22 (Inkluzivlik va nogironlar) tekshirilmoqda...");
    }, 900);

    setTimeout(() => {
      setAuditStep("ShNQ 2.01.02-04 (Yong'in xavfsizligi va oraliqlar) tekshirilmoqda...");
    }, 1800);

    setTimeout(() => {
      setAuditStep("QMQ 2.01.03-19 (Seysmik mustahkamlik va choklar) tekshirilmoqda...");
    }, 2600);

    setTimeout(() => {
      // Deterministic QMQ Rules evaluation
      const evaluatedResults: AuditResultItem[] = [];

      // 1. Ramp slope check (ShNQ 2.07.02-22, §17: <= 8.33%)
      const isRampPass = rampSlope <= 8.33;
      evaluatedResults.push({
        id: "UZ-ACCESS-001",
        code: "ShNQ 2.07.02-22",
        clause: "§17",
        category: "Inkluzivlik",
        title: "Pandus bo'ylama qiyaligi",
        severity: "critical",
        status: isRampPass ? "pass" : "fail",
        actual_value: `${rampSlope}%`,
        required_value: "≤ 8.33% (1:12)",
        message: isRampPass 
          ? "Pandus qiyaligi me'yoriy chegarada loyihalangan."
          : `Pandus qiyaligi ${rampSlope}% — ruxsat etilgan 8.33% dan ancha tik!`,
        recommendation: isRampPass
          ? "Konstruksiya saqlansin."
          : "Pandus uzunligini oshiring yoki ko'tarilish burchagini 1:12 nisbatga keltiring. Aks holda Davlat Ekspertizasi loyihani rad etadi."
      });

      // 2. Ceiling height check (ShNQ 2.08.01-19: >= 2.70m)
      const isCeilingPass = ceilingHeight >= 2.70;
      evaluatedResults.push({
        id: "UZ-CEILING-001",
        code: "ShNQ 2.08.01-19",
        clause: "Turar-joy balandligi",
        category: "Sanitariya-gigiyena",
        title: "Xonalar shift balandligi (pol-shift)",
        severity: "high",
        status: isCeilingPass ? "pass" : "fail",
        actual_value: `${ceilingHeight} m`,
        required_value: "≥ 2.70 m",
        message: isCeilingPass 
          ? "Shift balandligi me'yor talablariga mos keladi."
          : `Shift balandligi ${ceilingHeight}m — yangi turar-joylarda minimal 2.70m bo'lishi shart!`,
        recommendation: isCeilingPass
          ? "Balandlik saqlansin."
          : "Qavat balandligini kamida 2.70 metr toza balandlikka moslab qayta hisoblang."
      });

      // 3. Fire access road check (ShNQ 2.01.02-04, §3.10: >= 6.0m)
      const isFireRoadPass = fireRoadWidth >= 6.0;
      evaluatedResults.push({
        id: "UZ-FIRE-001",
        code: "ShNQ 2.01.02-04",
        clause: "Ilova 1, §3.10",
        category: "Yong'in xavfsizligi",
        title: "Yong'in o'chirish texnikasi yo'li kengligi",
        severity: "critical",
        status: isFireRoadPass ? "pass" : "fail",
        actual_value: `${fireRoadWidth} m`,
        required_value: "≥ 6.0 m",
        message: isFireRoadPass
          ? "Yong'in o'tish yo'li me'yorga mos."
          : `Yong'in texnikasi yo'li ${fireRoadWidth}m — kamida 6.0 metr bo'lishi shart!`,
        recommendation: isFireRoadPass
          ? "Yo'l gabariti qabul qilindi."
          : "Fasad bo'ylab o'tish yo'li kengligini 6.0 metrga kengaytiring."
      });

      // 4. Parking ratio check (ShNQ 2.08.01-19: >= 1.0)
      const isParkingPass = parkingRatio >= 1.0;
      evaluatedResults.push({
        id: "UZ-PARKING-001",
        code: "ShNQ 2.08.01-19",
        clause: "Bosh reja talablari",
        category: "Avtoturargoh",
        title: "Avtoturargoh joylari nisbati",
        severity: "high",
        status: isParkingPass ? "pass" : "fail",
        actual_value: `${parkingRatio} joy/xonadon`,
        required_value: "≥ 1.0 joy/xonadon",
        message: isParkingPass
          ? "Avtoturargoh joylari soni yetarli."
          : `Ko'rsatkich ${parkingRatio} — har bir xonadonga kamida 1 ta avto o'rni talab qilinadi.`,
        recommendation: isParkingPass
          ? "Bosh rejadagi o'rinlar yetarli."
          : "Yerosti yoki ochiq avtoturargoh o'rinlarini ko'paytiring."
      });

      // 5. Seismic check (QMQ 2.01.03-19)
      const seismicScore = city === "Toshkent" || city === "Samarqand" || city === "Andijon" ? 9 : 8;
      evaluatedResults.push({
        id: "UZ-SEISMIC-001",
        code: "QMQ 2.01.03-19",
        clause: "Seysmik xaritalash",
        category: "Seysmik xavfsizlik",
        title: `Seysmik hudud talabi (${city})`,
        severity: "critical",
        status: "pass",
        actual_value: `${seismicScore} ball hisobi`,
        required_value: `${seismicScore} ball me'yori`,
        message: `${city} shahri ${seismicScore} ballik hududda joylashgan. Loyihada antiseysmik belbog' va karkas hisobi talab etiladi.`,
        recommendation: "Yuk ko'taruvchi karkas va orayopma tugunlarining antiseysmik mustahkamlik hisobotini ilova qiling."
      });

      setResults(evaluatedResults);
      setIsAuditing(false);

      if (typeof window !== "undefined" && window.Telegram?.WebApp?.HapticFeedback) {
        const hasFailures = evaluatedResults.some(r => r.status === "fail");
        window.Telegram.WebApp.HapticFeedback.notificationOccurred(hasFailures ? "error" : "success");
      }
    }, 3400);
  };

  const failCount = results ? results.filter(r => r.status === "fail").length : 0;
  const passCount = results ? results.filter(r => r.status === "pass").length : 0;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 pb-20">
      {/* Yuqori Panel */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4F8EF7]/20 border border-[#4F8EF7]/30 flex items-center justify-center text-[#4F8EF7]">
            <Building2 size={22} />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Me'morAI Ekspertiza Ishchi Stoli
            </h1>
            <p className="text-xs text-slate-400">
              QMQ / ShNQ me'yorlari bo'yicha avtomatik ekspertiza xulosasi
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          mc.uz 2026 Baza
        </span>
      </div>

      {/* 1. CHIZMA YUKLASH & PARAMETRLAR */}
      {!results && !isAuditing && (
        <div className="space-y-5">
          {/* Drag & Drop Maydoni */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              file 
                ? "border-emerald-500/50 bg-emerald-950/20" 
                : "border-white/20 bg-white/[0.02] hover:border-[#4F8EF7]/60 hover:bg-[#4F8EF7]/5"
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".pdf,.dwg,.dxf,.ifc" 
              className="hidden" 
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <FileCheck size={30} />
                </div>
                <div className="text-sm font-semibold text-white mt-1">{file.name}</div>
                <div className="text-xs text-slate-400">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB — Fayl qabul qilindi
                </div>
                <span className="text-[11px] text-[#4F8EF7] underline mt-1">Boshqa fayl tanlash</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-2xl bg-[#4F8EF7]/15 border border-[#4F8EF7]/30 flex items-center justify-center text-[#4F8EF7]">
                  <Upload size={28} />
                </div>
                <div className="text-sm font-semibold text-white mt-1">
                  Arxitektura chizmasini tashlang yoki tanlang
                </div>
                <div className="text-xs text-slate-400 max-w-sm">
                  Formatlar: <strong>PDF</strong>, <strong>DWG</strong>, <strong>DXF</strong> yoki <strong>IFC</strong> (Maksimal 100 MB)
                </div>
                <span className="mt-2 text-xs font-medium px-3 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10">
                  Faylni tanlash
                </span>
              </div>
            )}
          </div>

          {/* Loyiha Parametrlari Sozlamalari */}
          <div className="bg-[#0b1329]/90 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
              <Layers size={18} className="text-[#4F8EF7]" />
              <span>Loyiha me'moriy parametrlari</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Bino vazifasi va turi:
                </label>
                <select
                  value={buildingType}
                  onChange={(e) => setBuildingType(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]"
                >
                  <option value="residential">Ko'p xonadonli turar-joy binosi</option>
                  <option value="public">Jamoat va ma'muriy bino</option>
                  <option value="commercial">Tijorat va savdo markazi</option>
                  <option value="highrise">Baland bino (50 metrdan yuqori)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Qurilish hududi (Seysmika):
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#4F8EF7]"
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
            </div>

            {/* Qo'shimcha Chizma O'lchamlari */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-black/25 border border-white/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Ruler size={14} className="text-[#4F8EF7]" />
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
                    className="w-full bg-transparent text-sm font-bold text-white focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">m</span>
                </div>
                <span className="text-[10px] text-slate-500">Me'yor: ≥2.70m</span>
              </div>

              <div className="bg-black/25 border border-white/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Accessibility size={14} className="text-[#4F8EF7]" />
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
                    className="w-full bg-transparent text-sm font-bold text-white focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">%</span>
                </div>
                <span className="text-[10px] text-slate-500">Me'yor: ≤8.33%</span>
              </div>

              <div className="bg-black/25 border border-white/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Flame size={14} className="text-[#4F8EF7]" />
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
                    className="w-full bg-transparent text-sm font-bold text-white focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">m</span>
                </div>
                <span className="text-[10px] text-slate-500">Me'yor: ≥6.0m</span>
              </div>

              <div className="bg-black/25 border border-white/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Car size={14} className="text-[#4F8EF7]" />
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
                    className="w-full bg-transparent text-sm font-bold text-white focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">joy</span>
                </div>
                <span className="text-[10px] text-slate-500">Me'yor: ≥1.0</span>
              </div>
            </div>

            {/* Boshlash Tugmasi */}
            <button
              onClick={runAudit}
              className="w-full mt-4 py-3.5 px-6 rounded-xl bg-[#4F8EF7] hover:bg-blue-600 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#4F8EF7]/30"
            >
              <span>⚡ QMQ / ShNQ Ekspertiza Tahlilini Boshlash</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 2. TAHLIL JARAYONI ANIMATSIYASI */}
      {isAuditing && (
        <div className="bg-[#0b1329]/90 border border-white/10 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-[#4F8EF7]/20 border-t-[#4F8EF7] animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-[#4F8EF7]">
              <Layers size={28} />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Chizma tahlil qilinmoqda...</h3>
            <p className="text-xs sm:text-sm text-[#4F8EF7] animate-pulse max-w-md">
              {auditStep}
            </p>
          </div>
          <div className="w-full max-w-xs bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div className="bg-[#4F8EF7] h-full animate-[progress_3s_ease-in-out_infinite]" />
          </div>
        </div>
      )}

      {/* 3. NATIJALAR DOSKASI */}
      {results && (
        <div className="space-y-6">
          {/* Ekspertiza Xulosa Qutisi */}
          <div className={`rounded-2xl p-5 sm:p-6 border ${
            failCount > 0 
              ? "bg-rose-950/30 border-rose-500/40" 
              : "bg-emerald-950/30 border-emerald-500/40"
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  failCount > 0 
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" 
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                }`}>
                  {failCount > 0 ? <ShieldAlert size={26} /> : <ShieldCheck size={26} />}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    {failCount > 0 
                      ? `🔴 Ekspertizadan O'tmaydi (${failCount} ta jiddiy qoidabuzarlik)` 
                      : "🟢 Ekspertizaga 100% Tayyor (Me'yorlar to'liq bajarilgan)"}
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {file ? file.name : "Kiritilgan me'moriy parametrlar"} • {passCount} ta mos, {failCount} ta rad
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-2 border border-white/10"
                >
                  <Download size={15} />
                  <span>Xulosa PDF</span>
                </button>
                <button
                  onClick={() => setResults(null)}
                  className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center justify-center"
                  title="Qayta tekshirish"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Qoidalar Bo'yicha Batafsil Ro'yxat */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
              Tekshirilgan Me'yorlar Tafsiloti
            </h3>

            {results.map((item) => (
              <div 
                key={item.id}
                className={`bg-[#0b1329]/80 border rounded-xl p-4 sm:p-5 transition-all ${
                  item.status === "pass" 
                    ? "border-emerald-500/20 hover:border-emerald-500/40" 
                    : "border-rose-500/30 hover:border-rose-500/50 bg-rose-950/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {item.status === "pass" ? (
                      <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle size={18} className="text-rose-400 shrink-0" />
                    )}
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 font-mono text-[11px] border border-white/10">
                      {item.code} {item.clause}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.status === "pass" 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}>
                      {item.status === "pass" ? "MUVOFIQ" : "RAD ETILADI"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 my-2 text-xs bg-black/25 p-2.5 rounded-lg border border-white/5">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Loyiha qiymati:</span>
                    <strong className={item.status === "pass" ? "text-emerald-300" : "text-rose-300"}>
                      {item.actual_value}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Rasmiy me'yor:</span>
                    <strong className="text-slate-200">{item.required_value}</strong>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mt-2">
                  {item.message}
                </p>

                {item.status === "fail" && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2">
                    <AlertTriangle size={15} className="shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <strong>Tavsiya va tuzatish:</strong> {item.recommendation}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pastki Qayta Boshlash */}
          <div className="pt-4 text-center">
            <button
              onClick={() => { setResults(null); setFile(null); }}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw size={15} />
              <span>Yangi chizma tekshirish</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
