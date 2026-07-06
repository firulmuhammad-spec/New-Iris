import React, { useState, useEffect } from "react";
import { User, Registration, Standard, Signature } from "./types";
import QueueMonitor from "./components/QueueMonitor";
import DocValidation from "./components/DocValidation";
import RequestTest from "./components/RequestTest";
import LoginView from "./components/LoginView";
import DashboardITRK from "./components/DashboardITRK";
import { ShieldCheck, MonitorPlay, Sparkles, LogIn, Award, Building, Activity, ShieldAlert, Cpu } from "lucide-react";

export default function App() {
  const [currentTab, setCurrentTab] = useState<"portal" | "monitor" | "validation" | "request" | "login" | "dashboard">("portal");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allData, setAllData] = useState<{
    registrations: Registration[];
    standards: Standard[];
    signatures: Signature[];
    users: any[];
  }>({
    registrations: [],
    standards: [],
    signatures: [],
    users: []
  });
  const [loading, setLoading] = useState(true);

  // Fetch all initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/all-data");
      const data = await res.json();
      setAllData(data);
    } catch (err) {
      console.error("Gagal sinkronisasi basis data ITRK:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Check if there are scan parameters in the URL
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get("tab");
    if (urlTab === "validation" || params.get("ppj")) {
      setCurrentTab("validation");
    }
  }, []);

  // Sync user state to browser localStorage to avoid resetting on refresh
  useEffect(() => {
    const saved = localStorage.getItem("iris_user");
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setCurrentUser(u);
        setCurrentTab("dashboard");
      } catch {
        localStorage.removeItem("iris_user");
      }
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("iris_user", JSON.stringify(user));
    setCurrentTab("dashboard");
    fetchData();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("iris_user");
    setCurrentTab("portal");
  };

  // List of unique test categories for form options
  const testCategories = ["karung", "logam", "filter cloth", "kelistrikan", "Valve", "benang", "rubber"];

  // If active user is staff, let them direct-entry the admin dashboard
  if (currentTab === "dashboard" && currentUser) {
    return (
      <DashboardITRK 
        currentUser={currentUser}
        onLogout={handleLogout}
        allData={allData}
        onDataRefresh={fetchData}
      />
    );
  }

  // Rendering beautiful landing portal view (matches the screenshot attachment precisely)
  if (currentTab === "portal") {
    return (
      <div className="min-h-screen w-full bg-[#f4f7f6] flex flex-col justify-between p-6 md:p-12 font-sans overflow-y-auto select-none">
        
        {/* Top Header Row for Theme Button */}
        <div className="flex justify-end items-center max-w-7xl mx-auto w-full">
          <button className="bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold px-4 py-2 rounded-full shadow-sm border border-slate-200 flex items-center gap-2 cursor-pointer transition-all">
            <span className="text-amber-500 font-bold">🌗</span> Tema
          </button>
        </div>

        {/* Center Main Content */}
        <div className="my-auto max-w-5xl mx-auto w-full flex flex-col items-center text-center py-6">
          
          {/* Logo Brand with Waves/Vertical Bars */}
          <div className="flex items-center gap-4 mb-9">
            <svg width="45" height="36" viewBox="0 0 45 36" fill="none" className="text-black" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="14" width="3" height="8" rx="1.5" fill="currentColor" />
              <rect x="8" y="10" width="3" height="16" rx="1.5" fill="currentColor" />
              <rect x="14" y="6" width="3" height="24" rx="1.5" fill="currentColor" />
              <rect x="20" y="0" width="3" height="36" rx="1.5" fill="currentColor" />
              <rect x="26" y="4" width="3" height="28" rx="1.5" fill="currentColor" />
              <rect x="32" y="10" width="3" height="16" rx="1.5" fill="currentColor" />
              <rect x="38" y="14" width="3" height="8" rx="1.5" fill="currentColor" />
              
              <circle cx="3.5" cy="18" r="1.5" fill="currentColor" />
              <circle cx="9.5" cy="18" r="1.5" fill="currentColor" />
              <circle cx="15.5" cy="18" r="1.5" fill="currentColor" />
              <circle cx="21.5" cy="18" r="1.5" fill="currentColor" />
              <circle cx="27.5" cy="18" r="1.5" fill="currentColor" />
              <circle cx="33.5" cy="18" r="1.5" fill="currentColor" />
              <circle cx="39.5" cy="18" r="1.5" fill="currentColor" />
            </svg>
            <div className="text-left leading-none">
              <div className="text-[10px] font-semibold tracking-[0.3em] text-slate-500 uppercase">INSPEKSI TEKNIK</div>
              <div className="text-2xl font-black tracking-tight text-slate-900 uppercase">ROTATING</div>
            </div>
          </div>

          {/* Heading title */}
          <h1 className="text-2xl md:text-[32px] font-black tracking-tight text-slate-800 leading-tight mb-2.5">
            Portal Layanan Bengkel & Uji Material
          </h1>
          <p className="text-xs md:text-sm text-slate-500 max-w-xl font-medium tracking-wide">
            Sistem Informasi Terpadu (IRIS) Departemen Inspeksi Teknik Rotating & Khusus.
          </p>

          {/* 3 Large White Rounded Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-12 px-2">
            
            {/* Monitor Antrean */}
            <div 
              onClick={() => setCurrentTab("monitor")}
              className="bg-white hover:-translate-y-1.5 hover:shadow-xl hover:border-slate-300 transition-all duration-300 border border-slate-200/70 rounded-[28px] p-8 flex flex-col items-center justify-start cursor-pointer shadow-sm group min-h-[220px]"
            >
              <div className="text-4xl mb-5 transition-transform duration-300 group-hover:scale-110">
                📺
              </div>
              <h2 className="text-base font-extrabold text-slate-800 mb-2">
                Monitor Antrean
              </h2>
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                Pantau status pengajuan dokumen dan progres pengujian barang secara <span className="text-blue-600 font-bold">*real-time*</span>.
              </p>
            </div>

            {/* Validasi Dokumen */}
            <div 
              onClick={() => setCurrentTab("validation")}
              className="bg-white hover:-translate-y-1.5 hover:shadow-xl hover:border-slate-300 transition-all duration-300 border border-slate-200/70 rounded-[28px] p-8 flex flex-col items-center justify-start cursor-pointer shadow-sm group min-h-[220px]"
            >
              <div className="text-4xl mb-5 transition-transform duration-300 group-hover:scale-110">
                🛡️
              </div>
              <h2 className="text-base font-extrabold text-slate-800 mb-2">
                Validasi Dokumen
              </h2>
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                Verifikasi keaslian Sertifikat Laporan Pengujian yang diterbitkan oleh ITRK.
              </p>
            </div>

            {/* Pengajuan Uji */}
            <div 
              onClick={() => setCurrentTab("request")}
              className="bg-white hover:-translate-y-1.5 hover:shadow-xl hover:border-slate-300 transition-all duration-300 border border-slate-200/70 rounded-[28px] p-8 flex flex-col items-center justify-start cursor-pointer shadow-sm group min-h-[220px]"
            >
              <div className="text-4xl mb-5 transition-transform duration-300 group-hover:scale-110">
                📝
              </div>
              <h2 className="text-base font-extrabold text-slate-800 mb-2">
                Pengajuan Uji
              </h2>
              <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                Kirim formulir permintaan inspeksi atau uji material baru secara digital.
              </p>
            </div>

          </div>

        </div>

        {/* Bottom Access Button */}
        <div className="flex justify-center mb-4 mt-6">
          <button 
            onClick={() => setCurrentTab("login")}
            className="bg-transparent hover:bg-slate-100 border border-slate-200 rounded-full text-slate-600 hover:text-slate-800 text-xs font-bold px-7 py-3 transition-all cursor-pointer shadow-sm bg-white"
          >
            🧑‍💻 Akses Karyawan ITRK
          </button>
        </div>

      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans text-slate-900 overflow-hidden select-none selection:bg-blue-100 selection:text-blue-950">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 flex flex-col shrink-0 text-slate-300 no-print border-r border-slate-800 hidden md:flex">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white text-base font-black shadow-lg shadow-blue-900/40">
              I
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h1 className="text-lg font-extrabold tracking-wider text-white uppercase font-sans">IRIS</h1>
                <span className="text-[9px] bg-blue-950 font-bold text-blue-400 border border-blue-900/50 rounded px-1.5 py-0.2 tracking-widest font-mono">PKG</span>
              </div>
              <p className="text-[8px] text-slate-550 font-bold uppercase tracking-widest leading-none mt-0.5">ITRK DEPARTMENT</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 overflow-y-auto space-y-1.5 px-4">
          <button
            onClick={() => setCurrentTab("monitor")}
            className={`w-full flex items-center px-3.5 py-2.5 text-xs font-bold transition-all rounded-lg cursor-pointer ${
              currentTab === "monitor"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <MonitorPlay className="w-4 h-4 mr-3" />
            Monitor Antrean
          </button>

          <button
            onClick={() => setCurrentTab("request")}
            className={`w-full flex items-center px-3.5 py-2.5 text-xs font-bold transition-all rounded-lg cursor-pointer ${
              currentTab === "request"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Sparkles className="w-4 h-4 mr-3" />
            Pengajuan Uji
          </button>

          <button
            onClick={() => setCurrentTab("validation")}
            className={`w-full flex items-center px-3.5 py-2.5 text-xs font-bold transition-all rounded-lg cursor-pointer ${
              currentTab === "validation"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <ShieldCheck className="w-4 h-4 mr-3" />
            Validasi Dokumen
          </button>
        </nav>

        {/* Access control section */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="mb-2 px-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Akses Staf</div>
          <button
            onClick={() => setCurrentTab("login")}
            className={`w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
              currentTab === "login" ? "ring-2 ring-blue-500 text-white bg-slate-700" : ""
            }`}
          >
            <LogIn className="w-4 h-4 text-blue-550" />
            Portal Staf ITRK
          </button>
        </div>
      </aside>

      {/* Main Container Workspace */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Mobile Navigation Header */}
        <header className="bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between p-4 md:hidden no-print shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentTab("monitor")}>
            <div className="bg-blue-600 p-1.5 rounded text-white shadow font-bold text-xs uppercase font-mono">I</div>
            <h1 className="text-sm font-black tracking-wider text-slate-100 font-sans">IRIS PKG</h1>
          </div>
          
          <nav className="flex items-center gap-1">
            <button
              onClick={() => setCurrentTab("monitor")}
              className={`p-1.5 text-xs font-bold transition-all rounded ${
                currentTab === "monitor" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Monitor
            </button>
            <button
              onClick={() => setCurrentTab("request")}
              className={`p-1.5 text-xs font-bold transition-all rounded ${
                currentTab === "request" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Pengajuan
            </button>
            <button
              onClick={() => setCurrentTab("validation")}
              className={`p-1.5 text-xs font-bold transition-all rounded ${
                currentTab === "validation" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Validasi
            </button>
            <button
              onClick={() => setCurrentTab("login")}
              className={`p-1.5 text-xs font-bold transition-all rounded ${
                currentTab === "login" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Portal
            </button>
          </nav>
        </header>

        {/* Header toolbar for content title */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">IRIS</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-extrabold text-blue-600 uppercase tracking-wider">
              {currentTab === "monitor" && "Monitor Antrean Pengujian"}
              {currentTab === "request" && "Pengajuan Uji"}
              {currentTab === "validation" && "Validasi Laporan Hasil Uji"}
              {currentTab === "login" && "Login Portal Staf ITRK"}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-505">
            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-mono font-bold uppercase text-slate-500">IRIS_ONLINE_v1.0.42</span>
            </div>
          </div>
        </header>

        {/* Scrollable Viewport Frame */}
        <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
          
          {/* Welcome Banner Card */}
          {currentTab !== "login" && (
            <div className="bg-slate-900 border-b border-slate-800 relative py-8 px-6 md:px-8 no-print select-none text-white text-center sm:text-left overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 opacity-5 pointer-events-none">
                <Cpu className="w-72 h-72 text-blue-400" />
              </div>
              
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1.5 max-w-2xl">
                  <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold rounded-full px-2.5 py-0.5 tracking-wider uppercase font-mono">
                    Sistem Layanan Mutu Presisi & Cepat
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase font-sans">
                    Mutu Suku Cadang & Bahan Baku
                  </h2>
                  <p className="text-xs text-slate-450 font-medium leading-relaxed max-w-xl">
                    Sistem validasi dan report terpadu dari departemen <strong className="text-blue-400">Inspeksi Teknik Rotating & Khusus (ITRK)</strong> untuk menjamin kesesuaian material & logistik PT Petrokimia Gresik.
                  </p>
                </div>

                <div className="flex gap-4 self-center sm:self-auto text-xs">
                  <div className="bg-slate-850 border border-slate-800 px-4 py-2.5 rounded-xl text-center space-y-0.5 min-w-[100px]">
                    <span className="text-[9px] text-slate-500 block">Antrean</span>
                    <span className="text-lg font-black text-white">{allData.registrations.filter(r => r.status === "Draft" || r.status === "Uji").length} Items</span>
                  </div>
                  <div className="bg-blue-950/40 border border-blue-900/30 px-4 py-2.5 rounded-xl text-center space-y-0.5 min-w-[100px]">
                    <span className="text-[9px] text-blue-405 block">Rilis Dokumen</span>
                    <span className="text-lg font-black text-blue-450">{allData.registrations.filter(r => r.status === "Terbit").length} Files</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Core Content Box with layout constraints */}
          <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
            {currentTab === "monitor" && (
              <QueueMonitor 
                registrations={allData.registrations}
                onRefresh={fetchData}
                loading={loading}
              />
            )}

            {currentTab === "validation" && (
              <DocValidation 
                registrations={allData.registrations}
                standards={allData.standards}
              />
            )}

            {currentTab === "request" && (
              <RequestTest 
                onSubmitted={() => {
                  setCurrentTab("monitor");
                  fetchData();
                }}
                categories={testCategories}
              />
            )}

            {currentTab === "login" && (
              <div className="py-4">
                <LoginView 
                  onLoginSuccess={handleLogin}
                />
              </div>
            )}
          </main>

          {/* Modern Footer section */}
          <footer className="bg-slate-900 text-slate-500 text-xs border-t border-slate-800 py-8 no-print mt-auto shrink-0">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
              <div className="space-y-1">
                <p className="font-bold text-slate-350 tracking-wider">IRIS INTEGRATED REPORT INSPECTION SYSTEM</p>
                <p className="text-[11px] text-slate-500">PT Petrokimia Gresik • Departemen Inspeksi Teknik Rotating & Khusus (ITRK)</p>
              </div>
              <p className="text-[11px] text-slate-600 font-mono font-medium">
                © 2026 PT Petrokimia Gresik. All Rights Reserved. Built with Professional Polish.
              </p>
            </div>
          </footer>

        </div>

        {/* Navigation bottom line */}
        <div className="h-10 bg-slate-900 text-white flex items-center px-6 text-[11px] shrink-0 border-t border-slate-800 no-print">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 bg-blue-600 text-[9px] font-bold rounded uppercase">Status Sistem</span>
            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div> Secure & Connected
            </span>
          </div>
          <div className="ml-auto flex gap-6 text-slate-400 font-mono text-[9px]">
            <span>Build: 1.0.42-rev</span>
            <span className="hidden sm:inline">Active Local Auth</span>
          </div>
        </div>

      </div>

    </div>
  );
}
