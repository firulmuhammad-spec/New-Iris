import React from "react";
import { Registration } from "../types";
import { Search, Loader2, Clock, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface QueueMonitorProps {
  registrations: Registration[];
  onRefresh: () => void;
  loading?: boolean;
}

export default function QueueMonitor({ registrations, onRefresh, loading = false }: QueueMonitorProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

  const filtered = registrations.filter(r => {
    const q = searchQuery.toLowerCase();
    return (
      r.ppjCode.toLowerCase().includes(q) ||
      r.itemName.toLowerCase().includes(q) ||
      r.vendor.toLowerCase().includes(q) ||
      r.poCode.toLowerCase().includes(q)
    );
  });

  const getStatusStep = (status: string) => {
    switch (status) {
      case "Draft": return 1;
      case "Uji": return 2;
      case "Review": return 3;
      case "Terbit": return 4;
      default: return 1;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Draft":
        return <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-slate-200">Menunggu Antrean</span>;
      case "Uji":
        return <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-amber-200">Tahap Pengujian</span>;
      case "Review":
        return <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-blue-200">Tahap Review</span>;
      case "Terbit":
        return <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-emerald-200">Laporan Terbit</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Monitor Antrean Pengujian</h2>
          <p className="text-slate-500 text-sm mt-0.5">Pantau status pengujian barang secara real-time dari Departemen ITRK.</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 text-sm bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-lg hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 transition-all cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Antrean
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Cari berdasarkan No PPJ, Nama Barang, Vendor, atau No PO..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm shadow-inner"
        />
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-sm font-semibold text-slate-600">Memuat database antrean terbaru...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">Tidak ada antrean barang pengujian yang ditemukan.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const currentStep = getStatusStep(item.status);
            return (
              <div 
                key={item.id} 
                className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all shadow-sm hover:shadow-md bg-white"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono bg-blue-50 text-blue-900 px-2 py-0.5 rounded text-xs font-bold border border-blue-100">
                        PPJ: {item.ppjCode}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm uppercase break-words line-clamp-1">{item.itemName}</h3>
                    </div>
                    <p className="text-xs text-slate-555 font-medium">
                      Vendor: <strong className="text-slate-700">{item.vendor}</strong> | PO: <strong className="text-slate-700">{item.poCode}</strong>
                    </p>
                  </div>
                  <div className="self-start lg:self-auto flex items-center gap-2 pr-2">
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                {/* Progress Stepper Visualiser */}
                <div className="relative pt-6 pb-2">
                  <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-slate-100 rounded-full" />
                  <div 
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${(currentStep - 1) * 33.3}%` }}
                  />

                  <div className="relative flex justify-between">
                    {/* Step 1: Registrasi */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 border transition-all ${
                        currentStep >= 1 ? "bg-blue-600 text-white border-transparent" : "bg-white text-slate-400 border-slate-200"
                      }`}>
                        {currentStep > 1 ? <CheckCircle2 className="w-5 h-5" /> : "1"}
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 mt-2">Registrasi</span>
                      <span className="text-[9px] text-slate-450">Tergabung ITRK</span>
                    </div>

                    {/* Step 2: Uji (Testing) */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 border transition-all ${
                        currentStep >= 2 ? "bg-amber-500 text-white border-transparent" : "bg-white text-slate-400 border-slate-200"
                      }`}>
                        {currentStep > 2 ? <CheckCircle2 className="w-5 h-5" /> : "2"}
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 mt-2">Uji</span>
                      <span className="text-[9px] text-slate-450">Input Data</span>
                    </div>

                    {/* Step 3: Review */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 border transition-all ${
                        currentStep >= 3 ? "bg-blue-600 text-white border-transparent" : "bg-white text-slate-400 border-slate-200"
                      }`}>
                        {currentStep > 3 ? <CheckCircle2 className="w-5 h-5" /> : "3"}
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 mt-2">Review</span>
                      <span className="text-[9px] text-slate-400">Verifikasi Tim</span>
                    </div>

                    {/* Step 4: Terbit (Published) */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 border transition-all ${
                        currentStep >= 4 ? "bg-emerald-600 text-white border-transparent" : "bg-white text-slate-400 border-slate-200"
                      }`}>
                        {currentStep === 4 ? <CheckCircle2 className="w-5 h-5" /> : "4"}
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 mt-2">Terbit</span>
                      <span className="text-[9px] text-slate-400">Selesai & Unduh</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
