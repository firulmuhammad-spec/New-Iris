import React, { useState } from "react";
import { Plus, Trash, CheckCircle2, UserCheck, Sparkles, Send, Loader2 } from "lucide-react";

interface RequestTestProps {
  onSubmitted: () => void;
  categories: string[];
}

export default function RequestTest({ onSubmitted, categories }: RequestTestProps) {
  // Public requestor details
  const [requestorName, setRequestorName] = useState("");
  const [requestorNik, setRequestorNik] = useState("");
  const [requestorDept, setRequestorDept] = useState("Pengelolaan Persediaan Suku Cadang & BB (PPSB)");
  
  // Registration main detail
  const [ppjFour, setPpjFour] = useState("");
  const [poCode, setPoCode] = useState("");
  const [prInput, setPrInput] = useState("");
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState("logam");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [points, setPoints] = useState("1");
  const [standardName, setStandardName] = useState("AISI 304");

  const [prCodes, setPrCodes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const addPrCode = () => {
    if (prInput.trim() && !prCodes.includes(prInput.trim())) {
      setPrCodes([...prCodes, prInput.trim()]);
      setPrInput("");
    }
  };

  const removePrCode = (index: number) => {
    setPrCodes(prCodes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ppjFour || !poCode || !vendor || !itemName || !quantity) {
      setErrorMessage("Mohon lengkapi semua kolom wajib berdinas tanda bintang (*).");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    // Package the PR code array list into a neat string representation separator
    const finalPrStr = prCodes.length > 0 ? prCodes.join(", ") : prInput || "UNASSIGNED";

    const payload = {
      ppjCode: ppjFour,
      prCode: finalPrStr,
      poCode,
      vendor: vendor.toUpperCase(),
      category,
      standardName,
      itemName: itemName.toUpperCase(),
      description: `Diajukan oleh: ${requestorName} (NIK: ${requestorNik}) dari Dept. ${requestorDept}. ` + (description ? `Keterangan: ${description}` : ""),
      quantity,
      points: parseInt(points, 10),
      status: "Draft", // Public inputs enter draft stage awaiting ITRK reviews
      tanggalPPJ: new Date().toISOString().split("T")[0],
      tanggalDiterima: new Date().toISOString().split("T")[0],
    };

    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        // Reset forms
        setRequestorName("");
        setRequestorNik("");
        setPpjFour("");
        setPoCode("");
        setPrInput("");
        setPrCodes([]);
        setVendor("");
        setItemName("");
        setDescription("");
        setQuantity("");
        setPoints("1");
        setTimeout(() => {
          setSuccess(false);
          onSubmitted();
        }, 3000);
      } else {
        setErrorMessage(data.message || "Gagal menyimpan pengajuan uji.");
      }
    } catch (err) {
      setErrorMessage("Gangguan koneksi, gagal mengirim formulir pengajuan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3.5 border-b border-slate-200 pb-5 mb-8">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Formulir Pengajuan Uji Material Online</h2>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">Bagi departemen eksternal (PPSB dll) untuk menyerahkan sampel uji ke ITRK PKG.</p>
        </div>
      </div>

      {success ? (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-4 bg-emerald-50 rounded-xl border border-emerald-100 p-6 animate-fade-in">
          <CheckCircle2 className="w-16 h-16 text-emerald-600" />
          <div className="space-y-1">
            <h3 className="text-emerald-950 font-bold text-base">Pengajuan Uji Berhasil Terkirim!</h3>
            <p className="text-emerald-800 text-xs max-w-md leading-relaxed">
              Terima kasih, pengajuan barang selesai dimasukkan ke database ITRK. Mohon serahkan berkas fisik beserta sampel material ke bengkel ITRK untuk dieksekusi.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 text-sm">
          
          {/* Section 1: Data Pengaju */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-500 uppercase tracking-widest text-[10px] flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <UserCheck className="w-4 h-4 text-blue-650" /> DATA DIRI PENGAJU (KARYAWAN)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Nama Lengkap Pengaju *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Firman"
                  value={requestorName}
                  onChange={(e) => setRequestorName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-600 transition-all"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">NPK / Nomor Karyawan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 145028"
                  value={requestorNik}
                  onChange={(e) => setRequestorNik(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-600 transition-all"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Departemen Asal Pengaju *</label>
                <select
                  value={requestorDept}
                  onChange={(e) => setRequestorDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-600 transition-all"
                >
                  <option value="Pengelolaan Persediaan Suku Cadang & BB (PPSB)">Pengelolaan Persediaan Suku Cadang & BB (PPSB)</option>
                  <option value="Perencanaan dan Penerimaan Barang / Jasa">Perencanaan dan Penerimaan Barang / Jasa</option>
                  <option value="Pemeliharaan Mekanik">Pemeliharaan Mekanik</option>
                  <option value="Pemeliharaan Instrumen & Kelistrikan">Pemeliharaan Instrumen & Kelistrikan</option>
                  <option value="Other / Departemen Lain">Other / Departemen Lain</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Data Material/Sampel */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="font-extrabold text-slate-550 uppercase tracking-widest text-[10px] flex items-center gap-1.5 border-b border-slate-200 pb-2">
              DATA BARANG & ACUAN REKOR PPJ
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              {/* No PPJ (only 4 digit inputs) */}
              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Nomor PPJ *</label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="Contoh: 1023"
                    value={ppjFour}
                    onChange={(e) => setPpjFour(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-600 transition-all"
                  />
                  <span className="bg-slate-100 border border-slate-200 border-l-0 px-3 py-2.5 text-xs font-bold font-mono text-slate-500 rounded-r-xl whitespace-nowrap">
                    /LG.01.01/101/MI/{new Date().getFullYear()}
                  </span>
                </div>
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">No PO (Purchase Order) *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 5100146424"
                  value={poCode}
                  onChange={(e) => setPoCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-600 transition-all"
                />
              </div>

              {/* Multiple PR codes allowance! */}
              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">No PR (Purchase Request)</label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="2200108471"
                    value={prInput}
                    onChange={(e) => setPrInput(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs border border-slate-200 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none rounded-l-xl focus:border-blue-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={addPrCode}
                    className="bg-blue-600 hover:bg-blue-700 font-bold text-white px-3.5 py-2.5 rounded-r-xl text-xs cursor-pointer transition-all border border-blue-655"
                  >
                    Tambah
                  </button>
                </div>
                {prCodes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {prCodes.map((code, idx) => (
                      <span key={idx} className="bg-blue-50 text-blue-950 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-250 flex items-center gap-1">
                        {code}
                        <Trash className="w-3 h-3 text-red-500 hover:text-red-700 cursor-pointer" onClick={() => removePrCode(idx)} />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-6 space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Nama Vendor / Pabrikan *</label>
                <input
                  type="text"
                  required
                   placeholder="Contoh: PT INDO STEEL JAYA"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-600 transition-all"
                />
              </div>

              <div className="md:col-span-6 space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Nama Barang Uji *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: EXPANSION JOINT BELLOWS SS304"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-600 transition-all"
                />
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Kategori Pengujian *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-600 transition-all"
                >
                  {categories.map(c => (
                    <option key={c} value={c} className="capitalize">{c}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4 space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Standard Acuan / Grade *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: AISI 304 atau KSM-K10"
                  value={standardName}
                  onChange={(e) => setStandardName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-600 transition-all"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Jumlah Barang *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 3 Pcs"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-600 transition-all"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Jml Titik Uji *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-600 transition-all"
                />
              </div>

              <div className="md:col-span-12 space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Spesifikasi Detail (Deskripsi Opsional)</label>
                <textarea
                  placeholder="Tuliskan spesifikasi detail material atau toleransi khusus yang diajukan oleh pabrikan."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50/50 text-slate-800 focus:bg-white focus:border-blue-600 transition-all"
                />
              </div>

            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-50 text-red-700 text-xs font-semibold p-3.5 rounded-xl border border-red-200 animate-pulse">
              {errorMessage}
            </div>
          )}

          <div className="pt-5 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-blue-200"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Menyerahkan sampel...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Serahkan Pengajuan Pengujian
                </>
              )}
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
