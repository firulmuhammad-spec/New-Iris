import React, { useEffect, useState } from "react";
import { Registration } from "../types";
import { ShieldCheck, Search, ShieldX, CheckCircle, FileText, Calendar, Building, Info, ArrowRight } from "lucide-react";
import ReportDocument from "./ReportDocument";

interface DocValidationProps {
  registrations: Registration[];
  standards?: any[];
}

export default function DocValidation({ registrations, standards = [] }: DocValidationProps) {
  const [ppjInput, setPpjInput] = useState("");
  const [yearInput, setYearInput] = useState(String(new Date().getFullYear()));
  const [trustIdInput, setTrustIdInput] = useState("");
  
  const [validatedReg, setValidatedReg] = useState<Registration | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Auto-validate based on URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPpj = params.get("ppj");
    const urlYear = params.get("year");
    
    if (urlPpj) {
      setPpjInput(urlPpj);
      if (urlYear) {
        setYearInput(urlYear);
      }
      handleValidate(urlPpj, urlYear || String(new Date().getFullYear()));
    }
  }, [registrations]);

  const handleValidate = (ppjCode: string, yearStr: string) => {
    setHasSearched(true);
    
    // Search registrations that are reviewed and published (Terbit)
    const found = registrations.find(r => {
      const rYear = new Date(r.tanggalPPJ || r.tanggalDiterima).getFullYear().toString();
      const codeMatches = r.ppjCode.replace(/^0+/, "") === ppjCode.replace(/^0+/, "");
      return codeMatches && rYear === yearStr && r.status === "Terbit";
    });

    setValidatedReg(found || null);
  };

  const handleTrustIdValidate = () => {
    setHasSearched(true);
    const found = registrations.find(r => 
      r.trustCardId?.toLowerCase() === trustIdInput.trim().toLowerCase() && r.status === "Terbit"
    );
    setValidatedReg(found || null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      
      {/* Search Forms layout */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-3.5 border-b border-slate-200 pb-5 mb-8">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Sistem Validasi Dokumen Laporan (IRIS Digital Trust)</h2>
            <p className="text-slate-500 text-xs mt-0.5">Layanan pemeriksaan keaslian sertifikat hasil uji mutu ITRK PT Petrokimia Gresik.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Option A: Search by PPJ */}
          <div className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-150">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-650 text-xs font-bold font-mono">1</span>
              Validasi dengan No PPJ & Tahun
            </h3>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Nomor PPJ (4 Digit)</label>
                <input
                  type="text"
                  placeholder="Contoh: 0882"
                  value={ppjInput}
                  onChange={(e) => setPpjInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white text-slate-800 font-medium transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Tahun PPJ</label>
                <input
                  type="text"
                  placeholder="2026"
                  value={yearInput}
                  onChange={(e) => setYearInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white text-slate-800 font-medium transition-all"
                />
              </div>
            </div>

            <button
              onClick={() => handleValidate(ppjInput, yearInput)}
              className="w-full bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2 shadow-sm shadow-blue-100"
            >
              <Search className="w-3.5 h-3.5" />
              Verifikasi Dokumen
            </button>
          </div>

          {/* Option B: Search by Trust Card Code */}
          <div className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-150">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold font-mono">2</span>
              Validasi dengan Kode Digital Trust Card
            </h3>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Kode Unik Verifikasi (Kriptografis)</label>
              <input
                type="text"
                placeholder="Contoh: TC-0565-A8F9"
                value={trustIdInput}
                onChange={(e) => setTrustIdInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white text-slate-800 font-medium transition-all"
              />
            </div>

            <button
              onClick={handleTrustIdValidate}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-2 shadow-sm shadow-indigo-100"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Verifikasi Kode Trust
            </button>
          </div>

        </div>
      </div>

      {/* Verification Outcomes */}
      {hasSearched && (
        validatedReg ? (
          <div className="space-y-6">
            {/* Authentic Indicator Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm animate-fade-in">
              <div className="bg-emerald-500 p-2.5 rounded-full text-white mt-0.5">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-emerald-950 font-bold text-base flex items-center gap-1.5">
                  DOKUMEN ASLI & TERVERIFIKASI
                </h3>
                <p className="text-emerald-800 text-sm leading-relaxed">
                  Laporan Pengujian dengan Nomor Surat <strong className="font-extrabold">{validatedReg.noSurat}</strong> berhasil teridentifikasi dalam basis data ITRK PKG. Berkas ini berstatus resmi dan sah diterbitkan oleh Departemen Inspeksi Teknik Rotating & Khusus.
                </p>
                
                {/* Visual Indicators list */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 mt-1 border-t border-emerald-250 text-xs text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-700" />
                    PPJ: <strong className="font-bold">{validatedReg.ppjCode}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    Tgl Terbit: <strong className="font-bold">{validatedReg.tanggalTerbit}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-emerald-700" />
                    Vendor: <strong className="font-bold line-clamp-1">{validatedReg.vendor}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Document Preview Embed */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-150 pb-3 mb-4 text-xs font-semibold text-slate-500 bg-slate-50 rounded-xl p-3">
                <span className="flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-600" /> Pratinjau digital laporan pengujian asli
                </span>
                <span className="font-mono text-blue-800 font-bold">TRUST-ID: {validatedReg.trustCardId}</span>
              </div>
              
              <div className="scale-95 origin-top print:scale-100 overflow-x-auto">
                <ReportDocument registration={validatedReg} hideFilepath={true} standards={standards} registrations={registrations} />
              </div>
            </div>
          </div>
        ) : (
          /* Error Outcome */
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex items-start gap-4 shadow-sm animate-fade-in">
            <div className="bg-red-500 p-2.5 rounded-full text-white mt-0.5 animate-bounce">
              <ShieldX className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-red-950 font-bold text-base">DOKUMEN TIDAK TERVERIFIKASI / PALSU</h3>
              <p className="text-red-800 text-sm leading-relaxed">
                Sistem database IRIS tidak dapat menemukan record laporan yang sesuai dengan Nomor PPJ atau Kode Digital Trust Card yang Anda masukkan.
              </p>
              <div className="text-xs text-red-700 bg-red-100/40 p-3.5 rounded-xl border border-red-200 space-y-1.5 mt-2">
                <span className="font-bold text-red-950 block">Penyebab Kemungkinan:</span>
                <ul className="list-disc pl-4 space-y-1 font-medium text-red-900">
                  <li>Kesalahan memasukkan Nomor PPJ atau tahun pengujian.</li>
                  <li>Laporan pengujian belum direview atau belum diterbitkan oleh Kepala Departemen ITRK.</li>
                  <li>Dokumen telah mengalami modifikasi secara fisik / manual tanpa otorisasi terpusat (Segera hubungi tim inspeksi ITRK!).</li>
                </ul>
              </div>
            </div>
          </div>
        )
      )}

    </div>
  );
}
