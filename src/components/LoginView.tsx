import React, { useState } from "react";
import { User, ShieldAlert, KeyRound, Loader2, ShieldCheck } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (user: { username: string; role: "SuperAdmin" | "Tim Penguji" | "Tim Reviewer"; name: string; initials: string }) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMessage("Mohon masukkan username dan password.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess(data.user);
      } else {
        setErrorMessage(data.message || "Username atau password salah.");
      }
    } catch (err) {
      setErrorMessage("Koneksi gagal. Pastikan server dev aktif.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 mb-2">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Login Portal Staf ITRK</h2>
        <p className="text-slate-500 text-xs font-semibold">Gunakan akun lokal Inspektur / Supervisor ITRK untuk mengelola data data.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-sm mt-4">
        
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600 block">Username Lokal Staff</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              required
              placeholder="Contoh: uji atau rev"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-600 block">Sandi Aplikasi</label>
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all font-medium"
            />
          </div>
        </div>

        {errorMessage && (
          <p className="text-xs font-semibold text-red-650 bg-red-50 p-3 rounded-xl border border-red-105 animate-pulse">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-200 flex items-center justify-center gap-2 mt-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Mengotentikasi...
            </>
          ) : (
            <> Masuk Portal IRIS </>
          )}
        </button>

      </form>

      {/* Corporate trust note to the user to try the 3 default users */}
      <div className="border border-slate-150 pt-4 bg-slate-50 p-4 rounded-xl space-y-2">
        <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-600" /> Default Kredensial (Akun Lokal):
        </h4>
        <div className="grid grid-cols-1 gap-1.5 text-[11px] text-slate-600 font-medium">
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span>Admin Gawat (SuperAdmin):</span>
            <span className="font-mono bg-white px-1.5 py-0.2 border rounded"><strong className="text-slate-900">adm</strong> / 123</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-1">
            <span>Tim Penguji (Inspeksi Fisik):</span>
            <span className="font-mono bg-white px-1.5 py-0.2 border rounded"><strong className="text-slate-900">uji</strong> / 123</span>
          </div>
          <div className="flex justify-between">
            <span>Tim Reviewer (Penyetuju):</span>
            <span className="font-mono bg-white px-1.5 py-0.2 border rounded"><strong className="text-slate-900">rev</strong> / 123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
