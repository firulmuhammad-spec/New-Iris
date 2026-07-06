import React from "react";
import { Registration, PointResult, checkIsOffSpec, Signature } from "../types";
import { Check, ShieldCheck, AlertTriangle } from "lucide-react";

const ELECTRICAL_PARAMS: { [key: string]: string[] } = {
  motor_listrik: [
    "Merk",
    "Type",
    "RPM",
    "Voltage Rating",
    "Hz / kW / Ampere",
    "Ins class / IP",
    "Duty / PF",
    "No. Seri"
  ],
  gearcase_motor: [
    "Merk",
    "Type",
    "RPM Input / Output",
    "Phase / Hz / kW",
    "Class / IP",
    "No. Seri"
  ],
  vibrator: [
    "Merk",
    "Type",
    "RPM",
    "Voltage Rating",
    "Hz / kW / Ampere",
    "Ins class / IP",
    "Duty / PF",
    "No. Seri"
  ]
};

interface ReportDocumentProps {
  registration: Registration;
  hideFilepath?: boolean;
  standards?: any[];
  registrations?: Registration[];
  signatures?: Signature[];
}

export default function ReportDocument({ 
  registration, 
  hideFilepath = false, 
  standards = [], 
  registrations = [],
  signatures = []
}: ReportDocumentProps) {
  
  const [showRawData, setShowRawData] = React.useState(false);
  
  // Find all peer registrations under the same PPJ to support multiple items in 1 single report
  const peerRegistrations = registrations && registrations.length > 0
    ? registrations.filter(r => r.ppjCode === registration.ppjCode && (r.status === registration.status || r.status === "Terbit"))
    : [registration];

  // Sort them by registration number so they look organized
  const sortedPeers = [...peerRegistrations].sort((a, b) => a.noReg.localeCompare(b.noReg));
  const primaryReg = sortedPeers[0] || registration;

  const {
    ppjCode,
    ppjFull,
    prCode,
    poCode,
    vendor,
    category,
    standardName,
    tanggalPPJ,
    tanggalDiterima,
    tanggalDiuji = tanggalDiterima,
    tanggalTerbit = tanggalDiuji,
    pengujiInitials = "RS",
    reviewerInitials = "BS",
    trustCardId = `TC-${registration.noReg}-VERIFY`,
  } = primaryReg;

  // Prioritize direct registration prop (which tracks fast checkbox updates in modal)
  const useQrSignature = registration.useQrSignature !== undefined 
    ? registration.useQrSignature 
    : (primaryReg.useQrSignature !== false);

  // Find active signer dynamically from master signatures
  const activeSigner = signatures && signatures.length > 0 ? signatures.find(s => s.active) : null;
  const signerName = activeSigner ? activeSigner.name : "Drs. Ragil Sulistiyo, M.T.";
  const signerPosition = activeSigner ? activeSigner.position : "VP Inspeksi Rotating & Khusus";
  const signatureType = activeSigner ? (activeSigner.signatureType || "qrcode") : "qrcode";
  const signatureImage = activeSigner ? (activeSigner.signatureImage || "") : "";

  // Use primary registration's No Surat or compute fallback
  const noSurat = primaryReg.noSurat || `${primaryReg.noReg}/PR.00.02/90/MI/${new Date().getFullYear()}`;

  // Format date to local readable Indonesian (e.g. "16 Maret 2026")
  const formatDateIndo = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const months = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
      ];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  // Helper helper to calculate the average of a parameter
  const getAverageValue = (points: any[], paramName: string) => {
    let sum = 0;
    let count = 0;
    points.forEach(pt => {
      let rawVal = pt.values[paramName];
      if (rawVal !== undefined && rawVal !== null && rawVal.trim() !== "" && rawVal.trim() !== "-") {
        let cleanStr = rawVal.trim();
        if (cleanStr.endsWith("*")) {
          cleanStr = cleanStr.slice(0, -1).trim();
        }
        const num = parseFloat(cleanStr);
        if (!isNaN(num)) {
          sum += num;
          count++;
        }
      }
    });
    if (count > 0) {
      const avg = sum / count;
      return avg.toFixed(2).replace(/\.00$/, "");
    }
    return "-";
  };

  // Find all peer registrations under the same PPJ to support multiple items in 1 single report
  const matchedStandard = standards?.find(s => s.name?.toLowerCase() === standardName?.toLowerCase());

  // Render neat comparison dynamic rows based on Standard specs or results keys
  const getParams = () => {
    const keys = new Set<string>();
    
    // 1. Add static standard parameters if matched
    if (matchedStandard && matchedStandard.parameters) {
      matchedStandard.parameters.forEach((p: any) => keys.add(p.name));
    }
    
    // 2. Add any unique keys found in results (such as dynamically added custom parameters)
    sortedPeers.forEach(pr => {
      (pr.results || []).forEach(pt => {
        Object.keys(pt.values || {}).forEach(k => {
          // Exclude base64 image keys from regular table parameter rows
          if (!k.endsWith("_photo") && k !== "manometer_photo" && k !== "all_valves_photo" && k !== "active_test_photo") {
            keys.add(k);
          }
        });
      });
    });
    
    return Array.from(keys);
  };

  // Create a unified list of points across all items under same report
  const finalPointsList = sortedPeers.flatMap(pr => 
    (pr.results || []).map(pt => ({
      ...pt,
      parentReg: pr
    }))
  );

  let parameters = getParams().filter(param => {
    // If a parameter has no value filled (is empty string or only whitespace or '-') across ALL test points,
    // we omit/exclude it from the report table completely as requested.
    return finalPointsList.some(pt => {
      const val = pt.values[param];
      return val !== undefined && val !== null && val.trim() !== "" && val.trim() !== "-";
    });
  });

  // HIDE specific parameters depending on category and publication state
  // REQUIREMENT C.6: parameter "Berat/9m" is hidden on certified reports (status === "Terbit"), only show in review
  if (category === "benang" && registration.status === "Terbit") {
    parameters = parameters.filter(param => {
      const pLower = param.toLowerCase();
      return pLower !== "berat/9m" && pLower !== "berat / 9m" && pLower !== "berat";
    });
  }

  const isElectrical = category?.toLowerCase() === "kelistrikan" || category?.toLowerCase() === "motor listrik" || category?.toLowerCase() === "motor_listrik";

  // Check if there is any off-spec deviation across all points
  const hasOffSpec = finalPointsList.some(pt => {
    if (isElectrical) {
      const subType = registration.categoryOptions?.electricalType || "motor_listrik";
      const paramsList = ELECTRICAL_PARAMS[subType] || ELECTRICAL_PARAMS.motor_listrik;
      return paramsList.some(param => {
        const poVal = pt.values[`${param} (Sesuai PO)`] || "";
        const npVal = pt.values[`${param} (Sesuai Nameplate)`] || "";
        return poVal.trim() && npVal.trim() && poVal.trim().toLowerCase() !== npVal.trim().toLowerCase();
      });
    }

    return parameters.some(param => {
      let stdParam = matchedStandard?.parameters?.find((p: any) => p.name === param);
      if (!stdParam) {
        // Look up in custom parameters
        for (const pr of sortedPeers) {
          const cp = pr.customParams?.find((p: any) => p.name === param);
          if (cp) {
            stdParam = cp;
            break;
          }
        }
      }
      return checkIsOffSpec(pt.values[param], stdParam?.spec);
    });
  });

  // Generate clean system footprint printed at the footer instead of hardcoded network filesystem
  const getMockFilepath = () => {
    return `SISTEM DIGITALISASI LAPORAN ITRK // ID VERIFIKASI: INTEGRITY-${trustCardId} // TANGGAL TERBIT: ${formatDateIndo(tanggalTerbit).toUpperCase()}`;
  };

  // Construct URL for QR code
  const validationUrl = `${window.location.origin}?tab=validation&ppj=${ppjCode}&year=${new Date(tanggalPPJ || Date.now()).getFullYear()}`;

  // Custom visual labels for Kelistrikan sub-categories
  const showSubCategoryLabel = () => {
    if (category === "kelistrikan") {
      const sub = registration.categoryOptions?.electricalType || "";
      if (sub === "motor_listrik") return "Kelistrikan - Motor Listrik (AC/DC)";
      if (sub === "vibrator") return "Kelistrikan - Vibrator Motor";
      if (sub === "gearcase_motor") return "Kelistrikan - GearCase Motor";
      return "Kelistrikan - Motor Listrik";
    }
    return null;
  };


  return (
    <div 
      id={`report-sheet-${registration.id}`}
      className="bg-white text-black p-5 md:p-7 shadow-md w-full max-w-[800px] mx-auto border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0 page-break relative font-sans leading-relaxed text-xs"
    >
      {/* Dynamic Printing Style Fix to enforce A4 paper container size, prevent cut-offs and rounded edges */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #report-sheet-${registration.id} {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0px !important;
            padding: 0px !important;
            margin: 0px !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Document Watermark for Trust */}
      <div className="absolute top-[35%] left-[30%] right-[30%] opacity-[0.02] pointer-events-none select-none flex flex-col items-center justify-center">
        <ShieldCheck className="w-56 h-56 text-emerald-950" />
        <span className="text-3xl font-black mt-1 tracking-widest text-[#006A4E]">ITRK CERTIFIED</span>
      </div>

      {/* Header */}
      <div className="flex justify-between items-start border-b border-black pb-2 mb-3.5">
        <div>
          <div className="font-bold text-xs tracking-wider uppercase">PT PETROKIMIA GRESIK</div>
          <div className="font-extrabold text-sm tracking-tight text-emerald-900 border-l-4 border-emerald-700 pl-2 mt-0.5 uppercase">
            DEPARTEMEN INSPEKSI TEKNIK ROTATING & KHUSUS
          </div>
        </div>
        <div className="text-right text-[10px]">
          <div className="font-bold border border-black px-1.5 py-0.5 bg-slate-100">FM : 38-4210</div>
          <div className="text-[9px] text-slate-500 mt-0.5">ITRK-MI-REPORTS</div>
        </div>
      </div>

      {/* Report Title */}
      <div className="text-center mb-3.5 relative">
        <h1 className="text-lg md:text-xl font-extrabold tracking-wide underline uppercase">LAPORAN PENGUJIAN</h1>
        <p className="text-xs font-semibold mt-0.5">Nomor Surat: {noSurat}</p>

        {/* Overall Compliance Seal */}
        <div className="absolute top-0 right-0 print:right-0">
          {hasOffSpec ? (
            <div className="border border-red-600 text-red-600 uppercase font-black text-[9px] px-2 py-0.5 rounded bg-red-50/50 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> OFF-SPECIFICATION
            </div>
          ) : (
            <div className="border border-emerald-700 text-emerald-700 uppercase font-black text-[9px] px-2 py-0.5 rounded bg-emerald-50/50 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> MEMENUHI SPESIFIKASI
            </div>
          )}
        </div>
      </div>

      {/* Compact Metadata Detail Section - 2 Columns Layout - Issue 8 & 9 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5 mb-3.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/20 text-[11px] text-slate-800 leading-tight">
        
        {/* Left Column */}
        <div className="space-y-1.5">
          {/* Item details with corresponding PR */}
          <div>
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-0.5">Daftar Barang & Nomor PR:</span>
            <div className="space-y-0.5">
              {sortedPeers.map((pr, idx) => {
                const itemPr = pr.prCode && pr.prCode !== "null" && pr.prCode !== "UNASSIGNED" ? pr.prCode : prCode;
                return (
                  <div key={pr.id} className="text-slate-900 leading-tight text-[11px]">
                    <span className="font-extrabold">{sortedPeers.length > 1 ? `${idx + 1}. ` : ""} {pr.itemName}</span>
                    <span className="font-semibold text-slate-500 text-[10px] ml-1 font-mono">
                      (Qty: {pr.quantity || "1 Pcs"} | PR: {itemPr})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-0.5">Pekerjaan / Vendor & PO:</span>
            <div className="text-slate-905">
              <span className="font-extrabold mr-1">{vendor}</span>
              <span className="text-slate-350 font-light">|</span>
              <span className="font-mono font-bold text-emerald-800 ml-1 text-[11.5px]">PO: {poCode}</span>
            </div>
          </div>

          {/* Show plate number if category is karung or benang - Issue 9 */}
          {(category === "karung" || category === "benang") && (
            <div className="pt-1.5 border-t border-slate-205">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-0.5">Plat Nomor Pengirim:</span>
              <span className="font-mono font-extrabold text-[10.5px] text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded inline-block border border-indigo-150 uppercase">
                {registration.platNomor || "Belum diinput"}
              </span>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-1.5 border-t md:border-t-0 md:border-l border-slate-200 pt-1.5 md:pt-0 md:pl-4">
          <div>
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-0.5">Dibuat Untuk:</span>
            <div className="text-slate-900 leading-tight">
              <span className="font-extrabold block">VP Pengelolaan Persediaan Suku Cadang & Bahan Baku (PPSB)</span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Berdasarkan PPJ No: <strong className="font-mono text-slate-800 font-bold">{ppjFull}</strong>, {formatDateIndo(tanggalPPJ)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-0.5">Tanggal Diterima:</span>
              <span className="font-semibold text-slate-900">{formatDateIndo(tanggalDiterima)}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-0.5">Tanggal Diuji:</span>
              <span className="font-semibold text-slate-950">{formatDateIndo(tanggalDiuji)}</span>
            </div>
          </div>

          {category !== "Valve" && (
            <div>
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-0.5">Alat Uji Laboratorium:</span>
              <span className="font-medium text-slate-900 block leading-tight text-[10.5px]">
                {(() => {
                  const allTools = new Set<string>();
                  sortedPeers.forEach(pr => {
                    if (pr.selectedTools) {
                      pr.selectedTools.forEach(t => allTools.add(t));
                    }
                  });
                  if (allTools.size > 0) {
                    return Array.from(allTools).join(", ");
                  }
                  if (category === "logam") return "LIBS Metal Analyzer & Brinell Hardness Tester";
                  if (category === "kelistrikan") return "Insulation tester, Kyoritsu 3132A";
                  if (category === "karung") return "Tensile Machine & Sieve Mesh Indicators";
                  if (category === "benang") return "Mechanical Thread Tension Tester";
                  if (category === "filter cloth") return "Air Permeability Differential Test Apparatus";
                  if (category === "rubber") return "Durometer Shore A Hardness Gauge";
                  return "Alat Uji Standar ITRK";
                })()}
              </span>
            </div>
          )}
        </div>

      </div>

      <div className="flex justify-between items-center mb-2 flex-wrap gap-2 text-slate-800">
        <div className="font-bold text-slate-700 text-xs">HASIL EVALUASI PENGUJIAN:</div>
        <div className="font-semibold text-emerald-800 italic text-[11px]">
          {category === "Valve" ? "Lampiran Dokumentasi Pengujian Tekanan" : "Tabel Komparasi Pengujian Spesifikasi Terlampir"}
        </div>
      </div>

      {/* Subcategory Label for Kelistrikan */}
      {showSubCategoryLabel() && (
        <div className="mb-2 text-[10px] font-black text-indigo-700 uppercase tracking-widest bg-indigo-50 border border-indigo-150 inline-block px-2.5 py-1 rounded">
          ⚙️ {showSubCategoryLabel()}
        </div>
      )}

      {/* Utility toggle button for Karung & Filter Cloth to preview raw results - Issue 2 */}
      {(category === "karung" || category === "filter cloth") && (
        <div className="mb-4 flex justify-between items-center bg-indigo-50/40 border border-indigo-150 rounded-lg p-2.5 no-print">
          <div className="flex items-center gap-2 text-xs font-medium text-indigo-900">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
            </span>
            <span>
              Laporan menampilkan <strong>Nilai Rata-rata</strong> saja (Minimal 5x Pengujian).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowRawData(!showRawData)}
            className="text-[10px] font-bold bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-50 hover:border-indigo-400 px-3 py-1.5 rounded cursor-pointer transition-all uppercase tracking-wide shrink-0"
          >
            {showRawData ? "Sembunyikan Raw Data" : "Lihat Raw Data Pengujian"}
          </button>
        </div>
      )}

      {/* Dynamic Results Table - Hiding standard table entirely for Valve and Kelistrikan */}
      {category !== "Valve" && !isElectrical && (
        <div className="mb-5 overflow-x-auto">
          {(() => {
            const showAverageOnly = (category === "karung" || category === "filter cloth") && !showRawData;
            const showBothTrialsAndAverage = (category === "karung" || category === "filter cloth") && showRawData;
          const colSpanCount = 2 + (showAverageOnly ? 0 : finalPointsList.length) + ((showAverageOnly || showBothTrialsAndAverage) ? 1 : 0);

          return (
            <table className="w-full border-2 border-black border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border-2 border-black p-2 text-left font-bold w-[35%] uppercase">
                    PARAMETER UJI<br/>
                    <span className="text-[9px] text-slate-600 font-semibold uppercase">{standardName} {primaryReg.standardSource ? `(${primaryReg.standardSource})` : ""}</span>
                  </th>
                  <th className="border-2 border-black p-2 text-center font-bold w-[25%] uppercase bg-slate-100/50 text-[11px]">
                    BATAS ACUAN SPESIFIKASI
                  </th>
                  
                  {/* Individual trials column */}
                  {!showAverageOnly && finalPointsList.map((pt) => {
                    const isSingleResult = finalPointsList.length === 1;
                    return (
                      <th key={`${pt.parentReg.id}-${pt.pointIndex}`} className="border-2 border-black p-2 text-center font-bold bg-slate-50/50 min-w-[100px] max-w-[150px]">
                        {sortedPeers.length > 1 ? (
                          <span className="text-[9px] text-emerald-900 bg-emerald-50 border border-emerald-200 block uppercase font-black px-1 py-0.5 rounded-full max-w-[100px] mx-auto mb-1 font-mono">
                            BARANG #{sortedPeers.findIndex(p => p.id === pt.parentReg.id) + 1}
                          </span>
                        ) : (
                          <span className="block uppercase text-[9px] text-slate-655 font-bold mb-0.5">Hasil Uji</span>
                        )}
                        <span className="text-[11px] font-black text-indigo-950 block">
                          {isSingleResult 
                            ? "Hasil Pengukuran" 
                            : `Titik ke-${pt.pointIndex}`}
                        </span>
                        {/* Keterangan Uji (Test Location) - Finding 2 */}
                        {pt.keteranganUji ? (
                          <span className="block mt-1 text-[8.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-150 rounded px-1 py-0.5 leading-tight break-words" title={pt.keteranganUji}>
                            📍 {pt.keteranganUji}
                          </span>
                        ) : (
                          <span className="block mt-1 text-[8.5px] font-semibold text-slate-400 border border-transparent rounded px-1 py-0.5 leading-tight">
                            &nbsp;
                          </span>
                        )}

                      </th>
                    );
                  })}

                  {/* Average column */}
                  {(showAverageOnly || showBothTrialsAndAverage) && (
                    <th className="border-2 border-black p-2 text-center font-bold uppercase bg-indigo-50/50 text-indigo-950">
                      <span className="block text-[9px] text-indigo-705 text-center">RATA-RATA</span>
                      <span className="text-[10px] font-extrabold text-indigo-900 border-t pt-0.5 border-indigo-200 block mt-0.5">(AVERAGE)</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {parameters.map((param) => {
                  let stdParam = matchedStandard?.parameters?.find((p: any) => p.name === param);
                  
                  if (!stdParam) {
                    // Look up in custom parameters of parent or peer registrations
                    for (const pr of sortedPeers) {
                      const cp = pr.customParams?.find((p: any) => p.name === param);
                      if (cp) {
                        stdParam = cp;
                        break;
                      }
                    }
                  }

                  const specDisplay = stdParam ? `${stdParam.spec || "-"} ${stdParam.unit && stdParam.unit !== "Text" ? stdParam.unit : ""}` : "-";
                  return (
                    <tr key={param} className="hover:bg-slate-50/50 w-full bg-white">
                      {/* Parameter name */}
                      <td className="border border-black px-3 py-1.5 font-bold text-slate-800">
                        {param}
                      </td>
                      {/* Spec limit */}
                      <td className="border border-black px-3 py-1.5 text-center text-slate-700 font-semibold bg-slate-50/55">
                        {specDisplay}
                      </td>
                      
                       {/* Result points columns */}
                      {!showAverageOnly && finalPointsList.map((pt) => {
                        // Finding 3: Resolve dynamic local standard for this specific test point if overriden
                        let localStdParam = stdParam;
                        let specOverridden = false;
                        if (pt.overrideStandardId) {
                           const matchedOverride = (standards || []).find(s => s.id === pt.overrideStandardId);
                           if (matchedOverride) {
                             const foundParam = matchedOverride.parameters.find((p: any) => p.name === param);
                             if (foundParam) {
                               localStdParam = foundParam;
                               specOverridden = true;
                             }
                           }
                        }

                        const rawVal = pt.values[param] || "-";
                        const isValOffSpec = checkIsOffSpec(rawVal, localStdParam?.spec);
                        
                        // Automatically append asterisk (*) and bold if off-spec
                        const displayVal = isValOffSpec 
                          ? (rawVal.trim().endsWith("*") ? rawVal.trim() : `${rawVal.trim()}*`) 
                          : rawVal;

                        const pointSpec = localStdParam?.spec || "-";
                        const pointUnit = localStdParam?.unit && localStdParam.unit !== "Text" ? localStdParam.unit : "";
                        const formattedPointSpec = pointSpec !== "-" ? `${pointSpec} ${pointUnit}`.trim() : "";

                        return (
                          <td 
                            key={`${pt.parentReg.id}-${pt.pointIndex}`} 
                            className={`border border-black px-2.5 py-1.5 text-center align-middle ${
                              isValOffSpec ? "bg-red-50 text-red-700 font-bold" : "text-slate-950 bg-white"
                            }`}
                          >
                            {displayVal}
                          </td>
                        );
                      })}

                      {/* Average cell */}
                      {(showAverageOnly || showBothTrialsAndAverage) && (() => {
                        const avgVal = getAverageValue(finalPointsList, param);
                        const isAvgOffSpec = checkIsOffSpec(avgVal, stdParam?.spec);
                        const displayAvg = isAvgOffSpec 
                          ? (avgVal.endsWith("*") ? avgVal : `${avgVal}*`) 
                          : avgVal;

                        return (
                          <td className={`border border-black px-2.5 py-1.5 text-center font-extrabold bg-indigo-50/20 ${
                            isAvgOffSpec ? "text-red-700 bg-red-50 font-black" : "text-indigo-950 font-bold"
                          }`}>
                            {displayAvg}
                          </td>
                        );
                      })()}
                    </tr>
                  );
                })}
                {parameters.length === 0 && (
                  <tr>
                    <td colSpan={colSpanCount} className="p-8 text-center text-slate-400 italic">
                      Belum ada parameter pengujian yang dimasukkan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          );
        })()}
        
        {/* Outlier indicator notice */}
        {hasOffSpec && (
          <p className="text-xs text-red-600 mt-2.5 font-semibold italic flex items-center gap-1.5 bg-red-50 p-2 border border-red-200 rounded-lg">
            <span>⚠️</span> Catatan: Tanda asterik (*) yang tebal menunjukkan deviasi parameter diluar spesifikasi batasan acuan standard (OFF-SPECIFICATION).
          </p>
        )}
      </div>
    )}

      {/* Custom Table for Kelistrikan Category */}
      {isElectrical && (
        <div className="space-y-4 mb-5">
          {finalPointsList.map((pt, idx) => {
            const subType = registration.categoryOptions?.electricalType || "motor_listrik";
            const paramsList = ELECTRICAL_PARAMS[subType] || ELECTRICAL_PARAMS.motor_listrik;
            
            // Filter out parameters where both Sesuai PO and Sesuai Nameplate are empty
            const activeParams = paramsList.filter(param => {
              const poKey = `${param} (Sesuai PO)`;
              const npKey = `${param} (Sesuai Nameplate)`;
              const poVal = pt.values[poKey] || "";
              const npVal = pt.values[npKey] || "";
              return poVal.trim() !== "" || npVal.trim() !== "";
            });

            const pointTitle = pt.pointName || `Unit Alat Listrik #${pt.pointIndex}`;

            return (
              <div key={pt.pointIndex} className="p-2.5 border border-black rounded bg-slate-50/10 print:p-0 print:border-0">
                <div className="bg-slate-900 text-white px-3 py-1.5 flex items-center justify-between rounded-t font-semibold text-[11px] uppercase tracking-wider mb-1.5 print:bg-slate-100 print:text-black print:border-b print:border-black print:px-0">
                  <span>⚡ PERBANDINGAN TARGET PO VS AKTUAL NAMEPLATE</span>
                  <span>{pointTitle}</span>
                </div>

                {activeParams.length === 0 ? (
                  <p className="p-2 text-center text-slate-500 italic text-[11px]">
                    Belum ada parameter yang diisi pada unit alat listrik ini.
                  </p>
                ) : (
                  <table className="w-full border border-black border-collapse text-[11px] leading-tight">
                    <thead>
                      <tr className="bg-slate-100/80 text-[10px]">
                        <th className="border border-black px-1.5 py-1 text-center font-bold w-[6%]">NO</th>
                        <th className="border border-black px-1.5 py-1 text-left font-bold w-[34%] uppercase">KARAKTERISTIK PARAMETER</th>
                        <th className="border border-black px-1.5 py-1 text-center font-bold w-[28%] bg-slate-50/50 uppercase">SPESIFIKASI ACUAN (PO)</th>
                        <th className="border border-black px-1.5 py-1 text-center font-bold w-[28%] uppercase">KONDISI AKTUAL (NAMEPLATE)</th>
                        <th className="border border-black px-1.5 py-1 text-center font-bold w-[12%] uppercase">EVALUASI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeParams.map((param, pIdx) => {
                        const poKey = `${param} (Sesuai PO)`;
                        const npKey = `${param} (Sesuai Nameplate)`;
                        const poVal = pt.values[poKey] || "-";
                        const npVal = pt.values[npKey] || "-";
                        
                        const isMismatch = poVal.trim() && npVal.trim() && poVal.trim().toLowerCase() !== npVal.trim().toLowerCase();

                        return (
                          <tr key={param} className="hover:bg-slate-50/30">
                            <td className="border border-black px-1.5 py-1 text-center font-bold text-slate-705">
                              {pIdx + 1}
                            </td>
                            <td className="border border-black px-1.5 py-1 font-bold text-slate-800 uppercase tracking-tight text-[10px]">
                              {param}
                            </td>
                            <td className="border border-black px-1.5 py-1 text-center font-semibold text-slate-700 bg-slate-50/30">
                              {poVal}
                            </td>
                            <td className={`border border-black px-1.5 py-1 text-center text-slate-900 ${
                              isMismatch ? "font-black bg-red-50 text-red-700 font-bold" : "font-medium"
                            }`}>
                              {isMismatch ? `${npVal}*` : npVal}
                            </td>
                            <td className="border border-black px-1 py-1 text-center">
                              {isMismatch ? (
                                <span className="font-extrabold text-red-650 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 text-[9px] tracking-wide inline-block">
                                  TIDAK SESUAI*
                                </span>
                              ) : (
                                <span className="font-extrabold text-emerald-850 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 text-[9px] tracking-wide inline-block">
                                  SESUAI
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}

          {hasOffSpec && (
            <p className="text-xs text-red-600 mt-2.5 font-semibold italic flex items-center gap-1.5 bg-red-50 p-2 border border-red-200 rounded-lg">
              <span>⚠️</span> Catatan: Tanda asterik (*) yang tebal menunjukkan ketidaksesuaian spesifikasi fisik nameplate dengan pesanan pembelian (OFF-SPECIFICATION).
            </p>
          )}
        </div>
      )}

      {/* Photo attachments for Valve */}
      {category === "Valve" && (
        <div className="mb-10 p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 print:break-inside-avoid">
          <h4 className="font-extrabold text-xs text-[#006A4E] uppercase tracking-wider flex items-center gap-1">
            <span>📸</span> Dokumentasi Uji pressure test valve
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {finalPointsList[0]?.values["manometer_photo"] ? (
              <div className="border bg-white rounded-xl p-2 text-center flex flex-col gap-1.5 shadow-sm">
                <img src={finalPointsList[0]?.values["manometer_photo"]} alt="Manometer" className="aspect-video w-full object-cover rounded-lg border bg-slate-50" referrerPolicy="no-referrer" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">1. Foto Manometer Saat Uji</span>
              </div>
            ) : (
              <div className="border border-dashed rounded-xl p-4 bg-white/70 text-center flex items-center justify-center text-[10px] text-slate-400 italic font-medium aspect-video">Foto Manometer Tidak Tersedia</div>
            )}
            
            {finalPointsList[0]?.values["all_valves_photo"] ? (
              <div className="border bg-white rounded-xl p-2 text-center flex flex-col gap-1.5 shadow-sm">
                <img src={finalPointsList[0]?.values["all_valves_photo"]} alt="All Valves" className="aspect-video w-full object-cover rounded-lg border bg-slate-50" referrerPolicy="no-referrer" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">2. Foto Kumpulan Valve Lot</span>
              </div>
            ) : (
              <div className="border border-dashed rounded-xl p-4 bg-white/70 text-center flex items-center justify-center text-[10px] text-slate-400 italic font-medium aspect-video">Foto Kumpulan Valve Tidak Tersedia</div>
            )}

            {finalPointsList[0]?.values["active_test_photo"] ? (
              <div className="border bg-white rounded-xl p-2 text-center flex flex-col gap-1.5 shadow-sm">
                <img src={finalPointsList[0]?.values["active_test_photo"]} alt="Active Test" className="aspect-video w-full object-cover rounded-lg border bg-slate-50" referrerPolicy="no-referrer" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">3. Foto Katup Sedang Diuji</span>
              </div>
            ) : (
              <div className="border border-dashed rounded-xl p-4 bg-white/70 text-center flex items-center justify-center text-[10px] text-slate-400 italic font-medium aspect-video">Foto Uji Katup Tidak Tersedia</div>
            )}
          </div>
          
          {finalPointsList[0]?.values["v_total"] && (
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex justify-between items-center text-xs flex-wrap gap-2.5">
              <div>
                <span className="text-slate-400 font-extrabold text-[9px] uppercase tracking-wider block leading-none mb-1">DATA VERIFIKASI VALVE:</span>
                <span className="font-extrabold text-slate-900 text-sm">Katup Diuji: <strong className="text-indigo-950">{finalPointsList[0].values["v_total"]} Unit</strong></span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-150">Lulus: {finalPointsList[0].values["v_lulus"] || "0"}</span>
                <span className="font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-150">Gagal: {finalPointsList[0].values["v_gagal"] || "0"}</span>
              </div>
            </div>
          )}
        </div>
      )}
           {/* Signatures & Trust cards layout and Footnotes block wrapped together to prevent breaking */}
      <div className="print-avoid-break text-[11px] leading-tight text-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mt-6 pt-3 border-t border-dashed border-slate-300">
          {/* Digital Trust Card */}
          {useQrSignature ? (
            <div className="md:col-span-5 border border-slate-300 rounded p-2 bg-slate-50 flex gap-2.5 text-[11px]">
              <div className="bg-white p-0.5 border border-slate-250 shadow-sm flex-shrink-0 flex items-center justify-center w-14 h-14">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(validationUrl)}`} 
                  alt="Secured QR Signature" 
                  className="w-12 h-12 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1 text-[10px]">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" /> DIGITAL TRUST CARD
                </h4>
                <p className="text-[9px] text-slate-500 mt-0.5 leading-snug">Dokumen ini aman terproteksi secara kriptografis sistem IRIS ITRK.</p>
                <p className="font-mono text-[8px] text-slate-650 mt-0.5 border-t pt-0.5 border-slate-200">
                  ID: <span className="text-slate-900 font-bold">{trustCardId}</span>
                </p>
                <a 
                  href={validationUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[8px] text-[#006A4E] hover:underline font-semibold mt-0.5 block break-all text-ellipsis overflow-hidden"
                >
                  Verify document online ↗
                </a>
              </div>
            </div>
          ) : (
            <div className="md:col-span-5"></div>
          )}

          {/* Space middle */}
          <div className="hidden md:block md:col-span-3"></div>

          {/* Corporate Signature block */}
          <div className="md:col-span-4 text-center text-[11px]">
            <p className="text-slate-500 font-medium">Diterbitkan tanggal {formatDateIndo(tanggalTerbit)}</p>
            <p className="font-bold text-slate-800 mt-0.5 uppercase text-[10px]">ITRK Lab Hasil Pengujian</p>
            
            <div className="my-2 min-h-[56px] relative flex flex-col items-center justify-center font-sans">
              {useQrSignature && signatureType === "qrcode" ? (
                <div className="flex flex-col items-center text-[10px] text-slate-400 gap-0.5 border border-emerald-100 bg-emerald-50/50 px-3 py-1 rounded">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  <span className="font-semibold text-emerald-800 tracking-tight text-[9px]">E-SIGNED PLATFORM</span>
                  <span className="text-[8px] text-slate-500 font-mono">ID: {trustCardId.substring(0,8)}</span>
                </div>
              ) : (
                signatureImage ? (
                  <img 
                    src={signatureImage} 
                    alt={`Tanda Tangan ${signerName}`} 
                    className="max-h-[50px] max-w-[150px] object-contain select-none" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="font-signature text-2xl text-emerald-850 opacity-85 select-none font-bold rotate-[-3deg] border-b border-emerald-200">
                    {pengujiInitials} & {reviewerInitials}
                  </div>
                )
              )}
            </div>
            
            <p className="font-bold underline text-slate-950 text-xs">{signerName}</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase">{signerPosition}</p>
          </div>
        </div>

        {/* Footnotes block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 pt-2.5 border-t-2 border-black text-[9.5px] text-slate-650 leading-tight">
          <div>
            <span className="font-bold uppercase tracking-wider block">Tembusan:</span>
            <span className="block">1. Arsip</span>
            <div className="mt-1 text-[8.5px] text-slate-550 font-bold font-mono">
              Uji/Rev: {pengujiInitials || "Fr"}/{reviewerInitials || "Am"} | REG: {sortedPeers.map(pr => pr.noReg).join(", ")}
            </div>
          </div>
          <div className="text-right md:text-right text-[10px] font-medium leading-normal">
            <p className="italic text-slate-600">Hasil uji ini hanya berlaku untuk contoh yang diuji.</p>
            <p className="mt-0.5 text-slate-650 font-semibold">Penggandaan dokumen harus dibuat secara lengkap.</p>
          </div>
        </div>
      </div>

      {/* Network filepath breadcrumb for corporate storage sync */}
      {!hideFilepath && (
        <div className="mt-3.5 pt-2 border-t border-slate-100 text-[8.5px] text-slate-400 font-mono select-all overflow-hidden text-ellipsis whitespace-nowrap">
          {getMockFilepath()}
        </div>
      )}
    </div>
  );
}
