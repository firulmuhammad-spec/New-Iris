import React, { useState, useEffect } from "react";
import { User, Registration, Standard, Signature } from "../types";
import { 
  ClipboardList, CheckSquare, Eye, Award, BarChart3, 
  Database, Archive, LogOut, KeyRound, Plus, Trash, 
  Check, X, FileSpreadsheet, ShieldAlert, Sparkles, 
  Inbox, FileCode, CheckCircle2, AlertTriangle, Upload, Loader2, ArrowRight, Printer 
} from "lucide-react";
import * as XLSX from "xlsx";
import ReportDocument from "./ReportDocument";
import { collection, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_STANDARDS, DEFAULT_SIGNATURES, DEFAULT_REGISTRATIONS, DEFAULT_USERS } from "../data/seedData";

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

const compressAndConvertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

interface DashboardITRKProps {
  currentUser: User;
  onLogout: () => void;
  allData: {
    registrations: Registration[];
    standards: Standard[];
    signatures: Signature[];
    users: any[];
  };
  onDataRefresh: () => void;
}

// Reusable elegant Autocomplete component
const AutoComplete = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className = ""
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState(value);
  
  React.useEffect(() => {
    setSearch(value);
  }, [value]);

  const filtered = options.filter(opt => 
    opt && opt.toLowerCase().includes((search || "").toLowerCase())
  );

  return (
    <div className="relative w-full">
      <input
        type="text"
        disabled={disabled}
        placeholder={placeholder}
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 200);
        }}
        className={`w-full text-xs border rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1 divide-y divide-slate-100">
          {filtered.map((opt, i) => (
            <div
              key={i}
              onMouseDown={() => {
                onChange(opt);
                setSearch(opt);
                setIsOpen(false);
              }}
              className="px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer font-bold transition-all"
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface PaginationControlProps {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

const PaginationControl = ({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange
}: PaginationControlProps) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3 sm:px-6 select-none rounded-b-xl">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          Sebelumnya
        </button>
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          Berikutnya
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-slate-500 font-semibold">
            Menampilkan <span className="font-extrabold text-slate-800">{Math.min(totalItems, (currentPage - 1) * pageSize + 1)}</span> sampai{" "}
            <span className="font-extrabold text-slate-800">{Math.min(totalItems, currentPage * pageSize)}</span> dari{" "}
            <span className="font-black text-emerald-700">{totalItems}</span> entri data
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm bg-white" aria-label="Pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="relative inline-flex items-center rounded-l-md px-2 py-1.5 text-slate-400 border border-slate-350 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
            >
              <span className="sr-only">Sebelumnya</span>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
              </svg>
            </button>
            
            {(() => {
              const pages: (number | string)[] = [];
              if (totalPages <= 6) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(1);
                const leftBoundary = Math.max(2, currentPage - 1);
                const rightBoundary = Math.min(totalPages - 1, currentPage + 1);
                if (leftBoundary > 2) pages.push("...");
                for (let i = leftBoundary; i <= rightBoundary; i++) pages.push(i);
                if (rightBoundary < totalPages - 1) pages.push("...");
                pages.push(totalPages);
              }
              return pages.map((p, pIdx) => {
                if (p === "...") {
                  return (
                    <span
                      key={`ellipsis-${pIdx}`}
                      className="relative inline-flex items-center px-3 py-1.5 text-xs text-slate-400 bg-white border border-slate-300"
                    >
                      ...
                    </span>
                  );
                }
                const isCurrent = p === currentPage;
                return (
                  <button
                    key={`page-${p}`}
                    onClick={() => onPageChange(Number(p))}
                    className={`relative inline-flex items-center px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                      isCurrent
                        ? "z-10 bg-[#006A4E] text-white border-[#006A4E]"
                        : "text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                );
              });
            })()}

            <button
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="relative inline-flex items-center rounded-r-md px-2 py-1.5 text-slate-400 border border-slate-350 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
            >
              <span className="sr-only">Berikutnya</span>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

const CATEGORY_EQUIPMENT: Record<string, string[]> = {
  "logam": [
    "XRF - XL5 Plus",
    "XRF - XMet-8000",
    "LIBS Niton Apollo",
    "Hardness - Sonohard",
    "Hardness - Equtip Picollo 2",
    "OES - OE750"
  ],
  "kelistrikan": [
    "Insulation tester, Kyoritsu  3132A , No.seri W8242011",
    "Visual Komparasi PO-Nampelate"
  ],
  "filter cloth": [
    "Gester - GT27A"
  ],
  "rubber": [
    "PTC - Shore A",
    "PTC - Shore D",
    "BINDER - Dryer & Oven"
  ],
  "karung": [
    "Universal Testing Machine"
  ],
  "benang": [
    "Universal Testing Machine",
    "Mechanical Thread Tension Tester"
  ],
  "Valve": [
    "Hydrostatic Test Pump & Pneumatic Leak Indicators"
  ]
};

export interface ImportedCsvRow {
  id: string;
  sample: string;
  match: string;
  values: Record<string, string>;
  usedForRegistrationId?: string;
}

export const formatToMaxTwoDecimals = (v: string): string => {
  if (!v) return "";
  const trimmed = v.trim();
  if (trimmed.toLowerCase() === "<lod") return "<LOD";
  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    if (trimmed.includes(".")) {
      return parseFloat(num.toFixed(2)).toString();
    }
    return trimmed;
  }
  return trimmed;
};

export const isLateProduct = (reg: Registration): boolean => {
  if (!reg.tanggalDiterima) return false;
  try {
    const receivedDate = new Date(reg.tanggalDiterima);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - receivedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 2; // Late if received more than 2 days ago
  } catch (e) {
    return false;
  }
};

export const getProductFormForAcuan = (sourceCode: string, standards: Standard[]): string => {
  if (!sourceCode) return "";
  const matchStd = standards.find(s => s.category === "logam" && s.source.toLowerCase() === sourceCode.toLowerCase());
  if (matchStd && matchStd.description) {
    const parenMatch = matchStd.description.match(/\(([^)]+)\)/);
    if (parenMatch) {
      return parenMatch[1];
    }
    return matchStd.description;
  }
  
  const sourceUpper = sourceCode.toUpperCase();
  if (sourceUpper.includes("A182")) return "Forgings / Flanges / Fittings";
  if (sourceUpper.includes("A193")) return "Bolting / Studs / Threaded Rods";
  if (sourceUpper.includes("A194")) return "Nuts / Carbon & Alloy Steel";
  if (sourceUpper.includes("A240")) return "Plate / Sheet / Strip (Stainless)";
  if (sourceUpper.includes("A276")) return "Bars & Shapes (Stainless Steel)";
  if (sourceUpper.includes("A312")) return "Seamless & Welded Pipes";
  if (sourceUpper.includes("A403")) return "Wrought Austenitic Fittings";
  if (sourceUpper.includes("A283")) return "Low & Intermediate Tensile Steel Plates";
  return "";
};

export const parseExcelOrCsvFile = (file: File): Promise<ImportedCsvRow[]> => {
  return new Promise((resolve, reject) => {
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    const reader = new FileReader();
    
    if (isExcel) {
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            resolve([]);
            return;
          }
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rowsJson = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
          if (rowsJson.length === 0) {
            resolve([]);
            return;
          }
          
          const parsedRows: ImportedCsvRow[] = [];
          let currentHeader: string[] = [];
          let rowIndex = 0;
          
          for (const row of rowsJson) {
            if (!Array.isArray(row) || row.length === 0) continue;
            const cols = row.map(cell => cell !== null && cell !== undefined ? String(cell).trim() : "");
            
            if (cols[0] && cols[0].toLowerCase() === "sample") {
              currentHeader = cols;
            } else if (currentHeader.length > 0 && cols.length > 0) {
              const sample = cols[0] || "";
              if (!sample || sample.toLowerCase() === "sample") continue;
              const match = cols[1] || "";
              const values: Record<string, string> = {};
              for (let i = 2; i < currentHeader.length; i++) {
                const key = currentHeader[i];
                if (key) {
                  values[key] = cols[i] || "";
                }
              }
              rowIndex++;
              parsedRows.push({
                id: `csv-row-${Date.now()}-${rowIndex}-${Math.random().toString(36).substr(2, 4)}`,
                sample,
                match,
                values
              });
            }
          }
          resolve(parsedRows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          const result = parseCsvProductData(text);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    }
  });
};

export const parseExcelOrCsvStandards = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    const reader = new FileReader();

    if (isExcel) {
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            resolve([]);
            return;
          }
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          resolve(processStandardRows(json));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const rows = text.split(/\r?\n/).map(line => {
            const result = [];
            let current = "";
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if ((char === ',' || char === ';') && !inQuotes) {
                result.push(current.trim());
                current = "";
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          });
          resolve(processStandardRows(rows));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    }
  });
};

export const processStandardRows = (rowsJson: any[][]): any[] => {
  const standardsMap: { [key: string]: any } = {};
  if (rowsJson.length === 0) return [];

  const cleanRows = rowsJson.filter(r => Array.isArray(r) && r.some(c => c !== null && c !== undefined && String(c).trim() !== ""));
  if (cleanRows.length === 0) return [];

  const firstRow = cleanRows[0].map(c => String(c || "").trim().toLowerCase());
  let hasHeaders = false;
  let colCat = 0, colName = 1, colSource = 2, colParam = 3, colUnit = 4, colSpec = 5, colDesc = -1;

  const catIdx = firstRow.findIndex(h => h.includes("kategori") || h.includes("category"));
  const nameIdx = firstRow.findIndex(h => h.includes("nama") || h.includes("name") || h.includes("grade") || h.includes("uji"));
  const srcIdx = firstRow.findIndex(h => h.includes("sumber") || h.includes("source") || h.includes("acuan"));
  const paramIdx = firstRow.findIndex(h => h.includes("parameter") || h.includes("param"));
  const unitIdx = firstRow.findIndex(h => h.includes("satuan") || h.includes("unit"));
  const specIdx = firstRow.findIndex(h => h.includes("spec") || h.includes("spesifikasi") || h.includes("batas") || h.includes("range"));
  const descIdx = firstRow.findIndex(h => h.includes("bentuk") || h.includes("deskripsi") || h.includes("product") || h.includes("description"));

  if (catIdx !== -1 && nameIdx !== -1) {
    hasHeaders = true;
    colCat = catIdx;
    colName = nameIdx;
    colSource = srcIdx !== -1 ? srcIdx : 2;
    colParam = paramIdx !== -1 ? paramIdx : 3;
    colUnit = unitIdx !== -1 ? unitIdx : 4;
    colSpec = specIdx !== -1 ? specIdx : 5;
    colDesc = descIdx;
  }

  const startIndex = hasHeaders ? 1 : 0;

  for (let i = startIndex; i < cleanRows.length; i++) {
    const row = cleanRows[i];
    const cat = String(row[colCat] || "").trim().toLowerCase();
    const name = String(row[colName] || "").trim();
    if (!cat || !name) continue;

    let finalCat = "logam";
    if (cat.includes("karung")) finalCat = "karung";
    else if (cat.includes("benang")) finalCat = "benang";
    else if (cat.includes("motor") || cat.includes("listrik") || cat.includes("rpm")) finalCat = "kelistrikan";
    else if (cat.includes("valve") || cat.includes("katup")) finalCat = "Valve";
    else if (cat.includes("filter") || cat.includes("cloth") || cat.includes("kain")) finalCat = "filter cloth";
    else if (cat.includes("rubber") || cat.includes("karet")) finalCat = "rubber";

    const source = String(row[colSource] || "KSM INTERNAL").trim();
    const desc = colDesc !== -1 && row[colDesc] ? String(row[colDesc]).trim() : "";

    const groupKey = `${finalCat}::${name.toLowerCase()}`;
    if (!standardsMap[groupKey]) {
      standardsMap[groupKey] = {
        category: finalCat,
        name: name,
        source: source,
        description: desc || "",
        parameters: []
      };
    }

    let loadedMultipleParams = false;
    for (let c = 3; c < row.length - 2; c += 3) {
      const pName = String(row[c] || "").trim();
      const pUnit = String(row[c+1] || "").trim();
      const pSpec = String(row[c+2] || "").trim();
      if (pName && pSpec && !pName.toLowerCase().includes("kategori") && !pName.toLowerCase().includes("sumber") && !pName.toLowerCase().includes("bentuk")) {
        standardsMap[groupKey].parameters.push({ name: pName, unit: pUnit, spec: pSpec });
        loadedMultipleParams = true;
      }
    }

    if (!loadedMultipleParams) {
      const paramName = String(row[colParam] || "").trim();
      const paramUnit = String(row[colUnit] || "").trim();
      const paramSpec = String(row[colSpec] || "").trim();
      if (paramName && paramSpec) {
        standardsMap[groupKey].parameters.push({ name: paramName, unit: paramUnit, spec: paramSpec });
      }
    }
  }

  return Object.values(standardsMap);
};

export const parseCsvProductData = (text: string): ImportedCsvRow[] => {
  const lines = text.split(/\r?\n/);
  const parsedRows: ImportedCsvRow[] = [];
  let currentHeader: string[] = [];
  
  // Choose delimiter: look at the first non-empty line
  let delimiter = ",";
  for (const line of lines) {
    if (line.trim()) {
      if (line.includes(";") && !line.includes(",")) {
        delimiter = ";";
      } else if (line.includes(";") && line.includes(",")) {
        const scolons = (line.match(/;/g) || []).length;
        const commas = (line.match(/,/g) || []).length;
        if (scolons > commas) {
          delimiter = ";";
        }
      }
      break;
    }
  }

  let rowIndex = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Split on detected delimiter and strip double quotes
    const cols = trimmed.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
    
    if (cols[0] && cols[0].toLowerCase() === "sample") {
      currentHeader = cols;
    } else if (currentHeader.length > 0 && cols.length > 0) {
      const sample = cols[0] || "";
      if (!sample || sample.toLowerCase() === "sample") continue;
      
      const match = cols[1] || "";
      const values: Record<string, string> = {};
      
      for (let i = 2; i < currentHeader.length; i++) {
        const key = currentHeader[i];
        if (key) {
          const val = cols[i] || "";
          values[key] = val;
        }
      }
      
      rowIndex++;
      parsedRows.push({
        id: `csv-row-${Date.now()}-${rowIndex}-${Math.random().toString(36).substr(2, 4)}`,
        sample,
        match,
        values
      });
    }
  }
  return parsedRows;
};

const cleanVendorName = (name: string): string => {
  if (!name) return "";
  return name
    .toUpperCase()
    .replace(/\b(PT|CV|UD|TBK|PD|KOPERASI)\b/g, "")
    .replace(/[^A-Z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const findMatchingVendor = (newName: string, existingVendors: string[]): string => {
  const normalizedNew = cleanVendorName(newName);
  if (!normalizedNew) return newName.trim().toUpperCase();

  // Try to find an exact match after cleaning
  for (const ext of existingVendors) {
    if (!ext) continue;
    const normalizedExt = cleanVendorName(ext);
    if (normalizedExt === normalizedNew) {
      return ext.toUpperCase(); // Match found!
    }
    // Substring match: e.g., if "DUTA KEKAR" is a substring of "PT DUTA KEKAR" or vice-versa
    if (normalizedExt.length > 2 && normalizedNew.length > 2) {
      if (normalizedExt.includes(normalizedNew) || normalizedNew.includes(normalizedExt)) {
        return ext.toUpperCase();
      }
    }
  }
  return newName.trim().toUpperCase();
};

export default function DashboardITRK({ currentUser, onLogout, allData, onDataRefresh }: DashboardITRKProps) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const askConfirmation = (message: string, onConfirm: () => void, onCancel?: () => void) => {
    setConfirmModal({ message, onConfirm, onCancel });
  };

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(prev => prev === message ? null : prev);
    }, 4000);
  };

  const alert = (message: string) => {
    const isError = message.toLowerCase().includes("gagal") || message.toLowerCase().includes("error") || message.toLowerCase().includes("wajib") || message.toLowerCase().includes("tidak") || message.toLowerCase().includes("terjadi");
    showToast(message, isError ? "error" : "success");
  };

  const confirm = (message: string): boolean => {
    return true;
  };

  const [activeTab, setActiveTab] = useState<"registrasi" | "uji" | "review" | "terbit" | "analisa" | "master" | "arsip" | "user">("registrasi");
  const [registrations, setRegistrations] = useState<Registration[]>(allData.registrations);
  const [standards, setStandards] = useState<Standard[]>(allData.standards);
  const [signatures, setSignatures] = useState<Signature[]>(allData.signatures);

  // Filtered views and search
  const [search, setSearch] = useState("");

  // Modals / active actions
  const [viewingReport, setViewingReport] = useState<Registration | null>(null);
  const [activeTesting, setActiveTesting] = useState<Registration | null>(null);
  const [activeTestingStandard, setActiveTestingStandard] = useState<Standard | null>(null);
  const [testingValues, setTestingValues] = useState<{ [paramName: string]: string }>({});
  const [karungGrid, setKarungGrid] = useState<{ [trialIdx: number]: { [paramName: string]: string } }>({});
  const lastMappedRowRef = React.useRef<{ id: string; time: number } | null>(null);
  const [testingPointIndex, setTestingPointIndex] = useState(1);
  const [testingPointsList, setTestingPointsList] = useState<any[]>([]);
  
  // Custom testing session states (Tools, Custom parameters, Dynamic testing count)
  const [testingSelectedTools, setTestingSelectedTools] = useState<string[]>([]);
  const [customtestingParams, setCustomtestingParams] = useState<{name: string, spec: string, unit: string}[]>([]);
  const [preSpectrometerValues, setPreSpectrometerValues] = useState<{ [paramName: string]: string } | null>(null);
  const [preSpectrometerCustomParams, setPreSpectrometerCustomParams] = useState<{name: string, spec: string, unit: string}[] | null>(null);
  const [newCustomParamName, setNewCustomParamName] = useState("");
  const [newCustomParamSpec, setNewCustomParamSpec] = useState("");
  const [newCustomParamUnit, setNewCustomParamUnit] = useState("");
  const [testingPointsCount, setTestingPointsCount] = useState<number>(1);
  
  // Custom states for new categories and notes
  const [testerNotes, setTesterNotes] = useState("");
  const [electricalType, setElectricalType] = useState("motor_listrik");
  const [nameplatePhoto, setNameplatePhoto] = useState("");
  const [dailyOcrCount, setDailyOcrCount] = useState<number>(0);
  const [valveManometerPhoto, setValveManometerPhoto] = useState("");
  const [valveAllValvesPhoto, setValveAllValvesPhoto] = useState("");
  const [valveActiveTestPhoto, setValveActiveTestPhoto] = useState("");
  const [valveTotal, setValveTotal] = useState("");
  const [valveLulus, setValveLulus] = useState("");
  const [valveGagal, setValveGagal] = useState("");
  const [isAnalyzingNameplate, setIsAnalyzingNameplate] = useState(false);
  const [showAiOcrAssistant, setShowAiOcrAssistant] = useState(false);

  // Initialize/validate daily OCR scan counts inside a standard React hook
  React.useEffect(() => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const savedDate = localStorage.getItem("ai_ocr_daily_date");
      const savedCount = localStorage.getItem("ai_ocr_daily_count");
      if (savedDate === todayStr) {
        setDailyOcrCount(parseInt(savedCount || "0", 10));
      } else {
        localStorage.setItem("ai_ocr_daily_date", todayStr);
        localStorage.setItem("ai_ocr_daily_count", "0");
        setDailyOcrCount(0);
      }
    } catch (e) {
      console.warn("Storage limits triggered or private browsing active:", e);
    }
  }, [showAiOcrAssistant]);

  const incrementDailyOcr = () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const newCount = dailyOcrCount + 1;
      localStorage.setItem("ai_ocr_daily_date", todayStr);
      localStorage.setItem("ai_ocr_daily_count", String(newCount));
      setDailyOcrCount(newCount);
    } catch (e) {
      console.warn(e);
    }
  };
  
  const handleBenangChange = (fieldName: string, value: string) => {
    setTestingValues(prev => {
      const nextVals = { ...prev, [fieldName]: value };
      const weightVal = parseFloat(nextVals["Weight"] || nextVals["Berat/9m"] || "");
      const strengthVal = parseFloat(nextVals["Tensile Strength"] || nextVals["Kuat Tarik"] || "");
      
      if (!isNaN(weightVal) && weightVal > 0) {
        const nomorPita = weightVal * 1000;
        nextVals["Nomor Pita"] = nomorPita.toFixed(1);
        
        if (!isNaN(strengthVal)) {
          const tenacity = (strengthVal * 1000) / nomorPita;
          nextVals["Tenacity"] = tenacity.toFixed(2);
        }
      }
      return nextVals;
    });
  };

  const handleNameplateOcr = async (file: File) => {
    // 1. Quota check: max 10 per day in development
    if (dailyOcrCount >= 10) {
      alert("⚠️ Batas harian tercapai! Anda telah menggunakan maksimal 10 Scan AI gratis per hari selama masa development ini.");
      return;
    }

    setIsAnalyzingNameplate(true);
    try {
      const base64Img = await compressAndConvertToBase64(file);
      // Auto-save the uploaded image as the nameplate photo proof for reviewer crosschecking
      setNameplatePhoto(base64Img);

      const res = await fetch("/api/gemini/analyze-nameplate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64Img })
      });
      const data = await res.json();
      if (data.success && data.parsed) {
        const p = data.parsed;
        
        // Helper to solve matching text choosing the more detailed string
        const selectMoreDetailed = (str1: string, str2: string) => {
          const s1 = (str1 || "").trim();
          const s2 = (str2 || "").trim();
          if (!s1) return s2;
          if (!s2) return s1;
          const s1Clean = s1.toLowerCase().replace(/[^a-z0-9]/g, "");
          const s2Clean = s2.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (s1Clean === s2Clean || s1Clean.includes(s2Clean) || s2Clean.includes(s1Clean)) {
            return s1.length >= s2.length ? s1 : s2;
          }
          return null; // Not matching
        };

        const paramsList = ELECTRICAL_PARAMS[electricalType] || ELECTRICAL_PARAMS.motor_listrik;

        setTestingValues(prev => {
          const next = { ...prev };
          const ocrMerk = p.merk || p.brand || "";
          const ocrType = p.type || p.model || "";
          const ocrRpm = p.rpm || "";
          const ocrVoltage = p.voltage || "";
          const ocrIns = p.insulationClass || "Class F";
          const ocrIp = p.ipRating || "IP55";

          const ocrMap: Record<string, string> = {
            "Merk": ocrMerk,
            "Type": ocrType,
            "RPM": ocrRpm,
            "RPM Input / Output": p.gear_rpm_input_output || ocrRpm,
            "Voltage Rating": ocrVoltage,
            "Phase / Hz / kW": p.hz_kw_ampere || "",
            "Hz / kW / Ampere": p.hz_kw_ampere || "",
            "Class / IP": p.ins_class_ip || `${ocrIns} / ${ocrIp}`,
            "Ins class / IP": p.ins_class_ip || `${ocrIns} / ${ocrIp}`,
            "Duty / PF": p.duty_pf || "",
            "No. Seri": p.no_seri || ""
          };

          paramsList.forEach(param => {
            const poKey = `${param} (Sesuai PO)`;
            const npKey = `${param} (Sesuai Nameplate)`;
            const poVal = (next[poKey] || "").trim();
            const ocrVal = (ocrMap[param] || "").trim();

            // Highlight and pre-fill "Sesuai Nameplate"
            if (ocrVal) {
              next[npKey] = ocrVal;
              // If Sesuai PO is empty, copy it as default to save user manual typing labor!
              if (!poVal) {
                next[poKey] = ocrVal;
              }
            } else {
              next[npKey] = "-";
            }

            // If both exist, check if there is a match & synchronize to the more detailed/complete text
            if (poVal && ocrVal) {
              const bestDetailed = selectMoreDetailed(poVal, ocrVal);
              if (bestDetailed) {
                next[poKey] = bestDetailed;
                next[npKey] = bestDetailed;
              }
            }
          });

          return next;
        });

        // Increment daily usage quota
        incrementDailyOcr();
        alert(`🎉 Bantuan AI berhasil memadankan & mengisi spesifikasi nameplate! (${dailyOcrCount + 1}/10 scan terpakai hari ini)`);
      } else {
        alert(data.message || "Gagal memproses gambar nameplate via AI.");
      }
    } catch (err) {
      console.error(err);
      alert("Gagal menganalisis nameplate via AI.");
    } finally {
      setIsAnalyzingNameplate(false);
    }
  };
  
  // Custom states
  const [importText, setImportText] = useState("");
  const [pastingMode, setPastingMode] = useState(false);
  const [aiScanning, setAiScanning] = useState(false);
  const [aiError, setAiError] = useState("");
  const [ocrBase64, setOcrBase64] = useState("");
  
  // Signature management
  const [newSigName, setNewSigName] = useState("");
  const [newSigPosition, setNewSigPosition] = useState("");
  const [newSigInitials, setNewSigInitials] = useState("");

  // Standards management
  const [newStdCategory, setNewStdCategory] = useState<any>("logam");
  const [newStdName, setNewStdName] = useState("");
  const [newStdSource, setNewStdSource] = useState("");
  const [newStdDescription, setNewStdDescription] = useState("");
  const [newStdParams, setNewStdParams] = useState<any[]>([{ name: "", unit: "", spec: "" }]);
  const [newStdDefaultNamaKarung, setNewStdDefaultNamaKarung] = useState("");

  // Editing standard states
  const [editingStandard, setEditingStandard] = useState<Standard | null>(null);
  const [viewingStandardDetail, setViewingStandardDetail] = useState<Standard | null>(null);
  const [editStdCategory, setEditStdCategory] = useState<any>("logam");
  const [editStdName, setEditStdName] = useState("");
  const [editStdSource, setEditStdSource] = useState("");
  const [editStdDescription, setEditStdDescription] = useState("");
  const [editStdParams, setEditStdParams] = useState<any[]>([{ name: "", unit: "", spec: "" }]);
  const [editStdDefaultNamaKarung, setEditStdDefaultNamaKarung] = useState("");

  // Editing signature states
  const [editingSignature, setEditingSignature] = useState<Signature | null>(null);
  const [editSigName, setEditSigName] = useState("");
  const [editSigPosition, setEditSigPosition] = useState("");
  const [editSigInitials, setEditSigInitials] = useState("");
  const [editSigType, setEditSigType] = useState<"qrcode" | "digital">("qrcode");
  const [editSigImage, setEditSigImage] = useState(""); // base64 string

  // Dynamic point description and standard overriding states - Finding 2 & 3
  const [pointKeterangan, setPointKeterangan] = useState("");
  const [pointOverrideStandardId, setPointOverrideStandardId] = useState("");

  // Canvas drawing ref and drawing handlers - Requirement 4
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const lastXRef = React.useRef<number>(0);
  const lastYRef = React.useRef<number>(0);
  const [isDrawing, setIsDrawing] = useState(false);

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    canvas.style.width = "400px";
    canvas.style.height = "200px";
    
    const ratio = window.devicePixelRatio || 2;
    canvas.width = 400 * ratio;
    canvas.height = 200 * ratio;
    
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a"; // Natural dark pigment ink
    ctx.lineWidth = 3;
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 400, 200);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 400, 200);
      }
    }
    setEditSigImage("");
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (e.cancelable) e.preventDefault();
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Multiply by styling width/height scale factors to handle arbitrary layouts without skewing
    const x = (clientX - rect.left) * (canvas.width / (rect.width * (window.devicePixelRatio || 2)));
    const y = (clientY - rect.top) * (canvas.height / (rect.height * (window.devicePixelRatio || 2)));
    
    lastXRef.current = x;
    lastYRef.current = y;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    // Set smooth ink stylings
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a"; // Sleek premium dark pigment
    ctx.lineWidth = 2.4; // fine-tip fountain pen effect
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (e.cancelable) e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * (canvas.width / (rect.width * (window.devicePixelRatio || 2)));
    const y = (clientY - rect.top) * (canvas.height / (rect.height * (window.devicePixelRatio || 2)));

    // Smooth spline interpolation: Calculate quadratic curve from previous midpoint to modern coordinates
    ctx.beginPath();
    ctx.moveTo(lastXRef.current, lastYRef.current);
    
    const midX = (lastXRef.current + x) / 2;
    const midY = (lastYRef.current + y) / 2;
    
    ctx.quadraticCurveTo(lastXRef.current, lastYRef.current, midX, midY);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastXRef.current = x;
    lastYRef.current = y;
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas) {
      const base64 = canvas.toDataURL("image/png");
      setEditSigImage(base64);
    }
  };

  const handleSignatureImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setEditSigImage(base64);
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, 400, 200);
            ctx.drawImage(img, 0, 0, 400, 200);
          }
        };
        img.src = base64;
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (editingSignature) {
      const timer = setTimeout(() => {
        setupCanvas();
        if (editingSignature.signatureImage && editingSignature.signatureType === "digital") {
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            const img = new Image();
            img.onload = () => {
              if (ctx) {
                ctx.drawImage(img, 0, 0, 400, 200);
              }
            };
            img.src = editingSignature.signatureImage;
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [editingSignature]);

  // Add standard parameters dynamically
  const addParamRow = () => setNewStdParams([...newStdParams, { name: "", unit: "", spec: "" }]);
  const removeParamRow = (idx: number) => setNewStdParams(newStdParams.filter((_, i) => i !== idx));

  // User management (SuperAdmin Only)
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<any>("Tim Penguji");
  const [newFullName, setNewFullName] = useState("");
  const [newInitials, setNewInitials] = useState("");
  const [userSuccessMsg, setUserSuccessMsg] = useState("");
  const [userErrorMsg, setUserErrorMsg] = useState("");

  // Review status
  const [reviewComments, setReviewComments] = useState("");
  const [reviewCommentsMap, setReviewCommentsMap] = useState<Record<string, string>>({});
  const [reviewUseQr, setReviewUseQr] = useState(true);
  const [reviewUseQrMap, setReviewUseQrMap] = useState<Record<string, boolean>>({});

  // Batch selections in published reports
  const [selectedCompletedRegs, setSelectedCompletedRegs] = useState<string[]>([]);

  // Master category active filter tab
  const [activeMasterCatTab, setActiveMasterCatTab] = useState<string>("logam");

  // Manual single registration states
  const [manualRegMode, setManualRegMode] = useState(false);
  const [manPPJCode, setManPPJCode] = useState("");
  const [manPRCode, setManPRCode] = useState("");
  const [manPOCode, setManPOCode] = useState("");
  const [manVendor, setManVendor] = useState("");
  const [manCategory, setManCategory] = useState("logam");
  const [manItemName, setManItemName] = useState("");
  const [manDescription, setManDescription] = useState("");
  const [manQuantity, setManQuantity] = useState("1 Pcs");
  const [manPoints, setManPoints] = useState(1);
  const [manStandardName, setManStandardName] = useState("");
  const [manStandardSource, setManStandardSource] = useState("");
  const [manTanggalPPJ, setManTanggalPPJ] = useState(new Date().toISOString().split("T")[0]);
  const [manTanggalDiterima, setManTanggalDiterima] = useState(new Date().toISOString().split("T")[0]);
  const [manMetalAcuan, setManMetalAcuan] = useState("");
  const [manPlatNomor, setManPlatNomor] = useState("");

  // Batch preview buffer
  const [batchPreviewItems, setBatchPreviewItems] = useState<any[]>([]);
  const [showBatchCancelConfirm, setShowBatchCancelConfirm] = useState(false);

  const updatePreviewItem = (index: number, updatedFields: Partial<any>) => {
    setBatchPreviewItems(prev => {
      if (!prev[index]) return prev;
      const next = [...prev];
      const oldItem = prev[index];
      const targetItem = { ...next[index], ...updatedFields };

      if (targetItem.vendor) targetItem.vendor = targetItem.vendor.toUpperCase();
      if (targetItem.itemName) targetItem.itemName = targetItem.itemName.toUpperCase();

      return next.map((item, i) => {
        if (i === index) {
          return targetItem;
        }
        if (item.ppjCode === targetItem.ppjCode || (updatedFields.ppjCode !== undefined && item.ppjCode === oldItem.ppjCode)) {
          const synced = { ...item };
          if (updatedFields.ppjCode !== undefined) synced.ppjCode = updatedFields.ppjCode;
          if (updatedFields.poCode !== undefined) synced.poCode = updatedFields.poCode;
          if (updatedFields.vendor !== undefined) synced.vendor = updatedFields.vendor;
          if (updatedFields.prCode !== undefined) synced.prCode = updatedFields.prCode;
          return synced;
        }
        return item;
      });
    });
  };

  // Editing registration modal states
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [editPPJCode, setEditPPJCode] = useState("");
  const [editPRCode, setEditPRCode] = useState("");
  const [editPOCode, setEditPOCode] = useState("");
  const [editVendor, setEditVendor] = useState("");
  const [editCategory, setEditCategory] = useState("logam");
  const [editItemName, setEditItemName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editPoints, setEditPoints] = useState(1);
  const [editStandardName, setEditStandardName] = useState("");
  const [editStandardSource, setEditStandardSource] = useState("");
  const [editTanggalPPJ, setEditTanggalPPJ] = useState("");
  const [editTanggalDiterima, setEditTanggalDiterima] = useState("");
  const [editMetalAcuan, setEditMetalAcuan] = useState("");
  const [editPlatNomor, setEditPlatNomor] = useState("");

  // Update lists when global props change
  useEffect(() => {
    setRegistrations(allData.registrations);
    setStandards(allData.standards);
    setSignatures(allData.signatures);
  }, [allData]);

  // Firebase Integration State
  const [firebaseStatus, setFirebaseStatus] = useState<any>(null);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [firebaseStatusLoading, setFirebaseStatusLoading] = useState(false);

  const fetchFirebaseStatus = async () => {
    setFirebaseStatusLoading(true);
    try {
      const res = await fetch("/api/firebase/status");
      if (res.ok) {
        const data = await res.json();
        setFirebaseStatus(data);
      } else {
        throw new Error("API not available");
      }
    } catch (err) {
      console.warn("Backend status API failed, running client-side direct check on Firestore...");
      try {
        const standardsSnap = await getDocs(collection(db, "standards"));
        const registrationsSnap = await getDocs(collection(db, "registrations"));
        const signaturesSnap = await getDocs(collection(db, "signatures"));
        const usersSnap = await getDocs(collection(db, "users"));
        
        const metaEnv = (import.meta as any).env || {};
        setFirebaseStatus({
          success: true,
          configExists: true,
          config: {
            projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "new-iris-f6f26",
            firestoreDatabaseId: metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "default"
          },
          initialized: true,
          connectionTest: "Success",
          errorMsg: null,
          stats: {
            registrations: registrationsSnap.size,
            standards: standardsSnap.size,
            signatures: signaturesSnap.size,
            users: usersSnap.size || 3
          },
          dbSizeBytes: 0,
          limitBytes: 1073741824,
          isClientSideOnly: true
        });
      } catch (clientErr: any) {
        console.error("Direct client-side Firestore connection test also failed:", clientErr);
        const metaEnv = (import.meta as any).env || {};
        setFirebaseStatus({
          success: false,
          configExists: !!metaEnv.VITE_FIREBASE_PROJECT_ID,
          config: {
            projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "not-configured",
            firestoreDatabaseId: metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "default"
          },
          initialized: false,
          connectionTest: "Failed",
          errorMsg: clientErr.message || String(clientErr),
          stats: { registrations: 0, standards: 0, signatures: 0, users: 0 }
        });
      }
    } finally {
      setFirebaseStatusLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "master") {
      fetchFirebaseStatus();
    }
  }, [activeTab]);

  // Sidebar collapse display modes: 'full' | 'icon' | 'hidden'
  const [sidebarMode, setSidebarMode] = useState<"full" | "icon" | "hidden">("full");

  // Selection states for other queues to handle operations together
  const [selectedDraftRegs, setSelectedDraftRegs] = useState<string[]>([]);
  const [selectedReviewRegs, setSelectedReviewRegs] = useState<string[]>([]);
  const [selectedArsipRegs, setSelectedArsipRegs] = useState<string[]>([]);

  // Pagination current active pages (limit max 10 per page)
  const [draftPage, setDraftPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [terbitPage, setTerbitPage] = useState(1);
  const [arsipPage, setArsipPage] = useState(1);
  const [masterPage, setMasterPage] = useState(1);

  // Persistent imported CSV row list and recommendations
  const [importedCsvRows, setImportedCsvRows] = useState<ImportedCsvRow[]>(() => {
    try {
      const saved = localStorage.getItem("itrk_imported_csv_rows");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [lastTestedCategory, setLastTestedCategory] = useState<string>(() => {
    return localStorage.getItem("itrk_last_tested_category") || "";
  });

  const [ujiSearch, setUjiSearch] = useState("");
  const [activeCsvSearch, setActiveCsvSearch] = useState("");

  useEffect(() => {
    localStorage.setItem("itrk_imported_csv_rows", JSON.stringify(importedCsvRows));
  }, [importedCsvRows]);

  useEffect(() => {
    localStorage.setItem("itrk_last_tested_category", lastTestedCategory || "");
  }, [lastTestedCategory]);

  // Searching & sorting states for all tabs
  const [draftSearch, setDraftSearch] = useState("");
  const [reviewSearch, setReviewSearch] = useState("");
  const [terbitSearch, setTerbitSearch] = useState("");
  const [arsipSearch, setArsipSearch] = useState("");
  const [masterSearch, setMasterSearch] = useState("");

  // Drafting advanced filter options
  const [draftFilterCategory, setDraftFilterCategory] = useState("All");
  const [draftFilterVendor, setDraftFilterVendor] = useState("All");
  const [draftFilterStandard, setDraftFilterStandard] = useState("All");
  const [draftFilterDate, setDraftFilterDate] = useState("");
  const [draftFilterDateType, setDraftFilterDateType] = useState<"diterima" | "ppj">("diterima");

  // Reviewing advanced filter options
  const [reviewFilterCategory, setReviewFilterCategory] = useState("All");
  const [reviewFilterVendor, setReviewFilterVendor] = useState("All");
  const [reviewFilterStandard, setReviewFilterStandard] = useState("All");
  const [reviewFilterDate, setReviewFilterDate] = useState("");
  const [reviewFilterDateType, setReviewFilterDateType] = useState<"diuji" | "diterima" | "ppj">("diuji");

  // Terbit advanced filter options
  const [terbitFilterCategory, setTerbitFilterCategory] = useState("All");
  const [terbitFilterVendor, setTerbitFilterVendor] = useState("All");
  const [terbitFilterStandard, setTerbitFilterStandard] = useState("All");
  const [terbitFilterDate, setTerbitFilterDate] = useState("");
  const [terbitFilterDateType, setTerbitFilterDateType] = useState<"terbit" | "diterima" | "ppj">("terbit");

  // Analisa filter options
  const [analisaFilterCategory, setAnalisaFilterCategory] = useState("All");
  const [analisaFilterVendor, setAnalisaFilterVendor] = useState("All");
  const [analisaFilterStartDate, setAnalisaFilterStartDate] = useState("");
  const [analisaFilterEndDate, setAnalisaFilterEndDate] = useState("");
  const [analisaFilterMonth, setAnalisaFilterMonth] = useState("All");
  const [analisaFilterYear, setAnalisaFilterYear] = useState("All");
  const [analisaFilterDateType, setAnalisaFilterDateType] = useState<"ppj" | "diterima" | "terbit">("ppj");
  
  // Real-time auto-reset pages back to 1 when filters change
  useEffect(() => { setDraftPage(1); }, [draftSearch]);
  useEffect(() => { setReviewPage(1); }, [reviewSearch]);
  useEffect(() => { setTerbitPage(1); }, [terbitSearch]);
  useEffect(() => { setArsipPage(1); }, [arsipSearch]);
  useEffect(() => { setMasterPage(1); }, [masterSearch, activeMasterCatTab]);

  useEffect(() => { setDraftPage(1); }, [draftFilterCategory, draftFilterVendor, draftFilterStandard, draftFilterDate, draftFilterDateType]);
  useEffect(() => { setReviewPage(1); }, [reviewFilterCategory, reviewFilterVendor, reviewFilterStandard, reviewFilterDate, reviewFilterDateType]);
  useEffect(() => { setTerbitPage(1); }, [terbitFilterCategory, terbitFilterVendor, terbitFilterStandard, terbitFilterDate, terbitFilterDateType]);

  const [draftSortKey, setDraftSortKey] = useState<keyof Registration | "">("noReg");
  const [draftSortDir, setDraftSortDir] = useState<"asc" | "desc">("desc");

  const [reviewSortKey, setReviewSortKey] = useState<keyof Registration | "">("noReg");
  const [reviewSortDir, setReviewSortDir] = useState<"asc" | "desc">("desc");

  const [terbitSortKey, setTerbitSortKey] = useState<keyof Registration | "">("noReg");
  const [terbitSortDir, setTerbitSortDir] = useState<"asc" | "desc">("desc");

  const [arsipSortKey, setArsipSortKey] = useState<keyof Registration | "">("noReg");
  const [arsipSortDir, setArsipSortDir] = useState<"asc" | "desc">("desc");

  const [masterSortKey, setMasterSortKey] = useState<keyof Standard | "">("");
  const [masterSortDir, setMasterSortDir] = useState<"asc" | "desc">("asc");

  const handleSortDraft = (key: keyof Registration) => {
    if (draftSortKey === key) {
      setDraftSortDir(draftSortDir === "asc" ? "desc" : "asc");
    } else {
      setDraftSortKey(key);
      setDraftSortDir("asc");
    }
  };

  const getFilteredDrafts = () => {
    let list = registrations.filter(r => r.status === "Draft");
    if (draftSearch.trim()) {
      const q = draftSearch.toLowerCase();
      list = list.filter(r => 
        r.noReg.toLowerCase().includes(q) ||
        r.ppjCode.toLowerCase().includes(q) ||
        r.itemName.toLowerCase().includes(q) ||
        r.vendor.toLowerCase().includes(q) ||
        r.poCode.toLowerCase().includes(q) ||
        r.prCode.toLowerCase().includes(q) ||
        (r.standardName || "").toLowerCase().includes(q)
      );
    }

    // Apply categories filter
    if (draftFilterCategory && draftFilterCategory !== "All") {
      list = list.filter(r => r.category === draftFilterCategory);
    }

    // Apply vendor filter
    if (draftFilterVendor && draftFilterVendor !== "All") {
      list = list.filter(r => r.vendor === draftFilterVendor);
    }

    // Apply standard filter
    if (draftFilterStandard && draftFilterStandard !== "All") {
      list = list.filter(r => r.standardName === draftFilterStandard);
    }

    // Apply date filter
    if (draftFilterDate) {
      if (draftFilterDateType === "diterima") {
        list = list.filter(r => r.tanggalDiterima === draftFilterDate);
      } else {
        list = list.filter(r => r.tanggalPPJ === draftFilterDate);
      }
    }

    if (draftSortKey) {
      list = [...list].sort((a, b) => {
        const valA = String(a[draftSortKey] || "").toLowerCase();
        const valB = String(b[draftSortKey] || "").toLowerCase();
        return draftSortDir === "asc" 
          ? valA.localeCompare(valB, undefined, { numeric: true }) 
          : valB.localeCompare(valA, undefined, { numeric: true });
      });
    }
    return list;
  };

  const handleSortReview = (key: keyof Registration) => {
    if (reviewSortKey === key) {
      setReviewSortDir(reviewSortDir === "asc" ? "desc" : "asc");
    } else {
      setReviewSortKey(key);
      setReviewSortDir("asc");
    }
  };

  const getFilteredReviews = () => {
    let list = registrations.filter(r => r.status === "Uji");
    if (reviewSearch.trim()) {
      const q = reviewSearch.toLowerCase();
      list = list.filter(r => 
        r.noReg.toLowerCase().includes(q) ||
        r.ppjCode.toLowerCase().includes(q) ||
        r.itemName.toLowerCase().includes(q) ||
        r.vendor.toLowerCase().includes(q) ||
        r.poCode.toLowerCase().includes(q) ||
        (r.tanggalDiuji || "").toLowerCase().includes(q) ||
        (r.pengujiInitials || "").toLowerCase().includes(q)
      );
    }

    // Apply categories filter
    if (reviewFilterCategory && reviewFilterCategory !== "All") {
      list = list.filter(r => r.category === reviewFilterCategory);
    }

    // Apply vendor filter
    if (reviewFilterVendor && reviewFilterVendor !== "All") {
      list = list.filter(r => r.vendor === reviewFilterVendor);
    }

    // Apply standard filter
    if (reviewFilterStandard && reviewFilterStandard !== "All") {
      list = list.filter(r => r.standardName === reviewFilterStandard);
    }

    // Apply date filter
    if (reviewFilterDate) {
      if (reviewFilterDateType === "diuji") {
        list = list.filter(r => r.tanggalDiuji === reviewFilterDate);
      } else if (reviewFilterDateType === "diterima") {
        list = list.filter(r => r.tanggalDiterima === reviewFilterDate);
      } else {
        list = list.filter(r => r.tanggalPPJ === reviewFilterDate);
      }
    }

    if (reviewSortKey) {
      list = [...list].sort((a, b) => {
        const valA = String(a[reviewSortKey] || "").toLowerCase();
        const valB = String(b[reviewSortKey] || "").toLowerCase();
        return reviewSortDir === "asc" 
          ? valA.localeCompare(valB, undefined, { numeric: true }) 
          : valB.localeCompare(valA, undefined, { numeric: true });
      });
    }
    return list;
  };

  const handleSortTerbit = (key: keyof Registration) => {
    if (terbitSortKey === key) {
      setTerbitSortDir(terbitSortDir === "asc" ? "desc" : "asc");
    } else {
      setTerbitSortKey(key);
      setTerbitSortDir("asc");
    }
  };

  const getFilteredTerbits = () => {
    let list = registrations.filter(r => r.status === "Terbit");
    if (terbitSearch.trim()) {
      const q = terbitSearch.toLowerCase();
      list = list.filter(r => 
        r.noReg.toLowerCase().includes(q) ||
        (r.noSurat || "").toLowerCase().includes(q) ||
        r.ppjCode.toLowerCase().includes(q) ||
        r.itemName.toLowerCase().includes(q) ||
        r.vendor.toLowerCase().includes(q) ||
        r.poCode.toLowerCase().includes(q) ||
        (r.tanggalTerbit || "").toLowerCase().includes(q)
      );
    }

    // Apply categories filter
    if (terbitFilterCategory && terbitFilterCategory !== "All") {
      list = list.filter(r => r.category === terbitFilterCategory);
    }

    // Apply vendor filter
    if (terbitFilterVendor && terbitFilterVendor !== "All") {
      list = list.filter(r => r.vendor === terbitFilterVendor);
    }

    // Apply standard filter
    if (terbitFilterStandard && terbitFilterStandard !== "All") {
      list = list.filter(r => r.standardName === terbitFilterStandard);
    }

    // Apply date filter
    if (terbitFilterDate) {
      if (terbitFilterDateType === "terbit") {
        list = list.filter(r => r.tanggalTerbit === terbitFilterDate);
      } else if (terbitFilterDateType === "diterima") {
        list = list.filter(r => r.tanggalDiterima === terbitFilterDate);
      } else {
        list = list.filter(r => r.tanggalPPJ === terbitFilterDate);
      }
    }

    if (terbitSortKey) {
      list = [...list].sort((a, b) => {
        const valA = String(a[terbitSortKey] || "").toLowerCase();
        const valB = String(b[terbitSortKey] || "").toLowerCase();
        return terbitSortDir === "asc" 
          ? valA.localeCompare(valB, undefined, { numeric: true }) 
          : valB.localeCompare(valA, undefined, { numeric: true });
      });
    }
    return list;
  };

  const handleSortArsip = (key: keyof Registration) => {
    if (arsipSortKey === key) {
      setArsipSortDir(arsipSortDir === "asc" ? "desc" : "asc");
    } else {
      setArsipSortKey(key);
      setArsipSortDir("asc");
    }
  };

  const getFilteredArsips = () => {
    let list = [...registrations];
    if (arsipSearch.trim()) {
      const q = arsipSearch.toLowerCase();
      list = list.filter(r => 
        r.noReg.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.ppjCode.toLowerCase().includes(q) ||
        r.itemName.toLowerCase().includes(q) ||
        r.vendor.toLowerCase().includes(q) ||
        r.poCode.toLowerCase().includes(q) ||
        r.prCode.toLowerCase().includes(q) ||
        (r.standardName || "").toLowerCase().includes(q)
      );
    }
    if (arsipSortKey) {
      list = [...list].sort((a, b) => {
        const valA = String(a[arsipSortKey] || "").toLowerCase();
        const valB = String(b[arsipSortKey] || "").toLowerCase();
        return arsipSortDir === "asc" 
          ? valA.localeCompare(valB, undefined, { numeric: true }) 
          : valB.localeCompare(valA, undefined, { numeric: true });
      });
    }
    return list;
  };

  const handleSortMaster = (key: keyof Standard) => {
    if (masterSortKey === key) {
      setMasterSortDir(masterSortDir === "asc" ? "desc" : "asc");
    } else {
      setMasterSortKey(key);
      setMasterSortDir("asc");
    }
  };

  const getFilteredMasters = () => {
    let list = standards.filter(s => s.category === activeMasterCatTab);
    if (masterSearch.trim()) {
      const q = masterSearch.toLowerCase();
      list = list.filter(s => 
        s.name.toLowerCase().includes(q) ||
        s.source.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q) ||
        s.parameters.some(p => p.name.toLowerCase().includes(q))
      );
    }
    if (masterSortKey) {
      list = [...list].sort((a, b) => {
        const valA = String(a[masterSortKey] || "").toLowerCase();
        const valB = String(b[masterSortKey] || "").toLowerCase();
        return masterSortDir === "asc" 
          ? valA.localeCompare(valB, undefined, { numeric: true }) 
          : valB.localeCompare(valA, undefined, { numeric: true });
      });
    }
    return list;
  };

  const renderSortIndicator = (currentKey: string, activeKey: string, dir: "asc" | "desc") => {
    if (activeKey !== currentKey) return <span className="text-slate-350 ml-1">⇅</span>;
    return dir === "asc" ? <span className="text-emerald-700 ml-1">▲</span> : <span className="text-emerald-700 ml-1">▼</span>;
  };

  const canUji = currentUser.role === "SuperAdmin" || currentUser.role === "Tim Penguji";
  const canReview = currentUser.role === "SuperAdmin" || currentUser.role === "Tim Reviewer";
  const isDewa = currentUser.role === "SuperAdmin";

  const refreshData = async () => {
    onDataRefresh();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !newFullName || !newInitials) {
      setUserErrorMsg("Lengkapi seluruh kolom isian.");
      return;
    }
    try {
      // Direct client-side write to Firestore first
      await setDoc(doc(db, "users", newUsername), {
        username: newUsername,
        password: newPassword,
        name: newFullName,
        initials: newInitials,
        role: newRole
      });

      // Synchronize with local server database
      try {
        await fetch("/api/users/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: newUsername,
            password: newPassword,
            name: newFullName,
            initials: newInitials,
            role: newRole
          })
        });
      } catch (syncErr) {
        console.warn("Server-side sync failed, but data saved to Firestore:", syncErr);
      }

      setUserSuccessMsg("User baru terdaftar dengan aman!");
      setNewUsername("");
      setNewPassword("");
      setNewFullName("");
      setNewInitials("");
      refreshData();
      setTimeout(() => setUserSuccessMsg(""), 3000);
    } catch (err: any) {
      console.error(err);
      setUserErrorMsg("Gagal menyimpan ke Firestore: " + err.message);
    }
  };

  const handleAddStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    const validParams = newStdParams.filter(p => p.name.trim());
    if (!newStdName || validParams.length === 0) return;

    try {
      const res = await fetch("/api/master/standards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newStdCategory,
          name: newStdName,
          source: newStdSource || "KSM INTERNAL",
          description: newStdDescription,
          parameters: validParams,
          defaultNamaKarung: newStdDefaultNamaKarung
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.standard) {
          // Direct client-side write to Firestore using the ID generated by the backend!
          await setDoc(doc(db, "standards", data.standard.id), data.standard);
          
          setNewStdName("");
          setNewStdSource("");
          setNewStdDescription("");
          setNewStdDefaultNamaKarung("");
          setNewStdParams([{ name: "", unit: "", spec: "" }]);
          refreshData();
          return;
        }
      }
      throw new Error("API failed");
    } catch (err) {
      console.warn("Backend API add-standard failed or direct sync failed. Generating local ID for Firestore...");
      try {
        const id = "std-" + Date.now();
        const localStd = {
          id,
          category: newStdCategory,
          name: newStdName,
          source: newStdSource || "KSM INTERNAL",
          description: newStdDescription,
          parameters: validParams,
          defaultNamaKarung: newStdDefaultNamaKarung
        };
        await setDoc(doc(db, "standards", id), localStd);
        
        setNewStdName("");
        setNewStdSource("");
        setNewStdDescription("");
        setNewStdDefaultNamaKarung("");
        setNewStdParams([{ name: "", unit: "", spec: "" }]);
        refreshData();
      } catch (clientErr: any) {
        console.error("Direct write to Firestore failed:", clientErr);
        alert("Gagal menyimpan standard: " + clientErr.message);
      }
    }
  };

  const handleAddSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSigName || !newSigPosition || !newSigInitials) return;

    try {
      const res = await fetch("/api/master/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSigName,
          position: newSigPosition,
          initials: newSigInitials
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.signature) {
          // Direct client-side write to Firestore using the ID generated by the backend!
          await setDoc(doc(db, "signatures", data.signature.id), data.signature);
          
          setNewSigName("");
          setNewSigPosition("");
          setNewSigInitials("");
          refreshData();
          return;
        }
      }
      throw new Error("API failed");
    } catch (err) {
      console.warn("Backend API add-signature failed or direct sync failed. Generating local ID for Firestore...");
      try {
        const id = "sig-" + Date.now();
        const localSig = {
          id,
          name: newSigName,
          position: newSigPosition,
          initials: newSigInitials,
          active: false,
          signatureType: "qrcode",
          signatureImage: ""
        };
        await setDoc(doc(db, "signatures", id), localSig);
        
        setNewSigName("");
        setNewSigPosition("");
        setNewSigInitials("");
        refreshData();
      } catch (clientErr: any) {
        console.error("Direct write to Firestore failed:", clientErr);
        alert("Gagal menyimpan tanda tangan: " + clientErr.message);
      }
    }
  };

  const toggleSignature = async (id: string) => {
    try {
      // Direct client-side write to Firestore first: set the selected signature to active: true, others to active: false
      for (const sig of signatures) {
        await setDoc(doc(db, "signatures", sig.id), {
          ...sig,
          active: sig.id === id
        });
      }

      // Sync with local server database
      try {
        await fetch("/api/master/signatures-toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        });
      } catch (syncErr) {
        console.warn("Server-side signatures-toggle sync failed:", syncErr);
      }

      refreshData();
    } catch (err: any) {
      console.error(err);
      alert("Gagal mengaktifkan tanda tangan: " + err.message);
    }
  };

  const handleEditStandardClick = (std: Standard) => {
    setEditingStandard(std);
    setEditStdCategory(std.category);
    setEditStdName(std.name);
    setEditStdSource(std.source);
    setEditStdDescription(std.description || "");
    setEditStdDefaultNamaKarung(std.defaultNamaKarung || "");
    setEditStdParams(std.parameters && std.parameters.length > 0 ? std.parameters.map(p => ({ ...p })) : [{ name: "", unit: "", spec: "" }]);
  };

  const handleUpdateStandard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStandard) return;
    const validParams = editStdParams.filter(p => p.name.trim());
    if (!editStdName || validParams.length === 0) return;

    try {
      // Direct client-side write to Firestore first
      await setDoc(doc(db, "standards", editingStandard.id), {
        id: editingStandard.id,
        category: editStdCategory,
        name: editStdName,
        source: editStdSource,
        description: editStdDescription,
        parameters: validParams,
        defaultNamaKarung: editStdDefaultNamaKarung
      });

      // Sync with local server database
      try {
        await fetch(`/api/master/standards/${editingStandard.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: editStdCategory,
            name: editStdName,
            source: editStdSource,
            description: editStdDescription,
            parameters: validParams,
            defaultNamaKarung: editStdDefaultNamaKarung
          })
        });
      } catch (syncErr) {
        console.warn("Server-side standard update sync failed:", syncErr);
      }

      setEditingStandard(null);
      refreshData();
    } catch (err: any) {
      console.error(err);
      alert("Gagal memperbarui standard: " + err.message);
    }
  };

  const handleDeleteStandard = async (id: string) => {
    try {
      // Direct client-side delete from Firestore first
      await deleteDoc(doc(db, "standards", id));

      // Sync with local server database
      try {
        await fetch(`/api/master/standards/${id}`, {
          method: "DELETE"
        });
      } catch (syncErr) {
        console.warn("Server-side standard delete sync failed:", syncErr);
      }

      refreshData();
    } catch (err: any) {
      console.error(err);
      alert("Gagal menghapus standard: " + err.message);
    }
  };

  const handleEditSignatureClick = (sig: Signature) => {
    setEditingSignature(sig);
    setEditSigName(sig.name);
    setEditSigPosition(sig.position);
    setEditSigInitials(sig.initials);
    setEditSigType(sig.signatureType || "qrcode");
    setEditSigImage(sig.signatureImage || "");
  };

  const handleUpdateSignature = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingSignature) return;

    try {
      // Direct client-side write to Firestore first
      await setDoc(doc(db, "signatures", editingSignature.id), {
        ...editingSignature,
        name: editSigName,
        position: editSigPosition,
        initials: editSigInitials,
        signatureType: editSigType,
        signatureImage: editSigImage
      });

      // Sync with local server database
      try {
        await fetch(`/api/master/signatures/${editingSignature.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editSigName,
            position: editSigPosition,
            initials: editSigInitials,
            signatureType: editSigType,
            signatureImage: editSigImage
          })
        });
      } catch (syncErr) {
        console.warn("Server-side signature update sync failed:", syncErr);
      }

      setEditingSignature(null);
      refreshData();
    } catch (err: any) {
      console.error(err);
      alert("Gagal memperbarui tanda tangan: " + err.message);
    }
  };

  const handleDeleteSignature = async (id: string) => {
    try {
      // Direct client-side delete from Firestore first
      await deleteDoc(doc(db, "signatures", id));

      // Sync with local server database
      try {
        await fetch(`/api/master/signatures/${id}`, {
          method: "DELETE"
        });
      } catch (syncErr) {
        console.warn("Server-side signature delete sync failed:", syncErr);
      }

      refreshData();
    } catch (err: any) {
      console.error(err);
      alert("Gagal menghapus tanda tangan: " + err.message);
    }
  };

  const handleBulkImportStandards = async (importedList: any[]) => {
    if (!importedList || importedList.length === 0) return;
    try {
      const res = await fetch("/api/master/standards/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(importedList)
      });
      const data = await res.json();
      if (data.success) {
        // Fetch fully computed/merged standards array from backend
        try {
          const allRes = await fetch("/api/all-data");
          if (allRes.ok) {
            const allDataJson = await allRes.json();
            if (allDataJson.standards && allDataJson.standards.length > 0) {
              for (const std of allDataJson.standards) {
                await setDoc(doc(db, "standards", std.id), std);
              }
            }
          }
        } catch (syncErr) {
          console.warn("Client-side bulk standard sync to Firestore failed:", syncErr);
        }

        alert(`Berhasil mengimpor/memperbarui ${data.addedCount + data.updatedCount} standard mutu (Baru: ${data.addedCount}, Diperbarui: ${data.updatedCount}).`);
        refreshData();
      } else {
        alert("Gagal mengimpor standard: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Gagal mengimpor data standard mutu.");
    }
  };

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiScanning(true);
    setAiError("");

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Str = (reader.result as string).split(",")[1];
        setOcrBase64(base64Str);

        // Call proxy API
        const response = await fetch("/api/gemini/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Image: base64Str,
            mimeType: file.type
          })
        });

        const data = await response.json();
        if (data.success && data.parsed) {
          const existingVendorsList = Array.from(new Set(registrations.map(r => r.vendor))).filter(Boolean) as string[];
          const normalizedParsed = data.parsed.map((item: any) => ({
            ...item,
            vendor: findMatchingVendor(item.vendor || "VENDOR LOCAL", existingVendorsList)
          }));
          // Put parsed items in the preview buffer
          setBatchPreviewItems(normalizedParsed);
          alert(`Sukses! AI menemukan ${data.parsed.length} barang pada dokumen. Silakan periksa pratinjau daftar di bawah.`);
        } else {
          setAiError(data.message || "Gagal parsing.");
        }
        setAiScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setAiError(err.message || "Gagal membaca berkas.");
      setAiScanning(false);
    }
  };


  // Helper to parse a single CSV line with standard escaped double quotes
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  // Heuristics to detect the Category and Standard based on item names/specifications
  const detectCategoryAndStandard = (
    name: string,
    description: string,
    standardsList: any[]
  ) => {
    const combined = (name + " " + description).toLowerCase();

    let category: "karung" | "logam" | "filter cloth" | "kelistrikan" | "Valve" | "benang" | "rubber" = "logam";
    let standardName = "";
    let standardSource = "KSM INTERNAL";

    if (
      combined.includes("motor") ||
      combined.includes("gearcase") ||
      combined.includes("rpm") ||
      combined.includes("kw") ||
      combined.includes("volt") ||
      combined.includes("pole") ||
      combined.includes("phase")
    ) {
      category = "kelistrikan";
    } else if (
      combined.includes("valve") ||
      combined.includes("globe") ||
      combined.includes("gate") ||
      combined.includes("check")
    ) {
      category = "logam";
    } else if (
      combined.includes("seal") ||
      combined.includes("rubber") ||
      combined.includes("viton") ||
      combined.includes("o-ring")
    ) {
      category = "rubber";
    } else if (combined.includes("karung") || combined.includes("bag")) {
      category = "karung";
    } else if (combined.includes("filter") || combined.includes("cloth")) {
      category = "filter cloth";
    } else if (combined.includes("benang") || combined.includes("yarn")) {
      category = "benang";
    } else {
      category = "logam";
    }

    // Look for predefined standard names inside standardsList
    let matchedStd = standardsList.find((s) => {
      return (
        combined.includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().split(" ").some((part: string) => part.length > 5 && combined.includes(part))
      );
    });

    // Special exact brand name lookup for karung
    if (category === "karung") {
      const karungStds = standardsList.filter((s: any) => s.category === "karung");
      let specialMatch = null;
      if (combined.includes("phonska") || combined.includes("npk")) {
        specialMatch = karungStds.find((s: any) => s.name.toLowerCase().includes("phonska"));
      } else if (combined.includes("urea")) {
        specialMatch = karungStds.find((s: any) => s.name.toLowerCase().includes("urea"));
      } else if (combined.includes("nitrea")) {
        specialMatch = karungStds.find((s: any) => s.name.toLowerCase().includes("nitrea"));
      } else if (combined.includes("za")) {
        specialMatch = karungStds.find((s: any) => s.name.toLowerCase().includes("za"));
      }
      if (specialMatch) {
        matchedStd = specialMatch;
      } else {
        // Find best match in karungStds
        let maxScore = 0;
        for (const std of karungStds) {
          const stdName = std.name.toLowerCase();
          const defaultName = (std.defaultNamaKarung || "").toLowerCase();
          let score = 0;
          if (combined.includes(stdName) || stdName.includes(combined)) score += 5;
          if (defaultName && (combined.includes(defaultName) || defaultName.includes(combined))) score += 5;
          if (score > maxScore) {
            maxScore = score;
            matchedStd = std;
          }
        }
      }
      
      if (!matchedStd && karungStds.length > 0) {
        matchedStd = karungStds[0];
      }
    }

    let itemNameOverride = "";

    if (matchedStd) {
      standardName = matchedStd.name;
      standardSource = matchedStd.source || "KSM INTERNAL";
      if (category === "karung") {
        itemNameOverride = matchedStd.defaultNamaKarung || matchedStd.name;
      }
    } else {
      // Attempt standard heuristic parsing from spec lines e.g. "MATERIAL STANDARD : ASTM A403 GRADE WP304L"
      const standardRegexPattern = /material\s+standard\s*:\s*([^,\n\r]+)/i;
      const stdMatch = combined.match(standardRegexPattern);
      if (stdMatch && stdMatch[1]) {
        standardName = stdMatch[1].trim().toUpperCase();
      } else {
        // Fallback
        if (category === "logam") {
          standardName = combined.includes("316") ? "ASTM A403 WP316L" : "ASTM A403 WP304L";
        } else if ((category as string) === "Valve") {
          standardName = "API 598";
        } else if (category === "kelistrikan") {
          standardName = "IEC 60034-1";
        } else if (category === "rubber") {
          standardName = "ASTM D2240 Shore A";
        } else {
          standardName = "STANDAR INTERNAL";
        }
      }
    }

    return { category, standardName, standardSource, itemNameOverride };
  };

  // Import batch data paste from excel TSV or official Petrokimia PPJ CSV layout
  const handleBatchExcelPaste = () => {
    if (!importText.trim()) return;

    setAiScanning(true);
    const text = importText.trim();
    let parsedItems: any[] = [];

    // Check if this looks like the corporate Petrokimia CSV format
    const isPetrokimiaFormat = 
      text.includes("PERMINTAAN UJI / ANALISA") || 
      text.includes("PENERIMAAN SUKU CADANG") || 
      text.includes("Nomor PPJ") || 
      text.includes("NAMA BARANG / MATERIAL");

    if (isPetrokimiaFormat) {
      // Robust Petrokimia CSV Parsing
      const lines = text.split(/\r?\n/);
      let currentPpjShort = "";
      let currentPpjFull = "";
      let currentTanggalPPJ = new Date().toISOString().split("T")[0]; // default to today
      
      let activeItem: any = null;
      let activeSubLines: string[][] = [];

      const flushActiveItem = () => {
        if (activeItem && activeSubLines.length > 0) {
          let poCode = "";
          let prCode = "";
          let vendor = "";
          let specifications: string[] = [];

          activeSubLines.forEach((cells, subIdx) => {
            // Heuristics for PO
            cells.forEach(cell => {
              const cleaned = cell.trim();
              const poMatch = cleaned.match(/51\d{8}/);
              if (poMatch) poCode = poMatch[0];
            });

            // Heuristics for PR
            cells.forEach(cell => {
              const cleaned = cell.trim();
              const prMatch = cleaned.match(/22\d{8}/);
              if (prMatch) prCode = prMatch[0];
            });

            // Heuristics for Vendor
            const potentialVendor = cells[6]?.trim();
            if (potentialVendor && 
                potentialVendor.toUpperCase() !== "SI" && 
                potentialVendor.toUpperCase() !== "NSI" && 
                !potentialVendor.includes("PO :") && 
                !potentialVendor.includes("PR :") && 
                potentialVendor.length > 3) {
              vendor = potentialVendor;
            }

            // Gather complete specifications/descriptions (including lines starting with or containing '===')
            if (subIdx > 0) {
              const cleanRowContent = cells
                .map(c => c.trim())
                .filter(c => {
                  if (!c) return false;
                  // Skip PR/PO matches and general labels in description
                  if (c.match(/51\d{8}/) || c.match(/22\d{8}/)) return false;
                  if (c === "PO :" || c === "PR :") return false;
                  if (c.toUpperCase() === "KODE MATERIAL") return false;
                  return true;
                });
              
              if (cleanRowContent.length > 0) {
                specifications.push(cleanRowContent.join(" "));
              }
            }
          });

          // Join specifications as description
          const descriptionJoined = specifications.join("\n");
          
          // Classify category and standardName automatically
          const analysis = detectCategoryAndStandard(activeItem.itemName, descriptionJoined, standards);

          parsedItems.push({
            ppjCode: currentPpjShort || "1000",
            ppjFull: currentPpjFull || `${currentPpjShort}/LG.01.01/101/MI/2026`,
            prCode: prCode || "UNASSIGNED",
            poCode: poCode || "UNASSIGNED",
            vendor: vendor ? vendor.toUpperCase() : "VENDOR LOCAL",
            itemName: analysis.itemNameOverride ? analysis.itemNameOverride.toUpperCase() : activeItem.itemName.toUpperCase(),
            category: analysis.category,
            standardName: analysis.standardName,
            standardSource: analysis.standardSource,
            quantity: activeItem.quantity || "1 EA",
            points: 1, // Defaulting to exactly 1 point as requested!
            description: descriptionJoined,
            tanggalPPJ: currentTanggalPPJ
          });

          activeItem = null;
          activeSubLines = [];
        }
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const cells = parseCSVLine(line);
        if (cells.length === 0) continue;

        const firstCell = cells[0].trim();

        // 1. Check if PPJ No line
        if (line.includes("Nomor PPJ") || firstCell.toLowerCase().includes("nomor ppj")) {
          flushActiveItem();

          let foundPpj = "";
          cells.forEach(c => {
            const cleaned = c.trim();
            if (cleaned.includes("/") && cleaned.length > 8) {
              foundPpj = cleaned;
            }
          });
          if (foundPpj) {
            currentPpjFull = foundPpj;
            currentPpjShort = foundPpj.split("/")[0] || "";
          }
        }

        // 2. Check if Tanggal line
        if (line.includes("Tanggal") || firstCell.toLowerCase().includes("tanggal")) {
          let foundDate = "";
          cells.forEach(c => {
            const cleaned = c.trim();
            if (cleaned.length > 5 && !cleaned.includes(":") && !cleaned.toLowerCase().includes("tanggal")) {
              foundDate = cleaned;
            }
          });
          if (foundDate) {
            currentTanggalPPJ = foundDate;
          }
        }

        // 3. Check if line starts an item
        const isNewItemRow = /^\d+$/.test(firstCell);
        if (isNewItemRow) {
          flushActiveItem();

          const itemName = cells[1]?.trim() || "UNNAMED ITEM";
          const qtyVal = cells[4]?.trim() || "1";
          const unitVal = cells[5]?.trim() || "EA";
          
          activeItem = {
            itemNo: parseInt(firstCell, 10),
            itemName: itemName,
            quantity: `${qtyVal} ${unitVal}`.trim()
          };
          activeSubLines = [cells]; // seed first line
        } else {
          if (activeItem) {
            if (line.includes("PENERIMAAN SUKU CADANG") || line.includes("PT PETROKIMIA") || line.includes("PERMINTAAN UJI")) {
              flushActiveItem();
            } else {
              activeSubLines.push(cells);
            }
          }
        }
      }

      flushActiveItem();

    } else {
      // Fallback: Standard Tab tabular format, supporting comma and semicolon separators
      const lines = text.split("\n");
      lines.forEach((line) => {
        if (!line.trim()) return;
        // Check separator: tab, semicolon, or comma
        let cols = line.split("\t");
        if (cols.length < 3) {
          cols = line.split(";");
        }
        if (cols.length < 3) {
          cols = line.split(",");
        }
        
        // Clean each column
        const cleanedCols = cols.map(c => c?.trim() || "");
        
        // Ensure we have at least one column with content
        if (cleanedCols.some(c => c.length > 0)) {
          const ppjVal = cleanedCols[0] || "1000";
          const prVal = cleanedCols[1] || "UNASSIGNED";
          const poVal = cleanedCols[2] || "UNASSIGNED";
          const vendorVal = (cleanedCols[3] || "VENDOR LOCAL").toUpperCase();
          const itemNameVal = (cleanedCols[4] || cleanedCols[0] || "SAMPEL TERIMPOR").toUpperCase();
          const catVal = cleanedCols[5] || "logam";
          const stdVal = cleanedCols[6] || "STANDAR INTERNAL";
          const qtyVal = cleanedCols[7] || "1 EA";
          
          // Detect category and standard
          const analysis = detectCategoryAndStandard(itemNameVal, stdVal, standards);
          
          parsedItems.push({
            ppjCode: ppjVal,
            prCode: prVal,
            poCode: poVal,
            vendor: vendorVal,
            itemName: analysis.itemNameOverride ? analysis.itemNameOverride.toUpperCase() : itemNameVal,
            category: analysis.category || catVal,
            standardName: analysis.itemNameOverride ? analysis.standardName : (stdVal || analysis.standardName),
            standardSource: analysis.standardSource || "KSM INTERNAL",
            quantity: qtyVal,
            points: 1,
            description: "Daftar batch input ter-ekstrak"
          });
        }
      });
    }

    // Post-Process Grouping & Chronological Forward-Fill (PPJ, PR, PO, Vendor)
    if (parsedItems.length > 0) {
      let lastValidPr = "UNASSIGNED";
      let lastValidPo = "UNASSIGNED";
      let lastValidVendor = "VENDOR LOCAL";
      let lastValidPpj = "1000";
      let lastValidPpjFull = "1000/LG.01.01/101/MI/2026";

      parsedItems = parsedItems.map((item) => {
        // Resolve PR
        let pr = item.prCode || "UNASSIGNED";
        if (pr === "UNASSIGNED") {
          pr = lastValidPr;
        } else {
          lastValidPr = pr;
        }

        // Resolve PO
        let po = item.poCode || "UNASSIGNED";
        if (po === "UNASSIGNED") {
          po = lastValidPo;
        } else {
          lastValidPo = po;
        }

        // Resolve Vendor
        let vendor = item.vendor || "VENDOR LOCAL";
        if (vendor === "VENDOR LOCAL") {
          vendor = lastValidVendor;
        } else {
          lastValidVendor = vendor.toUpperCase();
        }

        // Resolve PPJ Codes
        let ppj = item.ppjCode || "1000";
        if (ppj === "1000") {
          ppj = lastValidPpj;
        } else {
          lastValidPpj = ppj;
        }

        let ppjFull = item.ppjFull || "";
        if (!ppjFull || ppjFull.startsWith("1000/")) {
          ppjFull = lastValidPpjFull;
        } else {
          lastValidPpjFull = ppjFull;
        }

        const existingVendorsList = Array.from(new Set(registrations.map(r => r.vendor))).filter(Boolean) as string[];
        const matchedVendor = findMatchingVendor(vendor, existingVendorsList);

        return {
          ...item,
          ppjCode: ppj,
          ppjFull: ppjFull,
          prCode: pr,
          poCode: po,
          vendor: matchedVendor
        };
      });

      setBatchPreviewItems(parsedItems);
      setImportText("");
      setPastingMode(false);
      alert(`Berhasil mengurai dan memuat ${parsedItems.length} sampel baru ke daftar pratinjau batch PPJ! Silakan periksa detailnya di bawah.`);
    } else {
      alert("Error: Gagal mengurai baris text. Pastikan format paste sesuai berupa Tabular Excel atau CSV resmi PPJ Petrokimia Gresik.");
    }
    setAiScanning(false);
  };


  const handleConfirmBatchRegister = async () => {
    if (batchPreviewItems.length === 0) return;
    setAiScanning(true);
    try {
      const finalItems: any[] = [];
      let currentRegsList = [...registrations];

      for (const reg of batchPreviewItems) {
        const targetYearStr = (reg.tanggalPPJ || new Date().toISOString().split("T")[0]).split("-")[0];
        const ppjFour = String(reg.ppjCode || "0000").padStart(4, "0");
        const ppjFull = `${ppjFour}/LG.01.01/101/MI/${targetYearStr}`;
        
        // Client-side sequence generation
        const yearRegs = currentRegsList.filter((r: any) => {
          let rYear = "";
          if (r.tanggalPPJ) {
            rYear = r.tanggalPPJ.split("-")[0];
          } else {
            rYear = new Date().getFullYear().toString();
          }
          return rYear === targetYearStr;
        });

        let maxSeq = 0;
        for (const r of yearRegs) {
          if (r.noReg) {
            const parsed = parseInt(r.noReg, 10);
            if (!isNaN(parsed) && parsed > maxSeq) {
              maxSeq = parsed;
            }
          }
        }

        const nextSeq = maxSeq + 1;
        const noRegSeq = String(nextSeq).padStart(4, "0");
        const generatedId = `reg-${noRegSeq}`;

        const finalReg = {
          id: reg.id || generatedId,
          noReg: reg.noReg || noRegSeq,
          ppjCode: ppjFour,
          ppjFull: ppjFull,
          prCode: reg.prCode || "UNASSIGNED",
          poCode: reg.poCode || "UNASSIGNED",
          vendor: String(reg.vendor || "VENDOR LOCAL").toUpperCase(),
          category: reg.category || "logam",
          standardName: reg.standardName || "AISI 304",
          standardSource: reg.standardSource || "ASTM A240",
          itemName: String(reg.itemName || "UNNAMED ITEM").toUpperCase(),
          description: reg.description || "",
          quantity: reg.quantity || "1 Lot",
          points: parseInt(reg.points || "1", 10),
          status: "Draft",
          tanggalPPJ: reg.tanggalPPJ || new Date().toISOString().split("T")[0],
          tanggalDiterima: reg.tanggalDiterima || new Date().toISOString().split("T")[0],
          results: [],
          platNomor: reg.platNomor || "",
          isNewVendorFlag: reg.isNewVendorFlag || false,
          ballCount: reg.ballCount || "",
          sheetCount: reg.sheetCount || ""
        };

        finalItems.push(finalReg);
        currentRegsList.push(finalReg); // Add to local array so subsequent items in bulk get incremented sequences!
      }

      // 1. Direct client-side write to Firestore first (for each item)
      for (const item of finalItems) {
        await setDoc(doc(db, "registrations", item.id), item);
      }

      // 2. Sync with local server database
      try {
        await fetch("/api/registrations/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: finalItems })
        });
      } catch (syncErr) {
        console.warn("Server-side batch sync failed, but saved to Firestore:", syncErr);
      }

      setBatchPreviewItems([]);
      alert(`Sukses mendaftarkan ${finalItems.length} sampel baru secara batch ke antrean draf!`);
      refreshData();
    } catch (err: any) {
      console.error(err);
      alert("Gagal menyimpan batch ke Firestore: " + err.message);
    } finally {
      setAiScanning(false);
    }
  };

  const handleBulkDeleteDrafts = async () => {
    if (selectedDraftRegs.length === 0) return;
    
    setAiScanning(true);
    try {
      // 1. Direct client-side delete from Firestore first
      for (const id of selectedDraftRegs) {
        await deleteDoc(doc(db, "registrations", id));
      }

      // 2. Sync with local server database
      for (const id of selectedDraftRegs) {
        try {
          await fetch("/api/registrations/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id })
          });
        } catch (syncErr) {
          console.warn("Server-side delete sync failed:", syncErr);
        }
      }

      setRegistrations(prev => prev.filter(r => !selectedDraftRegs.includes(r.id)));
      setSelectedDraftRegs([]);
      alert("Draft terpilih berhasil dihapus!");
      refreshData();
    } catch (err: any) {
      console.error(err);
      alert("Gagal menghapus beberapa draft dari Firestore: " + err.message);
    } finally {
      setAiScanning(false);
    }
  };

  const handleBulkSubmitDraftsToUji = async () => {
    if (selectedDraftRegs.length === 0) return;

    setAiScanning(true);
    try {
      for (const id of selectedDraftRegs) {
        const reg = registrations.find(r => r.id === id);
        if (!reg) continue;
        
        // Find standard for this item and generate default parameters results
        const std = standards.find(s => s.name === reg.standardName);
        const params = std ? std.parameters : [];
        const dummyResults = Array.from({ length: reg.points || 1 }, (_, ptIdx) => {
          const vals: Record<string, string> = {};
          params.forEach(p => {
            let val = "";
            if (p.spec.toLowerCase().includes("max")) {
              val = "0.01";
            } else if (p.spec.toLowerCase().includes("min")) {
              val = "100";
            } else if (p.spec.includes("-")) {
              const parts = p.spec.split("-");
              val = parts[0].trim();
            } else {
              val = "Match";
            }
            vals[p.name] = val;
          });
          return {
            pointId: `P${ptIdx + 1}`,
            pointName: `Titik Uji #${ptIdx + 1}`,
            values: vals
          };
        });

        const updatedReg = {
          ...reg,
          status: "Diuji",
          pengujiInitials: currentUser.initials,
          tanggalDiuji: new Date().toISOString().split("T")[0],
          results: dummyResults
        };

        // 1. Direct client-side write to Firestore first
        await setDoc(doc(db, "registrations", id), updatedReg);

        // 2. Sync with local server database
        try {
          await fetch("/api/registrations/update-results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              results: dummyResults,
              pengujiInitials: currentUser.initials,
              tanggalDiuji: new Date().toISOString().split("T")[0]
            })
          });
        } catch (syncErr) {
          console.warn("Server-side bulk submit sync failed:", syncErr);
        }
      }
      setSelectedDraftRegs([]);
      alert("Draft terpilih berhasil diajukan ke pengujian!");
      refreshData();
    } catch (err: any) {
      console.error(err);
      alert("Gagal memproses bulk submit ke Firestore: " + err.message);
    } finally {
      setAiScanning(false);
    }
  };

  const handleBulkReviewApprove = async (approve: boolean) => {
    if (selectedReviewRegs.length === 0) return;
    let comment = reviewComments.trim();
    if (!approve && !comment) {
      alert("Wajib mengetikkan Keterangan / Alasan Bulk terlebih dahulu di kolom input sebelum menolak antrean terpilih!");
      return;
    }

    setAiScanning(true);
    try {
      const localGetNextNoSurat = (currentRegs: any[], targetYear: string): string => {
        const yearRegs = currentRegs.filter((r: any) => {
          let sYear = "";
          if (r.tanggalTerbit) {
            sYear = r.tanggalTerbit.split("-")[0];
          } else if (r.tanggalPPJ) {
            sYear = r.tanggalPPJ.split("-")[0];
          } else {
            sYear = new Date().getFullYear().toString();
          }
          return r.status === "Terbit" && r.noSurat && sYear === targetYear;
        });

        if (yearRegs.length === 0) {
          return "0001";
        }

        let maxSeq = 0;
        for (const r of yearRegs) {
          if (r.noSurat) {
            const parts = r.noSurat.split("/");
            const firstPart = parts[0];
            const parsed = parseInt(firstPart, 10);
            if (!isNaN(parsed) && parsed > maxSeq) {
              maxSeq = parsed;
            }
          }
        }

        const nextSeq = maxSeq + 1;
        return String(nextSeq).padStart(4, "0");
      };

      let currentRegsList = [...registrations];

      for (const id of selectedReviewRegs) {
        const reg = currentRegsList.find(r => r.id === id);
        if (!reg) continue;

        let updatedReg = { ...reg };

        if (approve) {
          const targetYearStr = new Date().toISOString().split("T")[0].split("-")[0];
          const nextSuratSeq = localGetNextNoSurat(currentRegsList, targetYearStr);
          
          updatedReg.status = "Terbit";
          updatedReg.reviewerInitials = currentUser.initials;
          updatedReg.reviewerComments = comment || "Disetujui hasil uji sesuai standard (Batch).";
          updatedReg.tanggalTerbit = new Date().toISOString().split("T")[0];
          updatedReg.noSurat = `${nextSuratSeq}/PR.00.02/90/MI/${targetYearStr}`;
          updatedReg.trustCardId = `TC-${reg.noReg}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
          updatedReg.useQrSignature = true;
        } else {
          updatedReg.status = "Draft"; // Reject back to edits
          updatedReg.reviewerComments = comment || "Ditolak - Perlu pengujian/parameter ulang.";
        }

        // 1. Direct client-side write to Firestore first
        await setDoc(doc(db, "registrations", id), updatedReg);

        // Update local list so subsequent iterations get updated No Surat values!
        const index = currentRegsList.findIndex(r => r.id === id);
        if (index !== -1) {
          currentRegsList[index] = updatedReg;
        }

        // 2. Sync with local server database
        try {
          await fetch("/api/registrations/review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              approved: approve,
              reviewerInitials: currentUser.initials,
              comments: approve ? (comment || "Disetujui hasil uji sesuai standard (Batch).") : comment,
              useQrSignature: true
            })
          });
        } catch (syncErr) {
          console.warn("Server-side bulk review sync failed:", syncErr);
        }
      }

      setSelectedReviewRegs([]);
      setReviewComments("");
      alert(`Berhasil menyelesaikan review batch untuk ${selectedReviewRegs.length} entri!`);
      refreshData();
    } catch (err: any) {
      console.error(err);
      alert("Gagal memproses bulk review di Firestore: " + err.message);
    } finally {
      setAiScanning(false);
    }
  };

  const handleManualRegisterSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manPPJCode || !manVendor || !manItemName || !manStandardName) {
      alert("Lengkapi nomor PPJ, Vendor, Nama Barang, dan Acuan Standard.");
      return;
    }
    try {
      // Client-side sequential No Reg and ID generation matching getNextNoReg on server
      const targetYearStr = (manTanggalPPJ || new Date().toISOString().split("T")[0]).split("-")[0];
      const ppjFour = manPPJCode.padStart(4, "0");
      const ppjFull = `${ppjFour}/LG.01.01/101/MI/${targetYearStr}`;
      
      const yearRegs = registrations.filter((r: any) => {
        let rYear = "";
        if (r.tanggalPPJ) {
          rYear = r.tanggalPPJ.split("-")[0];
        } else {
          rYear = new Date().getFullYear().toString();
        }
        return rYear === targetYearStr;
      });

      let maxSeq = 0;
      for (const r of yearRegs) {
        if (r.noReg) {
          const parsed = parseInt(r.noReg, 10);
          if (!isNaN(parsed) && parsed > maxSeq) {
            maxSeq = parsed;
          }
        }
      }

      const nextSeq = maxSeq + 1;
      const noRegSeq = String(nextSeq).padStart(4, "0");
      const generatedId = `reg-${noRegSeq}`;

      const finalReg = {
        id: generatedId,
        noReg: noRegSeq,
        ppjCode: ppjFour,
        ppjFull: ppjFull,
        prCode: manPRCode || "UNASSIGNED",
        poCode: manPOCode || "UNASSIGNED",
        vendor: manVendor.toUpperCase(),
        category: manCategory,
        standardName: manStandardName,
        standardSource: manStandardSource || "PO Spec Check",
        itemName: manItemName.toUpperCase(),
        description: manDescription,
        quantity: manQuantity,
        points: parseInt(manPoints as any || "1", 10),
        status: "Draft",
        tanggalPPJ: manTanggalPPJ,
        tanggalDiterima: manTanggalDiterima,
        platNomor: (manCategory === "karung" || manCategory === "benang") ? manPlatNomor : "",
        results: [],
        categoryOptions: manCategory === "kelistrikan" ? {
          electricalType: manStandardName === "Gearcase Motor" ? "gearcase_motor" : manStandardName === "Vibrator" ? "vibrator" : "motor_listrik"
        } : undefined
      };

      // Direct client-side write to Firestore first
      await setDoc(doc(db, "registrations", generatedId), finalReg);

      // Sync with local server database
      try {
        await fetch("/api/registrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(finalReg)
        });
      } catch (syncErr) {
        console.warn("Server-side registration sync failed:", syncErr);
      }

      setManPPJCode("");
      setManPRCode("");
      setManPOCode("");
      setManVendor("");
      setManItemName("");
      setManDescription("");
      setManQuantity("1 Pcs");
      setManPoints(1);
      setManStandardName("");
      setManStandardSource("");
      setManMetalAcuan("");
      setManPlatNomor("");
      setManualRegMode(false);
      refreshData();
      alert("Sampel tunggal berhasil disimpan ke antrean draf!");
    } catch (err: any) {
      console.error(err);
      alert("Gagal menyimpan ke Firestore: " + err.message);
    }
  };

  const openEditRegistrationModal = (reg: Registration) => {
    setEditingReg(reg);
    setEditPPJCode(reg.ppjCode);
    setEditPRCode(reg.prCode || "");
    setEditPOCode(reg.poCode || "");
    setEditVendor(reg.vendor);
    setEditCategory(reg.category);
    setEditItemName(reg.itemName);
    setEditDescription(reg.description || "");
    setEditQuantity(reg.quantity || "1 Pcs");
    setEditPoints(reg.points || 1);
    setEditStandardName(reg.standardName);
    setEditStandardSource(reg.standardSource || "");
    setEditTanggalPPJ(reg.tanggalPPJ || "");
    setEditTanggalDiterima(reg.tanggalDiterima || "");
    setEditPlatNomor(reg.platNomor || "");
    
    if (reg.category === "logam") {
      const std = standards.find(s => s.name === reg.standardName);
      if (std) {
        setEditMetalAcuan(std.source);
      } else {
        setEditMetalAcuan("");
      }
    } else {
      setEditMetalAcuan("");
    }
  };

  const handleUpdateRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReg) return;

    if (editCategory === "logam" && (!editMetalAcuan || !editStandardName)) {
      alert("Untuk kategori Logam, harap pilih Acuan Standard dan Standard Grade Logam.");
      return;
    }
    if (editCategory !== "logam" && !editStandardName) {
      alert("Harap pilih Katalog Standard Mutu.");
      return;
    }

    const fallbackSource = editStandardSource || (editStandardName ? "KSM INTERNAL" : "PO Spec Check");

    try {
      const updatedReg = {
        ...editingReg,
        ppjCode: editPPJCode,
        prCode: editPRCode,
        poCode: editPOCode,
        vendor: editVendor.toUpperCase(),
        category: editCategory,
        itemName: editItemName.toUpperCase(),
        description: editDescription,
        quantity: editQuantity,
        points: editPoints,
        standardName: editStandardName,
        standardSource: fallbackSource,
        tanggalPPJ: editTanggalPPJ,
        tanggalDiterima: editTanggalDiterima,
        platNomor: (editCategory === "karung" || editCategory === "benang") ? editPlatNomor : ""
      };

      // Direct client-side write to Firestore first
      await setDoc(doc(db, "registrations", editingReg.id), updatedReg);

      // Sync with local server database
      try {
        await fetch("/api/registrations/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingReg.id,
            ppjCode: editPPJCode,
            prCode: editPRCode,
            poCode: editPOCode,
            vendor: editVendor,
            category: editCategory,
            itemName: editItemName,
            description: editDescription,
            quantity: editQuantity,
            points: editPoints,
            standardName: editStandardName,
            standardSource: fallbackSource,
            tanggalPPJ: editTanggalPPJ,
            tanggalDiterima: editTanggalDiterima,
            platNomor: (editCategory === "karung" || editCategory === "benang") ? editPlatNomor : ""
          })
        });
      } catch (syncErr) {
        console.warn("Server-side edit sync failed:", syncErr);
      }

      setEditingReg(null);
      refreshData();
      alert("Draft registrasi berhasil diperbarui!");
    } catch (err: any) {
      console.error(err);
      alert("Gagal menyimpan ke Firestore: " + err.message);
    }
  };

  const handleDeleteRegistration = async (id: string) => {
    try {
      // Direct client-side delete from Firestore first
      await deleteDoc(doc(db, "registrations", id));

      // Sync with local server database
      try {
        await fetch("/api/registrations/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id })
        });
      } catch (syncErr) {
        console.warn("Server-side delete sync failed:", syncErr);
      }

      setRegistrations(prev => prev.filter(r => r.id !== id));
      refreshData();
      alert("Draft registrasi berhasil dihapus.");
    } catch (err: any) {
      console.error(err);
      alert("Gagal menghapus dari Firestore: " + err.message);
    }
  };

  // Launch tests
  const startEnteringTesting = (reg: Registration) => {
    setActiveTesting(reg);
    setTestingPointIndex(1);
    
    // 1. Reset dynamic testing count (default 5 for karung/filter cloth or fallback to registered points count)
    const count = (reg.category?.toLowerCase() === "karung" || reg.category?.toLowerCase() === "filter cloth") ? Math.max(5, reg.points || 1) : (reg.points || 1);
    setTestingPointsCount(count);
    
    // 2. Reset list of tools and custom parameters
    setTestingSelectedTools(reg.selectedTools || []);
    
    // Load custom params if already registered
    if (reg.customParams && reg.customParams.length > 0) {
      setCustomtestingParams(reg.customParams);
    } else {
      setCustomtestingParams([]);
    }
    
    setNewCustomParamName("");
    setNewCustomParamSpec("");
    setNewCustomParamUnit("");
    
    // Reset point-specific states for new test run - Finding 2 & 3
    setPointKeterangan("");
    setPointOverrideStandardId("");

    // Load custom notes and sub-category options
    setTesterNotes(reg.notes || "");
    setElectricalType(reg.categoryOptions?.electricalType || "motor_listrik");
    setNameplatePhoto(reg.categoryOptions?.nameplatePhoto || "");
    
    // Reset or populate Valve photo values and numeric counts
    if (reg.category === "Valve" && reg.results && reg.results[0]?.values) {
      const vVals = reg.results[0].values;
      setValveManometerPhoto(vVals["manometer_photo"] || "");
      setValveAllValvesPhoto(vVals["all_valves_photo"] || "");
      setValveActiveTestPhoto(vVals["active_test_photo"] || "");
      setValveTotal(vVals["v_total"] || "");
      setValveLulus(vVals["v_lulus"] || "");
      setValveGagal(vVals["v_gagal"] || "");
    } else {
      setValveManometerPhoto("");
      setValveAllValvesPhoto("");
      setValveActiveTestPhoto("");
      setValveTotal("");
      setValveLulus("");
      setValveGagal("");
    }
    
    // Case-insensitive and robust standard search
    const rStdName = (reg.standardName || "").toLowerCase();
    const std = rStdName 
      ? (standards.find(s => 
          s.category === reg.category && 
          s.name.toLowerCase() === rStdName && 
          (s.source.toLowerCase() === (reg.standardSource || "").toLowerCase() || !reg.standardSource)
        ) || standards.find(s => 
          s.category === reg.category && 
          s.name.toLowerCase() === rStdName
        ))
      : undefined;
    
    setActiveTestingStandard(std || null);
    
    const isElect = reg.category?.toLowerCase() === "kelistrikan" || reg.category?.toLowerCase() === "motor listrik";
    const initialVals: any = {};
    if (isElect) {
      const elecType = reg.categoryOptions?.electricalType || "motor_listrik";
      const paramsList = ELECTRICAL_PARAMS[elecType] || ELECTRICAL_PARAMS.motor_listrik;
      paramsList.forEach(p => {
        initialVals[`${p} (Sesuai PO)`] = "";
        initialVals[`${p} (Sesuai Nameplate)`] = "";
      });
    } else if (std) {
      std.parameters.forEach(p => {
        initialVals[p.name] = "";
      });
    } else {
      initialVals["Komposisi Utama"] = "";
    }
    
    // Add custom params values
    if (reg.customParams) {
      reg.customParams.forEach(cp => {
        initialVals[cp.name] = "";
      });
    }
    
    setTestingValues(initialVals);
    setTestingPointsList(reg.results || []);
    setPreSpectrometerValues(null);
    setPreSpectrometerCustomParams(null);

    // Tabular grid initialization for karung and filter cloth
    if (reg.category?.toLowerCase() === "karung" || reg.category?.toLowerCase() === "filter cloth") {
      const initialGrid: any = {};
      const allParams = std ? [...std.parameters] : [];
      if (reg.customParams) {
        reg.customParams.forEach(cp => {
          allParams.push(cp);
        });
      }
      
      for (let t = 1; t <= count; t++) {
        initialGrid[t] = {};
        allParams.forEach(p => {
          initialGrid[t][p.name] = "";
        });
      }
      
      // Override with existing points if they exist in the registration
      if (reg.results && reg.results.length > 0) {
        reg.results.forEach(pt => {
          const idx = pt.pointIndex;
          if (!initialGrid[idx]) initialGrid[idx] = {};
          Object.entries(pt.values || {}).forEach(([k, v]) => {
            initialGrid[idx][k] = v;
          });
        });
      }
      setKarungGrid(initialGrid);
    }
  };

  const generateOnSpecValue = (spec: string): string => {
    if (!spec || spec.trim() === "" || spec === "-") {
      return (Math.floor(Math.random() * 20) + 10).toString();
    }
    
    const s = spec.toLowerCase().trim();
    
    // 1. Matches tolerance formats e.g. "94 +2/-0" or "112 +2/-0"
    const tolRegex = /^(\d+(?:\.\d+)?)\s*\+(\d+(?:\.\d+)?)\s*\/\s*-\s*(\d+(?:\.\d+)?)$/;
    const matchTol = s.match(tolRegex);
    if (matchTol) {
      const base = parseFloat(matchTol[1]);
      const plus = parseFloat(matchTol[2]);
      const minus = parseFloat(matchTol[3]);
      const val = base + Math.random() * plus - Math.random() * minus;
      return val.toFixed(1);
    }

    // 2. Contains "min" e.g. "110 min", "95 min"
    if (s.includes("min")) {
      const num = parseFloat(s.replace(/[^\d.]/g, ""));
      if (!isNaN(num)) {
        // Return 1% to 10% above minimum (e.g. 10% jika standardnya hanya ada minimal)
        const addon = num * (0.01 + Math.random() * 0.05); // 1% to 6% above minimum, looks highly realistic
        const val = num + addon;
        return Number.isInteger(num) ? Math.ceil(val).toString() : val.toFixed(1);
      }
    }

    // 3. Contains "max" e.g. "150 max"
    if (s.includes("max")) {
      const num = parseFloat(s.replace(/[^\d.]/g, ""));
      if (!isNaN(num)) {
        const val = num * (0.8 + Math.random() * 0.15);
        return Number.isInteger(num) ? Math.floor(val).toString() : val.toFixed(2);
      }
    }

    // 4. Numeric range e.g. "38 - 52"
    if (s.includes("-") || s.includes(" s/d ")) {
      const parts = s.replace(" s/d ", "-").split("-").map(p => parseFloat(p.trim().replace(/[^\d.]/g, "")));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const minVal = parts[0];
        const maxVal = parts[1];
        const val = minVal + Math.random() * (maxVal - minVal);
        return Number.isInteger(minVal) && Number.isInteger(maxVal)
          ? Math.round(val).toString()
          : val.toFixed(1);
      }
    }

    // 5. Raw number
    const rawNum = parseFloat(s.replace(/[^\d.]/g, ""));
    if (!isNaN(rawNum)) {
      return rawNum.toString();
    }

    if (s.includes("match")) return "SESUAI";
    if (s.includes("ok")) return "OK";
    return "PAS";
  };

  const handleAutoGenerateKarungGrid = () => {
    if (!activeTesting) return;
    const std = standards.find(s => 
      s.category === activeTesting.category && 
      s.name.toLowerCase() === activeTesting.standardName.toLowerCase() && 
      (s.source.toLowerCase() === (activeTesting.standardSource || "").toLowerCase() || !activeTesting.standardSource)
    ) || standards.find(s => 
      s.category === activeTesting.category && 
      s.name.toLowerCase() === activeTesting.standardName.toLowerCase()
    );

    const allParams = std ? [...std.parameters] : [];
    customtestingParams.forEach(cp => allParams.push(cp));

    const nextGrid = { ...karungGrid };
    for (let t = 1; t <= testingPointsCount; t++) {
      if (!nextGrid[t]) nextGrid[t] = {};
      allParams.forEach(p => {
        nextGrid[t][p.name] = generateOnSpecValue(p.spec);
      });
    }

    setKarungGrid(nextGrid);
    alert("Berhasil melakukan simulasi otomatis seluruh nilai titik uji karung! Seluruh data disesuaikan dalam rentang spesifikasi standar (ON-SPEC) secara natural.");
  };

  const handleSelectCsvRowForTesting = (row: ImportedCsvRow) => {
    if (!activeTesting) return;
    const reg = activeTesting;
    
    // Support point-specific overriding standard
    const activeStdId = pointOverrideStandardId;
    const std = activeStdId 
      ? standards.find(s => s.id === activeStdId)
      : (standards.find(s => 
          s.category === reg.category && 
          s.name.toLowerCase() === reg.standardName.toLowerCase() && 
          (s.source.toLowerCase() === (reg.standardSource || "").toLowerCase() || !reg.standardSource)
        ) || standards.find(s => 
          s.category === reg.category && 
          s.name.toLowerCase() === reg.standardName.toLowerCase()
        ));
    
    // Save previous manually entered values before mapping spectrometer row
    setPreSpectrometerValues({ ...testingValues });
    setPreSpectrometerCustomParams([...customtestingParams]);
    
    const stdParamsList = std ? std.parameters : [];
    const stdParamsNames = stdParamsList.map(p => p.name);
    
    const newVals = { ...testingValues };
    const addedCustoms = [...customtestingParams];
    
    Object.entries(row.values).forEach(([key, val]) => {
      if (!val || val.trim() === "") return;
      const formatted = formatToMaxTwoDecimals(val);
      
      // Look for case-insensitive match among the standard parameters
      const stdMatch = stdParamsNames.find(pName => pName.toLowerCase() === key.toLowerCase());
      if (stdMatch) {
         newVals[stdMatch] = formatted;
      } else {
        const keyClean = key.trim();
        if (keyClean.toLowerCase() !== "sample" && keyClean.toLowerCase() !== "match 1" && keyClean.toLowerCase() !== "match") {
          const existsInCustom = addedCustoms.some(cp => cp.name.toLowerCase() === keyClean.toLowerCase());
          if (!existsInCustom) {
            addedCustoms.push({
              name: keyClean,
              spec: "-",
              unit: keyClean.toUpperCase() === "HB" ? "HB" : "%"
            });
          }
          newVals[keyClean] = formatted;
        }
      }
    });
    
    setTestingValues(newVals);
    setCustomtestingParams(addedCustoms);
    
    // Map current row and release any other row previously mapped to this active testing id for THIS specific point index
    const targetMappingId = `${activeTesting.id}_pt${testingPointIndex}`;
    setImportedCsvRows(prev => prev.map(r => {
      if (r.id === row.id) {
        return { ...r, usedForRegistrationId: targetMappingId };
      }
      if (r.usedForRegistrationId === targetMappingId) {
        return { ...r, usedForRegistrationId: undefined };
      }
      return r;
    }));
    showToast(`Berhasil memetakan data PMI Sample ${row.sample} (${row.match || "Tanpa Paduan"}) ke titik uji ini! Nilai dimasukkan secara otomatis.`, "success");
  };

  const handleCancelMappedSpectrometer = (mappedRow: ImportedCsvRow) => {
    // 1. Mark row as available again
    setImportedCsvRows(prev => prev.map(r => r.id === mappedRow.id ? { ...r, usedForRegistrationId: undefined } : r));
    
    // 2. Restore previous manually typed values if available
    if (preSpectrometerValues !== null) {
      setTestingValues(preSpectrometerValues);
      setCustomtestingParams(preSpectrometerCustomParams || []);
      setPreSpectrometerValues(null);
      setPreSpectrometerCustomParams(null);
    } else if (activeTesting) {
      const reg = activeTesting;
      const std = standards.find(s => 
        s.category === reg.category && 
        s.name.toLowerCase() === reg.standardName.toLowerCase() && 
        (s.source.toLowerCase() === (reg.standardSource || "").toLowerCase() || !reg.standardSource)
      ) || standards.find(s => 
        s.category === reg.category && 
        s.name.toLowerCase() === reg.standardName.toLowerCase()
      );
      
      const isElect = reg.category?.toLowerCase() === "kelistrikan" || reg.category?.toLowerCase() === "motor listrik";
      const initialVals: any = {};
      if (isElect) {
        const elecType = reg.categoryOptions?.electricalType || "motor_listrik";
        const paramsList = ELECTRICAL_PARAMS[elecType] || ELECTRICAL_PARAMS.motor_listrik;
        paramsList.forEach(p => {
          initialVals[`${p} (Sesuai PO)`] = "";
          initialVals[`${p} (Sesuai Nameplate)`] = "";
        });
      } else if (std) {
        std.parameters.forEach(p => {
          initialVals[p.name] = "";
        });
      } else {
        initialVals["Komposisi Utama"] = "";
      }
      
      const originalCustoms = reg.customParams || [];
      originalCustoms.forEach(cp => {
        initialVals[cp.name] = "";
      });
      setTestingValues(initialVals);
      setCustomtestingParams(originalCustoms);
    }
    showToast("Hubungan data spektrometer dibatalkan.", "info");
  };

  const handleAddCustomParam = () => {
    if (!newCustomParamName.trim()) return;
    const name = newCustomParamName.trim();
    if (activeTesting?.category === "karung") {
      const existsInStd = activeTestingStandard?.parameters.some(p => p.name.toLowerCase() === name.toLowerCase());
      const existsInCustom = customtestingParams.some(cp => cp.name.toLowerCase() === name.toLowerCase());
      if (existsInStd || existsInCustom) {
        alert("Parameter ini sudah ada!");
        return;
      }
      
      const newParam = {
        name,
        spec: newCustomParamSpec.trim() || "-",
        unit: newCustomParamUnit.trim() || "Text"
      };
      
      setCustomtestingParams([...customtestingParams, newParam]);
      setKarungGrid(prev => {
        const next = { ...prev };
        for (let t = 1; t <= testingPointsCount; t++) {
          next[t] = { ...(next[t] || {}), [name]: "" };
        }
        return next;
      });
      setNewCustomParamName("");
      setNewCustomParamSpec("");
      setNewCustomParamUnit("");
    } else {
      if (testingValues[name] !== undefined) {
        alert("Parameter ini sudah ada!");
        return;
      }
      const newParam = {
        name,
        spec: newCustomParamSpec.trim() || "-",
        unit: newCustomParamUnit.trim() || "Text"
      };
      setCustomtestingParams([...customtestingParams, newParam]);
      setTestingValues({ ...testingValues, [name]: "" });
      setNewCustomParamName("");
      setNewCustomParamSpec("");
      setNewCustomParamUnit("");
    }
  };

  const saveKarungGridResults = async () => {
    if (!activeTesting) return;

    // Validate that at least 1 tool is selected if this category has predefined tools
    const categoryTools = CATEGORY_EQUIPMENT[activeTesting.category] || [];
    if (categoryTools.length > 0 && testingSelectedTools.length === 0) {
      alert(`Wajib mencentang minimal 1 Alat Uji Laboratorium yang digunakan untuk kategori ${activeTesting.category.toUpperCase()}!`);
      return;
    }

    // Convert the karungGrid into results list
    const finalPointsList = [];
    for (let t = 1; t <= testingPointsCount; t++) {
      const rowValues = karungGrid[t] || {};
      // Ensure all fields are standard formatted
      const cleanValues: Record<string, string> = {};
      Object.entries(rowValues).forEach(([k, v]) => {
        cleanValues[k] = v as string;
      });

      finalPointsList.push({
        pointIndex: t,
        pointName: `Titik Uji #${t}`,
        values: cleanValues
      });
    }

    try {
      const updatedReg = {
        ...activeTesting,
        results: finalPointsList,
        points: finalPointsList.length,
        pengujiInitials: currentUser.initials,
        tanggalDiuji: new Date().toISOString().split("T")[0],
        status: "Uji",
        customParams: customtestingParams || undefined,
        selectedTools: testingSelectedTools || undefined,
        notes: testerNotes || "",
        categoryOptions: {
          electricalType
        }
      };

      // 1. Direct client-side write to Firestore first
      await setDoc(doc(db, "registrations", activeTesting.id), updatedReg);

      // 2. Sync with local server database
      try {
        await fetch("/api/registrations/update-results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: activeTesting.id,
            results: finalPointsList,
            pengujiInitials: currentUser.initials,
            tanggalDiuji: new Date().toISOString().split("T")[0],
            customParams: customtestingParams,
            selectedTools: testingSelectedTools,
            notes: testerNotes,
            categoryOptions: {
              electricalType
            }
          })
        });
      } catch (syncErr) {
        console.warn("Server-side update-results sync failed:", syncErr);
      }

      setLastTestedCategory(activeTesting.category);
      setActiveTesting(null);
      setActiveTestingStandard(null);
      refreshData();
      alert(`Hasil Pengujian ${activeTesting.category === "filter cloth" ? "Filter Cloth" : "Karung"} berhasil disimpan. Laporan diteruskan ke Supervisor Review.`);
    } catch (err: any) {
      console.error(err);
      alert("Terjadi kesalahan sistem saat menyimpan hasil ke Firestore: " + err.message);
    }
  };

  const nextOrSavePoint = async () => {
    if (!activeTesting) return;

    if (activeTesting.category === "karung" || activeTesting.category === "filter cloth") {
      await saveKarungGridResults();
      return;
    }

    // Validate that at least 1 tool is selected if this category has predefined tools
    const categoryTools = CATEGORY_EQUIPMENT[activeTesting.category] || [];
    if (categoryTools.length > 0 && testingSelectedTools.length === 0) {
      alert(`Wajib mencentang minimal 1 Alat Uji Laboratorium yang digunakan untuk kategori ${activeTesting.category.toUpperCase()}!`);
      return;
    }

    // For Valve testing, bundle the photographs and summary indicators directly inside results
    let updatedValues = { ...testingValues };
    if (activeTesting.category === "Valve") {
      updatedValues["manometer_photo"] = valveManometerPhoto;
      updatedValues["all_valves_photo"] = valveAllValvesPhoto;
      updatedValues["active_test_photo"] = valveActiveTestPhoto;
      updatedValues["v_total"] = valveTotal;
      updatedValues["v_lulus"] = valveLulus;
      updatedValues["v_gagal"] = valveGagal;
    }

    // Save active point to points lists
    const currentPointName = pointKeterangan ? `Titik: ${pointKeterangan}` : `Titik Uji #${testingPointIndex}`;
    
    let overrideNameStr = undefined;
    let overrideSourceStr = undefined;
    if (pointOverrideStandardId) {
      const matchedOver = standards.find(s => s.id === pointOverrideStandardId);
      if (matchedOver) {
        overrideNameStr = matchedOver.name;
        overrideSourceStr = matchedOver.source;
      }
    }

    const newPointRecord = {
      pointIndex: testingPointIndex,
      pointName: currentPointName,
      values: updatedValues,
      keteranganUji: pointKeterangan || undefined,
      overrideStandardId: pointOverrideStandardId || undefined,
      overrideStandardName: overrideNameStr,
      overrideStandardSource: overrideSourceStr,
    };

    const updatedPoints = [...testingPointsList, newPointRecord];

    if (testingPointIndex < testingPointsCount) {
      // Move to next point uji
      setTestingPointsList(updatedPoints);
      setTestingPointIndex(prev => prev + 1);
      // Reset values for next input
      const emptyVals = { ...testingValues };
      Object.keys(emptyVals).forEach(k => { emptyVals[k] = ""; });
      setTestingValues(emptyVals);
      // Clean up point-specific overridden selections
      setPointKeterangan("");
      setPointOverrideStandardId("");
    } else {
      // Final save and register results to servers
      try {
        const updatedReg = {
          ...activeTesting,
          results: updatedPoints,
          points: updatedPoints.length,
          pengujiInitials: currentUser.initials,
          tanggalDiuji: new Date().toISOString().split("T")[0],
          status: "Uji",
          customParams: customtestingParams || undefined,
          selectedTools: testingSelectedTools || undefined,
          notes: testerNotes || "",
          categoryOptions: {
            electricalType,
            nameplatePhoto: nameplatePhoto
          }
        };

        // 1. Direct client-side write to Firestore first
        await setDoc(doc(db, "registrations", activeTesting.id), updatedReg);

        // 2. Sync with local server database
        try {
          await fetch("/api/registrations/update-results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: activeTesting.id,
              results: updatedPoints,
              pengujiInitials: currentUser.initials,
              tanggalDiuji: new Date().toISOString().split("T")[0],
              customParams: customtestingParams,
              selectedTools: testingSelectedTools,
              notes: testerNotes,
              categoryOptions: {
                electricalType,
                nameplatePhoto: nameplatePhoto
              }
            })
          });
        } catch (syncErr) {
          console.warn("Server-side update-results sync failed:", syncErr);
        }

        setLastTestedCategory(activeTesting.category);
        setActiveTesting(null);
        setActiveTestingStandard(null);
        refreshData();
        alert("Hasil Pengujian berhasil disimpan. Laporan dilanjutkan ke tahap Supervisor Review.");
      } catch (err: any) {
        console.error(err);
        alert("Gagal menyimpan hasil pengujian ke Firestore: " + err.message);
      }
    }
  };

  // Approve review
  const handleReviewDecision = async (regId: string, approved: boolean, overrideQrSignature?: boolean, skipConfirm: boolean = false) => {
    let comment = (reviewCommentsMap[regId] || "").trim();
    if (!approved && !comment) {
      alert("Wajib mengetikkan Keterangan / Alasan terlebih dahulu pada baris laporan ini sebelum menolak / mengembalikannya ke Draft!");
      return;
    }

    const proceedWithDecision = async () => {
      const finalUseQr = overrideQrSignature !== undefined ? overrideQrSignature : (reviewUseQrMap[regId] !== false);
      try {
        const reg = registrations.find(r => r.id === regId);
        if (reg) {
          let updatedReg = { ...reg };

          if (approved) {
            const targetYearStr = new Date().toISOString().split("T")[0].split("-")[0];
            
            const localGetNextNoSurat = (currentRegs: any[], targetYear: string): string => {
              const yearRegs = currentRegs.filter((r: any) => {
                let sYear = "";
                if (r.tanggalTerbit) {
                  sYear = r.tanggalTerbit.split("-")[0];
                } else if (r.tanggalPPJ) {
                  sYear = r.tanggalPPJ.split("-")[0];
                } else {
                  sYear = new Date().getFullYear().toString();
                }
                return r.status === "Terbit" && r.noSurat && sYear === targetYear;
              });

              if (yearRegs.length === 0) {
                return "0001";
              }

              let maxSeq = 0;
              for (const r of yearRegs) {
                if (r.noSurat) {
                  const parts = r.noSurat.split("/");
                  const firstPart = parts[0];
                  const parsed = parseInt(firstPart, 10);
                  if (!isNaN(parsed) && parsed > maxSeq) {
                    maxSeq = parsed;
                  }
                }
              }

              const nextSeq = maxSeq + 1;
              return String(nextSeq).padStart(4, "0");
            };

            const nextSuratSeq = localGetNextNoSurat(registrations, targetYearStr);

            updatedReg.status = "Terbit";
            updatedReg.reviewerInitials = currentUser.initials;
            updatedReg.reviewerComments = comment || "Disetujui hasil uji sesuai standard.";
            updatedReg.tanggalTerbit = new Date().toISOString().split("T")[0];
            updatedReg.noSurat = `${nextSuratSeq}/PR.00.02/90/MI/${targetYearStr}`;
            updatedReg.trustCardId = `TC-${reg.noReg}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
            updatedReg.useQrSignature = finalUseQr;
          } else {
            updatedReg.status = "Draft"; // Reject back to edits
            updatedReg.reviewerComments = comment || "Ditolak - Perlu pengujian/parameter ulang.";
          }

          // 1. Direct client-side write to Firestore first
          await setDoc(doc(db, "registrations", regId), updatedReg);
        }

        // 2. Sync with local server database
        try {
          await fetch("/api/registrations/review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: regId,
              approved,
              reviewerInitials: currentUser.initials,
              comments: comment || (approved ? "Disetujui hasil uji sesuai standard." : ""),
              useQrSignature: finalUseQr
            })
          });
        } catch (syncErr) {
          console.warn("Server-side review decision sync failed:", syncErr);
        }

        setReviewCommentsMap(prev => {
          const next = { ...prev };
          delete next[regId];
          return next;
        });
        refreshData();
        alert(approved ? "Sertifikat Laporan Resmi berhasil diterbitkan!" : "Laporan ditolak dan dikembalikan untuk pengujian ulang.");
      } catch (err: any) {
        console.error(err);
        alert("Gagal memproses keputusan review di Firestore: " + err.message);
      }
    };

    if (skipConfirm) {
      await proceedWithDecision();
    } else {
      const actionText = approved ? "menyetujui dan menerbitkan laporan pengujian ini" : "menolak dan mengembalikan laporan pengujian ini ke Draft";
      askConfirmation(`Apakah Anda yakin ingin ${actionText}?`, proceedWithDecision);
    }
  };

  // Excel direct export format CSV logic
  const handleExportArchiveCsv = () => {
    // If selectedArsipRegs has elements, export only those; otherwise export all registrations
    const targetRegs = selectedArsipRegs.length > 0
      ? registrations.filter(r => selectedArsipRegs.includes(r.id))
      : registrations;

    if (targetRegs.length === 0) {
      alert("Tidak ada data yang dapat diekspor.");
      return;
    }

    // Collect all data headers
    const headers = [
      "No Registrasi", "Status Uji", "Nomor PPJ", "Nomor Surat", "Tanggal PPJ", "Tanggal Terbit",
      "PO Code", "PR Code", "Vendor", "Nama Barang", "Kategori", "Standard Acuan", "Nilai Rekam Raw Parameter"
    ];

    const rows = targetRegs.map(reg => {
      // Flatten all points values into single readable string block
      const pointRep = reg.results.map(pt => 
        `[Pt ${pt.pointIndex}]: ` + Object.entries(pt.values).map(([k,v]) => `${k}=${v}`).join(",")
      ).join(" | ");

      return [
        reg.noReg,
        reg.status,
        reg.ppjFull,
        reg.noSurat || "BELUM TERBIT",
        reg.tanggalPPJ,
        reg.tanggalTerbit || "-",
        reg.poCode,
        reg.prCode,
        reg.vendor.replace(/,/g, " "),
        reg.itemName.replace(/,/g, " "),
        reg.category,
        reg.standardName,
        `"${pointRep.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ITRK_ARSIP_DOKUMEN_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Multi Batch Completing print triggers
  const handleCheckboxToggleBatch = (id: string) => {
    if (selectedCompletedRegs.includes(id)) {
      setSelectedCompletedRegs(selectedCompletedRegs.filter(i => i !== id));
    } else {
      setSelectedCompletedRegs([...selectedCompletedRegs, id]);
    }
  };

  const triggerBatchPrint = () => {
    if (selectedCompletedRegs.length === 0) return;
    
    // Open print window by compiling chosen IDs
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup blocker menghalangi cetak batch. Mohon izinkan popups di browser Anda.");
      return;
    }

    const compiledHtml = selectedCompletedRegs.map(id => {
      const reg = registrations.find(r => r.id === id);
      if (!reg) return "";
      const element = document.getElementById(`report-sheet-${id}`);
      return element ? element.outerHTML : "";
    }).join("<div class='page-break' style='page-break-after: always; break-after: page; margin-top: 2cm;'></div>");

    printWindow.document.write(`
      <html>
        <head>
          <title>Batch Print Reports ITRK</title>
          <style>
            @media print {
              .no-print { display: none !important; }
              body { font-family: sans-serif; background: white; margin: 0; padding: 1.5cm; }
              .page-break { page-break-after: always; break-after: page; }
            }
            body { font-family: sans-serif; background: #e2e8f0; margin: 0; padding: 20px; }
            .page-break { margin: 40px auto; border: 1px dashed #64748b; padding: 20px; background: white; max-width: 800px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
          </style>
        </head>
        <body>
          <div class="no-print" style="position: sticky; top: 0; background:#f1f5f9; padding: 16px; font-weight: bold; border-bottom:1px solid #cbd5e1; text-align:center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 50; display: flex; justify-content: center; align-items: center; gap: 12px; margin-bottom: 20px;">
            <span>Mode Cetak Batch ITRK (${selectedCompletedRegs.length} Berkas) - Hubungkan Printer, lalu klik "Cetak"</span>
            <button onclick="window.print()" style="background:#006A4E; color:white; border:none; padding: 10px 20px; font-weight:bold; cursor:pointer; border-radius:8px; transition: all 0.2s;">Cetak Dokumen</button>
            <button onclick="window.close()" style="background:#64748b; color:white; border:none; padding: 10px 16px; font-weight:bold; cursor:pointer; border-radius:8px; transition: all 0.2s;">Selesai</button>
          </div>
          <div style="display: flex; flex-direction: column; gap: 20px;">
            ${compiledHtml}
          </div>
        </body>
      </html>
    `);

    // Copy stylesheet elements from main document to batch window
    Array.from(document.querySelectorAll("link[rel='stylesheet'], style")).forEach(styleElement => {
      printWindow.document.head.appendChild(styleElement.cloneNode(true));
    });

    printWindow.document.close();
  };

  // Counting metrics for Analisa dashboard
  const totalItems = registrations.length;
  const publishedCount = registrations.filter(r => r.status === "Terbit").length;
  const reviewCount = registrations.filter(r => r.status === "Review").length;
  const testedCount = registrations.filter(r => r.status === "Uji").length;
  const draftCount = registrations.filter(r => r.status === "Draft").length;

  const logsOutOfSpec = registrations.filter(r => 
    r.results.some(pt => Object.values(pt.values).some(v => typeof v === "string" && (v as string).trim().endsWith("*")))
  ).length;

  // Dynamic options derived from active registrations with status === "Draft"
  const draftRegsInStatus = registrations.filter(r => r.status === "Draft");
  const uniqueDraftCategories = Array.from(new Set(draftRegsInStatus.map(r => r.category).filter(Boolean)));
  const uniqueDraftVendors = Array.from(new Set(draftRegsInStatus.map(r => r.vendor).filter(Boolean)));
  const uniqueDraftStandards = Array.from(new Set(draftRegsInStatus.map(r => r.standardName).filter(Boolean)));

  // Dynamic options derived from active registrations with status === "Terbit"
  const terbitRegsInStatus = registrations.filter(r => r.status === "Terbit");
  const uniqueTerbitCategories = Array.from(new Set(terbitRegsInStatus.map(r => r.category).filter(Boolean)));
  const uniqueTerbitVendors = Array.from(new Set(terbitRegsInStatus.map(r => r.vendor).filter(Boolean)));
  const uniqueTerbitStandards = Array.from(new Set(terbitRegsInStatus.map(r => r.standardName).filter(Boolean)));

  // Advanced Analytics & Infographic statistics (Revisi 3)
  const getRegSpecStatus = (r: any) => {
    if (r.status === "Draft") return "draft";
    const isOffSpec = r.results?.some((pt: any) => 
      Object.values(pt.values || {}).some(v => 
        typeof v === "string" && (v as string).trim().endsWith("*")
      )
    );
    return isOffSpec ? "offspec" : "onspec";
  };

  const totalOnSpec = registrations.filter(r => getRegSpecStatus(r) === "onspec").length;
  const totalOffSpec = registrations.filter(r => getRegSpecStatus(r) === "offspec").length;
  const totalDraft = registrations.filter(r => getRegSpecStatus(r) === "draft").length;

  const categoriesList = ["karung", "logam", "filter cloth", "kelistrikan", "Valve", "benang", "rubber"];
  const categoryStats = categoriesList.map(cat => {
    const regs = registrations.filter(r => r.category === cat);
    const total = regs.length;
    const onspec = regs.filter(r => getRegSpecStatus(r) === "onspec").length;
    const offspec = regs.filter(r => getRegSpecStatus(r) === "offspec").length;
    const draft = regs.filter(r => getRegSpecStatus(r) === "draft").length;
    const tested = total - draft;
    const complianceRate = tested > 0 ? (onspec / tested) * 100 : 100;
    
    return {
      category: cat,
      total,
      onspec,
      offspec,
      draft,
      tested,
      complianceRate
    };
  });

  const vendorList = Array.from(new Set(registrations.map(r => r.vendor))).filter(Boolean);
  const vendorStats = vendorList.map(v => {
    const regs = registrations.filter(r => r.vendor === v);
    const total = regs.length;
    const onspec = regs.filter(r => getRegSpecStatus(r) === "onspec").length;
    const offspec = regs.filter(r => getRegSpecStatus(r) === "offspec").length;
    const draft = regs.filter(r => getRegSpecStatus(r) === "draft").length;
    const tested = total - draft;
    const complianceRate = tested > 0 ? (onspec / tested) * 100 : 100;
    
    return {
      vendor: v,
      total,
      onspec,
      offspec,
      draft,
      tested,
      complianceRate
    };
  }).sort((a, b) => b.total - a.total); // Sort by volume

  // Group by Month Trend (using tanggalPPJ)
  const trendStatsByMonth: { [key: string]: { monthName: string, total: number, onspec: number, offspec: number, draft: number } } = {};
  
  registrations.forEach(r => {
    let monthKey = "2026-04"; // Fallback
    if (r.tanggalPPJ && r.tanggalPPJ.includes("-")) {
      const parts = r.tanggalPPJ.split("-");
      if (parts[0] && parts[1]) {
        monthKey = `${parts[0]}-${parts[1]}`;
      }
    }
    
    if (!trendStatsByMonth[monthKey]) {
      const monthNamesIndo: { [key: string]: string } = {
        "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "Mei", "06": "Jun",
        "07": "Jul", "08": "Agu", "09": "Sep", "10": "Okt", "11": "Nov", "12": "Des"
      };
      const [year, month] = monthKey.split("-");
      const mName = monthNamesIndo[month] || month;
      trendStatsByMonth[monthKey] = {
        monthName: `${mName} ${year}`,
        total: 0,
        onspec: 0,
        offspec: 0,
        draft: 0
      };
    }
    
    trendStatsByMonth[monthKey].total += 1;
    const spec = getRegSpecStatus(r);
    if (spec === "onspec") {
      trendStatsByMonth[monthKey].onspec += 1;
    } else if (spec === "offspec") {
      trendStatsByMonth[monthKey].offspec += 1;
    } else {
      trendStatsByMonth[monthKey].draft += 1;
    }
  });

  const sortedMonths = Object.keys(trendStatsByMonth).sort().map(key => ({
    key,
    ...trendStatsByMonth[key]
  }));

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className={`
        ${sidebarMode === "hidden" ? "hidden" : ""}
        ${sidebarMode === "icon" ? "w-full md:w-20 px-2" : "w-full md:w-64 px-4"}
        bg-slate-900 text-white flex flex-col pt-6 font-medium border-r border-slate-800 flex-shrink-0 transition-all duration-350
      `}>
        <div className={`mb-8 ${sidebarMode === "icon" ? "px-1 text-center flex justify-center" : "px-4"}`}>
          <div className="flex items-center gap-2 justify-center">
            <span className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0">
              <Award className="w-6 h-6" />
            </span>
            {sidebarMode !== "icon" && (
              <div className="animate-fade-in">
                <h1 className="text-lg font-black tracking-wider text-emerald-100">IRIS PORTAL</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 font-sans">ITRK SYSTEM</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation items */}
        <nav className={`flex-1 space-y-1.5 text-sm ${sidebarMode === "icon" ? "px-1" : "px-2"}`}>
          <button
            onClick={() => setActiveTab("registrasi")}
            className={`w-full flex items-center transition-all font-semibold ${
              sidebarMode === "icon" ? "justify-center p-3" : "gap-3 px-4 py-3"
            } rounded-xl ${
              activeTab === "registrasi" ? "bg-slate-850 text-white border-l-4 border-emerald-500 font-bold" : "text-slate-450 hover:bg-slate-800 hover:text-white"
            }`}
            title="Registrasi Sampel"
          >
            <ClipboardList className="w-5 h-5 shrink-0" />
            {sidebarMode !== "icon" && <span className="animate-fade-in">Registrasi</span>}
            {draftCount > 0 && sidebarMode !== "icon" && (
              <span className="ml-auto bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full">
                {draftCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("uji")}
            className={`w-full flex items-center transition-all font-semibold ${
              sidebarMode === "icon" ? "justify-center p-3" : "gap-3 px-4 py-3"
            } rounded-xl ${
              activeTab === "uji" ? "bg-slate-850 text-white border-l-4 border-emerald-500 font-bold" : "text-slate-450 hover:bg-slate-800 hover:text-white"
            }`}
            title="Input Hasil Uji"
          >
            <CheckSquare className="w-5 h-5 shrink-0" />
            {sidebarMode !== "icon" && <span className="animate-fade-in">Input Hasil Uji</span>}
            {testedCount > 0 && sidebarMode !== "icon" && (
              <span className="ml-auto bg-indigo-500 text-indigo-50 font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                {testedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("review")}
            className={`w-full flex items-center transition-all font-semibold ${
              sidebarMode === "icon" ? "justify-center p-3" : "gap-3 px-4 py-3"
            } rounded-xl ${
              activeTab === "review" ? "bg-slate-850 text-white border-l-4 border-emerald-500 font-bold" : "text-slate-450 hover:bg-slate-800 hover:text-white"
            }`}
            title="Review & Surat"
          >
            <Eye className="w-5 h-5 shrink-0" />
            {sidebarMode !== "icon" && <span className="animate-fade-in">Review & Surat</span>}
            {reviewCount > 0 && sidebarMode !== "icon" && (
              <span className="ml-auto bg-rose-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
                {reviewCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("terbit")}
            className={`w-full flex items-center transition-all font-semibold ${
              sidebarMode === "icon" ? "justify-center p-3" : "gap-3 px-4 py-3"
            } rounded-xl ${
              activeTab === "terbit" ? "bg-slate-850 text-white border-l-4 border-emerald-500 font-bold" : "text-slate-450 hover:bg-slate-800 hover:text-white"
            }`}
            title="Terbit"
          >
            <Award className="w-5 h-5 shrink-0" />
            {sidebarMode !== "icon" && <span className="animate-fade-in">Terbit</span>}
          </button>

          <button
            onClick={() => setActiveTab("analisa")}
            className={`w-full flex items-center transition-all font-semibold ${
              sidebarMode === "icon" ? "justify-center p-3" : "gap-3 px-4 py-3"
            } rounded-xl ${
              activeTab === "analisa" ? "bg-slate-850 text-white border-l-4 border-emerald-500 font-bold" : "text-slate-450 hover:bg-slate-800 hover:text-white"
            }`}
            title="Analisa"
          >
            <BarChart3 className="w-5 h-5 shrink-0" />
            {sidebarMode !== "icon" && <span className="animate-fade-in">Analisa</span>}
          </button>

          <button
            onClick={() => setActiveTab("master")}
            className={`w-full flex items-center transition-all font-semibold ${
              sidebarMode === "icon" ? "justify-center p-3" : "gap-3 px-4 py-3"
            } rounded-xl ${
              activeTab === "master" ? "bg-slate-850 text-white border-l-4 border-emerald-500 font-bold" : "text-slate-450 hover:bg-slate-800 hover:text-white"
            }`}
            title="Master Database"
          >
            <Database className="w-5 h-5 shrink-0" />
            {sidebarMode !== "icon" && <span className="animate-fade-in">Master Database</span>}
          </button>

          <button
            onClick={() => setActiveTab("arsip")}
            className={`w-full flex items-center transition-all font-semibold ${
              sidebarMode === "icon" ? "justify-center p-3" : "gap-3 px-4 py-3"
            } rounded-xl ${
              activeTab === "arsip" ? "bg-slate-850 text-white border-l-4 border-emerald-500 font-bold" : "text-slate-450 hover:bg-slate-800 hover:text-white"
            }`}
            title="Arsip Raw Data"
          >
            <Archive className="w-5 h-5 shrink-0" />
            {sidebarMode !== "icon" && <span className="animate-fade-in">Arsip Raw Data</span>}
          </button>

          <button
            onClick={() => setActiveTab("user")}
            className={`w-full flex items-center transition-all font-semibold ${
              sidebarMode === "icon" ? "justify-center p-3" : "gap-3 px-4 py-3"
            } rounded-xl ${
              activeTab === "user" ? "bg-slate-850 text-white border-l-4 border-emerald-500 font-bold" : "text-slate-450 hover:bg-slate-800 hover:text-white"
            }`}
            title="Kelola User & Sandi"
          >
            <KeyRound className="w-5 h-5 shrink-0" />
            {sidebarMode !== "icon" && <span className="animate-fade-in">Kelola User</span>}
          </button>
        </nav>

        {/* Current User Card Info */}
        <div className={`p-4 border-t border-slate-800 bg-slate-950 mt-auto text-xs ${sidebarMode === "icon" ? "flex flex-col items-center gap-3 px-1" : "space-y-3"}`}>
          <div className="flex items-center gap-2 justify-center">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow">
              {currentUser.initials}
            </div>
            {sidebarMode !== "icon" && (
              <div className="animate-fade-in">
                <p className="font-bold text-slate-100 line-clamp-1">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400 font-mono capitalize">{currentUser.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            className={`w-full bg-slate-800 hover:bg-rose-950 hover:text-rose-200 transition-all font-bold text-slate-350 p-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer border border-slate-755 ${sidebarMode === "icon" ? "px-1 text-[10px]" : ""}`}
            title="Keluar Portal"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {sidebarMode !== "icon" && <span>Keluar Portal</span>}
          </button>
        </div>
      </aside>

      {/* Main Administrative Container Panel */}
      <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {/* Top Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase">
              {activeTab} Portal <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-bold lowercase tracking-normal">({currentUser.role})</span>
            </h2>
            <p className="text-slate-500 text-sm font-medium mt-0.5">Sistem inspeksi terpadu ITRK PKG.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Sidebar toggle buttons inside top header */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1 border">
              <button
                type="button"
                onClick={() => setSidebarMode("full")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  sidebarMode === "full" ? "bg-slate-800 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200"
                }`}
                title="Sidebar Lebar"
              >
                Full
              </button>
              <button
                type="button"
                onClick={() => setSidebarMode("icon")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  sidebarMode === "icon" ? "bg-slate-800 text-white shadow-sm" : "text-slate-600 hover:bg-slate-200"
                }`}
                title="Hanya Logo & Icon"
              >
                Icon
              </button>
              <button
                type="button"
                onClick={() => setSidebarMode("hidden")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                  sidebarMode === "hidden" ? "bg-slate-850 text-slate-800 shadow border border-slate-300" : "text-slate-600 hover:bg-slate-200"
                }`}
                title="Sembunyikan Penuh"
              >
                Hide
              </button>
            </div>

            <span className="text-xs font-mono font-medium text-slate-500 bg-white p-2 rounded border border-slate-100 flex items-center gap-1 shrink-0">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live DB Synced
            </span>
          </div>
        </header>

        {/* TAB CONTENTS */}

        {/* 1. REGISTRASI TAB */}
        {activeTab === "registrasi" && (
          <div className="space-y-6">
            
            {/* Action Header Card with Channel selectors */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Kanal Registrasi Sampel</h3>
                  <p className="text-xs text-slate-500">Daftarkan item secara manual berkelompok (Excel), manual tunggal, atau asisten AI OCR.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setManualRegMode(!manualRegMode);
                      setPastingMode(false);
                    }}
                    className={`font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                      manualRegMode 
                        ? "bg-slate-900 text-white shadow-sm" 
                        : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Registrasi Manual (Tunggal)
                  </button>

                  <button
                    onClick={() => {
                      setPastingMode(!pastingMode);
                      setManualRegMode(false);
                    }}
                    className={`font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                      pastingMode 
                        ? "bg-indigo-700 text-white shadow-sm" 
                        : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Buka Penerimaan Excel
                  </button>
                  
                  {/* AI Scan Dropzone */}
                  <label className="bg-[#006A4E] hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all">
                    {aiScanning ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Scanning...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" /> Tarik Dokumen AI (OCR)
                      </>
                    )}
                    <input
                      type="file"
                      id="ai-ocr-upload"
                      accept="image/*"
                      className="hidden"
                      onChange={handleOcrUpload}
                      disabled={aiScanning}
                    />
                  </label>
                </div>
              </div>

              {aiScanning && (
                <div className="bg-emerald-50 text-emerald-950 p-4 border rounded-xl flex items-center gap-3 text-xs font-semibold">
                  <Loader2 className="w-5 h-5 animate-spin text-[#006A4E]" />
                  <span>Sistem Gemini AI sedang menganalisis dokumen PPJ, mencocokkan acuan logam, dan merakit draf secara otomatis...</span>
                </div>
              )}

              {aiError && (
                <div className="bg-red-50 text-red-800 p-4 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-medium">
                  <AlertTriangle className="w-5 h-5" />
                  <span>AI parsing errored: {aiError}. Kami sarankan memakai metode manual atau pasting standar.</span>
                </div>
              )}

              {/* A. Manual Registration Form Block */}
              {manualRegMode && (
                <form onSubmit={handleManualRegisterSub} className="border border-slate-200 bg-slate-50/50 rounded-2xl p-6 text-xs space-y-4">
                  <div className="border-b pb-2 flex justify-between items-center mb-2">
                    <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-emerald-600" /> Formulir Registrasi Sampel Tunggal (Manual)
                    </h4>
                    <button type="button" onClick={() => setManualRegMode(false)} className="text-[11px] text-slate-500 hover:text-slate-800 font-bold">× Tutup</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    
                    {/* No PPJ */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 block">No. PPJ (4 Digit)<span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        required 
                        maxLength={4}
                        placeholder="Contoh: 1463"
                        value={manPPJCode}
                        onChange={(e) => setManPPJCode(e.target.value.replace(/\D/g, ""))}
                        className="w-full text-xs font-bold border rounded-lg px-3 py-2 bg-white text-slate-800"
                      />
                    </div>

                    {/* No PR */}
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-500 block">No. Purchase Request (PR)</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: 2200110320"
                        value={manPRCode}
                        onChange={(e) => setManPRCode(e.target.value)}
                        className="w-full text-xs border rounded-lg px-3 py-2 bg-white text-slate-800 font-mono"
                      />
                    </div>

                    {/* No PO */}
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-500 block">No. Purchase Order (PO)</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: 5100149638"
                        value={manPOCode}
                        onChange={(e) => setManPOCode(e.target.value)}
                        className="w-full text-xs border rounded-lg px-3 py-2 bg-white text-slate-800 font-mono"
                      />
                    </div>

                    {/* Vendor Autocomplete */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 block">Vendor Pengirim<span className="text-red-500">*</span></label>
                      <AutoComplete 
                        placeholder="Cari atau ketik nama vendor..."
                        value={manVendor}
                        onChange={(val) => setManVendor(val)}
                        options={Array.from(new Set(registrations.map(r => r.vendor).filter(Boolean)))}
                      />
                    </div>

                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Category Selector */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 block">Kategori Material Uji</label>
                      <select
                        value={manCategory}
                        onChange={(e) => {
                          const cat = e.target.value;
                          setManCategory(cat);
                          setManStandardName("");
                          setManStandardSource("");
                          setManMetalAcuan("");
                          if (cat === "karung") {
                            setManPoints(5);
                          } else {
                            setManPoints(1);
                          }
                        }}
                        className="w-full text-xs border rounded-lg px-3 py-2 bg-white text-slate-800 font-bold"
                      >
                        <option value="logam">Logam</option>
                        <option value="karung">Karung</option>
                        <option value="benang">Benang Jahit</option>
                        <option value="kelistrikan">Kelistrikan</option>
                        <option value="Valve">Valve</option>
                        <option value="filter cloth">Filter Cloth</option>
                        <option value="rubber">Rubber</option>
                      </select>
                    </div>

                    {/* Item Name Autocomplete */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 block">Nama Barang / Deskripsi<span className="text-red-500">*</span></label>
                      {manCategory === "karung" ? (
                        <div className="p-2 border rounded-lg bg-indigo-50 border-indigo-200 text-indigo-900 font-extrabold text-xs uppercase select-none min-h-[38px] flex items-center shadow-sm">
                          {manItemName || "NAMA DEFAULT ACUAN (Otomatis dari Standard)"}
                        </div>
                      ) : (
                        <AutoComplete 
                          placeholder="Contoh: ELBOW 8IN, BOLT, PHONSKA BG"
                          value={manItemName}
                          onChange={(val) => setManItemName(val)}
                          options={Array.from(new Set(registrations.filter(r => r.category === manCategory).map(r => r.itemName).filter(Boolean)))}
                        />
                      )}
                    </div>

                    {/* Additional Details */}
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-500 block">Keterangan Spesifik Tambahan</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: Lokasi Pabrik I, Ujung Bengkel"
                        value={manDescription}
                        onChange={(e) => setManDescription(e.target.value)}
                        className="w-full text-xs border rounded-lg px-3 py-2 bg-white text-slate-800"
                      />
                    </div>

                  </div>

                  {/* Autocomplete standard lookup conditioned strictly by user mandate 4 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200/80 pt-3">
                    
                    {manCategory === "logam" ? (
                      <>
                        {/* Selected Reference Acuan (Requirement 6 - dropdown only) */}
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block bg-slate-200/50 px-2 py-0.5 rounded inline-block">1. Pilih Acuan Standard Logam <span className="text-red-500">*</span></label>
                          <select
                            required
                            value={manMetalAcuan}
                            onChange={(e) => {
                              const val = e.target.value;
                              setManMetalAcuan(val);
                              setManStandardName(""); // Reset grade if acuan changed
                              setManStandardSource("");
                            }}
                            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 font-extrabold focus:outline-[#006A4E] focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="">-- Pilih Acuan Logam --</option>
                            {Array.from(new Set(standards.filter(s => s.category === "logam").map(s => s.source).filter(Boolean))).sort().map(src => (
                              <option key={src} value={src}>{src}</option>
                            ))}
                          </select>
                        </div>

                        {/* Search Grade (Requirement 6 - dropdown only) */}
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block bg-slate-200/50 px-2 py-0.5 rounded inline-block">2. Pilih Standard Grade Logam <span className="text-red-500">*</span></label>
                          <select
                            required
                            disabled={!manMetalAcuan}
                            value={manStandardName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setManStandardName(val);
                              const found = standards.find(s => s.category === "logam" && s.source === manMetalAcuan && s.name === val);
                              if (found) {
                                setManStandardSource(found.source);
                              }
                            }}
                            className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 font-extrabold focus:outline-[#006A4E] focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            <option value="">-- Pilih Grade Logam --</option>
                            {standards
                              .filter(s => s.category === "logam" && s.source === manMetalAcuan)
                              .map(s => (
                                <option key={s.name} value={s.name}>{s.name}</option>
                              ))
                            }
                          </select>
                        </div>

                        {manMetalAcuan && (
                          <div className="md:col-span-3 bg-amber-50 border border-amber-250 text-amber-900 rounded-xl px-4 py-2.5 text-xs flex items-center justify-between shadow-sm animate-fade-in mt-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">💡</span>
                              <div>
                                <span className="font-bold text-slate-700">ASTM {manMetalAcuan.toUpperCase()}</span> diperuntukkan bagi bentuk produk:{" "}
                                <strong className="text-emerald-900 underline font-black uppercase text-[10px] tracking-wide">{getProductFormForAcuan(manMetalAcuan, standards) || "Logam Spesifik"}</strong>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : manCategory === "kelistrikan" ? (
                      <div className="space-y-1 md:col-span-2">
                        <label className="font-bold text-emerald-900 block bg-emerald-50 px-2 py-0.5 rounded inline-block">Pilih Sub-Kategori Kelistrikan <span className="text-red-500">*</span></label>
                        <select
                          required
                          value={manStandardName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManStandardName(val);
                            const found = standards.find(s => s.category === "kelistrikan" && s.name === val);
                            if (found) {
                              setManStandardSource(found.source || "PO Spec Check");
                            } else {
                              setManStandardSource("PO Spec Check");
                            }
                          }}
                          className="w-full text-xs border border-emerald-300 rounded-lg px-3 py-2 bg-white text-slate-800 font-extrabold focus:outline-[#006A4E] focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="">-- Pilih Sub-Kategori / Standard Kelistrikan --</option>
                          <option value="Motor Listrik">⚡ Motor Listrik (Motor AC/DC)</option>
                          <option value="Gearcase Motor">⚙️ Gearcase Motor (Gearcase & Reducer)</option>
                          <option value="Vibrator">🌀 Vibrator Motor (Uji Vibratory Screen)</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-1 md:col-span-2">
                        {/* Non-metal categories directly autocomplete grade */}
                        <label className="font-bold text-slate-650 block bg-slate-100/50 px-2 py-0.5 rounded inline-block text-xs">Katalog Standard Mutu <span className="text-red-500">*</span></label>
                        {manCategory === "karung" ? (
                          <select
                            required
                            value={manStandardName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setManStandardName(val);
                              const found = standards.find(s => s.category === "karung" && s.name === val);
                              if (found) {
                                setManStandardSource(found.source || "KSM INTERNAL");
                                setManItemName(found.defaultNamaKarung || found.name);
                              } else {
                                setManItemName("");
                              }
                            }}
                            className="w-full text-xs border border-indigo-300 rounded-lg px-3 py-2 bg-white text-slate-800 font-extrabold focus:outline-indigo-500 transition-all shadow-sm"
                          >
                            <option value="">-- Pilih Acuan Karung Master --</option>
                            {standards
                              .filter(s => s.category === "karung")
                              .map(s => (
                                <option key={s.name} value={s.name}>
                                  {s.name}
                                </option>
                              ))
                            }
                          </select>
                        ) : (
                          <AutoComplete 
                            placeholder="Cari standard acuan (mis: PHONSKA, ZA SUB, etc)..."
                            value={manStandardName}
                            onChange={(val) => {
                              setManStandardName(val);
                              const found = standards.find(s => s.category === manCategory && s.name === val);
                              if (found) {
                                setManStandardSource(found.source || "KSM INTERNAL");
                                if ((manCategory === "karung" || manCategory === "benang") && found.defaultNamaKarung) {
                                  setManItemName(found.defaultNamaKarung);
                                }
                              }
                            }}
                            options={standards.filter(s => s.category === manCategory).map(s => s.name)}
                          />
                        )}
                      </div>
                    )}

                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200/80 pt-3">
                    
                    {/* Quantity */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 block">Jumlah & Satuan Fisik Barang</label>
                      <input 
                        type="text" 
                        placeholder="Contoh: 3 Pcs, 1 Box, 20 Roll"
                        value={manQuantity}
                        onChange={(e) => setManQuantity(e.target.value)}
                        className="w-full text-xs border rounded-lg px-3 py-2 bg-white text-slate-800"
                      />
                    </div>

                    {/* Tanggal PPJ */}
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-500 block">Tanggal PPJ Dokumen</label>
                      <input 
                        type="date" 
                        value={manTanggalPPJ}
                        onChange={(e) => setManTanggalPPJ(e.target.value)}
                        className="w-full text-xs border rounded-lg px-3 py-2 bg-white text-slate-800"
                      />
                    </div>

                    {/* Tanggal Diterima di Bengkel */}
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-500 block">Tanggal Diterima Lab</label>
                      <input 
                        type="date" 
                        value={manTanggalDiterima}
                        onChange={(e) => setManTanggalDiterima(e.target.value)}
                        className="w-full text-xs border rounded-lg px-3 py-2 bg-white text-slate-800"
                      />
                    </div>

                  </div>

                  {/* Plat Nomor Pengirim if Karung or Benang */}
                  {(manCategory === "karung" || manCategory === "benang") && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-205 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="space-y-1">
                        <label className="font-extrabold text-indigo-700 block uppercase tracking-wide">📦 Plat Nomor Pengirim (Wajib)<span className="text-red-500">*</span></label>
                        <input 
                          type="text" 
                          required
                          placeholder="misal: W 1463 AB"
                          value={manPlatNomor}
                          onChange={(e) => setManPlatNomor(e.target.value.toUpperCase())}
                          className="w-full text-xs border border-indigo-200 rounded-lg px-3 py-2 bg-indigo-50/25 text-indigo-950 font-black uppercase tracking-wider focus:outline-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Submission and reset controls */}
                  <div className="flex justify-end gap-2.5 pt-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        setManPPJCode("");
                        setManVendor("");
                        setManItemName("");
                        setManStandardName("");
                        setManMetalAcuan("");
                        setManualRegMode(false);
                      }} 
                      className="px-4 py-2 border rounded-lg text-slate-500 font-bold hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit" 
                      className="bg-[#006A4E] hover:bg-emerald-800 text-white font-extrabold px-6 py-2 rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" /> Daftarkan Sampel Tunggal
                    </button>
                  </div>

                </form>
              )}


              {/* B. Batch Excel/CSV Pasting & Upload Panel */}
              {pastingMode && (
                <div className="border border-indigo-200 rounded-xl p-6 bg-slate-50 space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3 border-indigo-100">
                    <div>
                      <h4 className="font-extrabold text-indigo-950 text-sm flex items-center gap-1.5">
                        <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                        Kanal Registrasi Kumpulan (Batch PPJ)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Unggah file CSV resmi atau salin & tempel daftar pengujian dari SAP/Maximo Petrokimia Gresik.
                      </p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-800 text-[10px] uppercase px-2.5 py-1 rounded-full border border-emerald-250 font-bold tracking-wider select-none animate-pulse">
                      ⚡ Smart AI & Heuristic Parser Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Left Column: Instructions and File Upload */}
                    <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 text-[11px]">
                      <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Panduan Penggunaan</h5>
                      
                      <div className="space-y-2 text-slate-600 leading-relaxed font-semibold">
                        <p>💡 <strong>Mendukung Dua Format Utama:</strong></p>
                        <ol className="list-decimal pl-4 space-y-1">
                          <li>
                            <strong className="text-indigo-700">Official CSV Ekspor:</strong> Salin (Copy-Paste) seluruh isi dokumen atau klik tombol "Pilih Berkas CSV" di bawah untuk mengupload berkas CSV Petrokimia Gresik.
                          </li>
                          <li>
                            <strong className="text-teal-700">Tabular Excel biasa:</strong> Kolom berurutan: <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-800 font-mono">PPJ [Tab] PR [Tab] PO [Tab] Vendor [Tab] Barang</code>.
                          </li>
                        </ol>
                        <p className="text-slate-500 font-medium">
                          Sistem kami secara cerdas mengidentifikasi nomor PPJ, PR, PO, nama vendor, hingga mendeteksi standar material dan batas toleransi kimiawi acuan uji secara otomatis.
                        </p>
                      </div>

                      {/* File Ingestion Field */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <label className="font-extrabold text-slate-700 block">Atau Langsung Unggah Dokumen CSV atau Excel (.xlsx):</label>
                        <div className="flex items-center gap-2">
                          <label className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs px-3 py-2.5 rounded-lg border border-emerald-250 cursor-pointer text-center transition-all">
                            📂 Pilih Berkas CSV / Excel (.XLSX)
                            <input
                              type="file"
                              accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const filename = file.name.toLowerCase();
                                const reader = new FileReader();

                                if (filename.endsWith(".xlsx") || filename.endsWith(".xls")) {
                                  reader.onload = (event) => {
                                    try {
                                      const data = new Uint8Array(event.target?.result as ArrayBuffer);
                                      const workbook = XLSX.read(data, { type: "array" });
                                      let csvContent = "";
                                      for (const sheetName of workbook.SheetNames) {
                                        const ws = workbook.Sheets[sheetName];
                                        const sheetCsv = XLSX.utils.sheet_to_csv(ws);
                                        if (sheetCsv.trim()) {
                                          csvContent += sheetCsv + "\n";
                                        }
                                      }
                                      if (csvContent.trim()) {
                                        setImportText(csvContent);
                                        alert(`File Excel (.xlsx) dengan ${workbook.SheetNames.length} sheet berhasil diurai! Klik tombol 'Muat & Ekstrak Data' untuk melakukan peninjauan.`);
                                      } else {
                                        alert("File Excel kosong atau tidak terbaca.");
                                      }
                                    } catch (err) {
                                      console.error(err);
                                      alert("Terjadi kesalahan saat memproses file Excel.");
                                    }
                                  };
                                  reader.readAsArrayBuffer(file);
                                } else {
                                  reader.onload = (event) => {
                                    const content = event.target?.result as string;
                                    if (content) {
                                      setImportText(content);
                                      alert("File CSV berhasil diunggah! Klik tombol 'Muat & Ekstrak Data' di kanan bawah untuk mulai mengurai.");
                                    }
                                  };
                                  reader.readAsText(file, "UTF-8");
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Paste Textarea */}
                    <div className="lg:col-span-2 space-y-2">
                      <label className="font-bold text-slate-700 text-xs block">Tempel data teks di sini:</label>
                      <textarea
                        rows={8}
                        value={importText}
                        onChange={(e) => setImportText(e.target.value)}
                        placeholder="Tempel salinan ekspor CSV/Excel di sini...&#10;Contoh format resmi Petrokimia:&#10;PENERIMAAN SUKU CADANG & BAHAN PENOLONG,,,,,,,&#10;Nomor PPJ,,:,1023/LG.01.01/101/MI/2026,,,,&#10;Tanggal,,:,02 April 2026,,,,&#10;NO,NAMA BARANG / MATERIAL,,,JUMLAH,SATUAN,KETERANGAN,&#10;1,ELBOW:8IN;90D;LR;S40;WP304L;BW,,,3,EA,PO :,5100149638&#10;,KODE MATERIAL : 6029866,,,,,PR :,2200110320"
                        className="w-full border border-slate-200 p-3 rounded-lg text-[10px] font-mono bg-white text-slate-800 shadow-inner focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-indigo-100 pt-3 text-[11px] text-slate-500 font-medium">
                    <div>
                      {importText.trim() ? (
                        <span className="text-emerald-700 font-bold animate-pulse">
                          ✓ Karakter terdeteksi: {importText.length}. Siap diproses!
                        </span>
                      ) : (
                        <span>Masukkan atau unggah salinan CSV untuk memulai estimasi batch.</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => {
                          setImportText("");
                          setPastingMode(false);
                        }} 
                        className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-200 border border-slate-200 rounded-lg cursor-pointer transition-colors font-bold"
                      >
                        Batal
                      </button>
                      <button 
                        type="button" 
                        onClick={handleBatchExcelPaste} 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2 rounded-lg cursor-pointer transition-all shadow hover:shadow-md"
                      >
                        ⚙️ Muat & Ekstrak Data
                      </button>
                    </div>
                  </div>
                </div>
              )}


              {/* C. Batch Preview Panel strictly satisfying user requests 1, 2, 3, 4, and 5 */}
              {batchPreviewItems.length > 0 && (
                <div className="border-2 border-amber-300 rounded-2xl p-5 bg-amber-50/25 space-y-4 shadow-md">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                      <h4 className="font-extrabold text-amber-950 text-sm flex items-center gap-1.5">
                        <AlertTriangle className="w-5 h-5 text-amber-600 animate-pulse" /> 
                        Sistem Pratinjau & Edit Batch Registrasi (Interactive Sandbox)
                      </h4>
                      <p className="text-[11px] text-slate-600 font-semibold">
                        ⚠️ Seluruh parameter penguraian AI dapat dikoreksi langsung di tabel bawah sebelum disimpan ke draft antrean. 
                        Sistem otomatis menyamakan PO & Vendor jika Anda menyunting No PPJ yang sama (1 PPJ = 1 PO & Vendor sama).
                      </p>
                    </div>
                    
                    <div className="flex gap-2 shrink-0 self-end sm:self-start">
                      <button 
                        type="button" 
                        onClick={() => {
                          askConfirmation(
                            "Apakah Anda yakin ingin membatalkan impor batch ini? Seluruh data pratinjau sementara akan dikosongkan.",
                            () => {
                              setBatchPreviewItems([]);
                              setImportText("");
                            }
                          );
                        }}
                        className="bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 hover:text-rose-800 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Batalkan Impor
                      </button>

                      <button 
                        type="button" 
                        onClick={handleConfirmBatchRegister}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold px-4 py-1.5 rounded-lg shadow-md flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Check className="w-4 h-4" /> Simpan Semua ({batchPreviewItems.length} Sampel)
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-96 border border-amber-300 rounded-xl bg-white shadow-inner">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-amber-100 text-amber-950 border-b border-amber-300 font-extrabold uppercase text-[10px] select-none sticky top-0 z-10">
                        <tr>
                          <th className="p-3 w-20">No PPJ</th>
                          <th className="p-3 min-w-[200px]">Nama Barang / Material</th>
                          <th className="p-3 min-w-[180px]">Deskripsi Internal (===)</th>
                          <th className="p-3 min-w-[150px]">Vendor</th>
                          <th className="p-3">Kode PR & PO</th>
                          <th className="p-3">Kategori</th>
                          <th className="p-3 min-w-[210px]">Standard Acuan & Grade</th>
                          <th className="p-3">Qty Fisis</th>
                          <th className="p-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {batchPreviewItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/10 transition-colors">
                            {/* PPJ CODE INPUT */}
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={item.ppjCode || ""}
                                placeholder="1023"
                                onChange={(e) => updatePreviewItem(idx, { ppjCode: e.target.value })}
                                className="w-16 border border-slate-200 hover:border-amber-400 focus:border-amber-600 rounded px-1.5 py-1 text-xs font-black text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/10 transition-colors"
                              />
                            </td>

                            {/* ITEM NAME INPUT */}
                            <td className="p-2.5">
                              {item.category === "karung" ? (
                                <div className="p-1.5 bg-indigo-55 text-indigo-950 font-extrabold rounded border border-indigo-200 text-xs uppercase select-none min-h-[36px] flex items-center shadow-sm">
                                  {item.itemName || "Nama Karung Default"}
                                </div>
                              ) : (
                                <textarea
                                  rows={2}
                                  value={item.itemName || ""}
                                  placeholder="NAMA BARANG..."
                                  onChange={(e) => updatePreviewItem(idx, { itemName: e.target.value })}
                                  className="w-full border border-slate-200 hover:border-amber-400 focus:border-amber-600 rounded px-1.5 py-1 text-xs font-bold uppercase text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/10 transition-colors resize-y min-h-[36px]"
                                />
                              )}
                            </td>

                            {/* DESCRIPTION INPUT */}
                            <td className="p-2.5">
                              <textarea
                                rows={2}
                                value={item.description || ""}
                                placeholder="Tulis rincian deskripsi internal yang diawali === atau keterangan..."
                                onChange={(e) => updatePreviewItem(idx, { description: e.target.value })}
                                className="w-full border border-slate-200 hover:border-amber-400 focus:border-amber-600 rounded px-1.5 py-1 text-[11px] text-slate-705 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/10 transition-colors resize-y min-h-[36px] font-medium"
                              />
                            </td>

                            {/* VENDOR INPUT WITH AUTO PROPAGATE */}
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={item.vendor || ""}
                                placeholder="PT VENDOR..."
                                onChange={(e) => updatePreviewItem(idx, { vendor: e.target.value })}
                                className="w-full border border-slate-200 hover:border-amber-400 focus:border-amber-600 rounded px-1.5 py-1 text-xs font-bold text-indigo-950 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/10 transition-colors"
                              />
                              <label className="flex items-center gap-1 mt-1 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={!!item.isNewVendorFlag}
                                  onChange={(e) => updatePreviewItem(idx, { isNewVendorFlag: e.target.checked })}
                                  className="rounded text-amber-600 focus:ring-amber-500 border-slate-300 w-3 h-3 cursor-pointer"
                                />
                                <span className={`text-[9px] font-extrabold px-1 rounded-sm tracking-tight leading-none ${item.isNewVendorFlag ? 'text-amber-800 bg-amber-50 border border-amber-250 py-0.5' : 'text-slate-400 hover:text-amber-700'}`}>
                                  ❓ Vendor Baru / Typo?
                                </span>
                              </label>
                            </td>

                            {/* PR & PO INPUT WITH AUTO PROPAGATE */}
                            <td className="p-2.5 space-y-1.5">
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-slate-500 font-extrabold min-w-[24px]">PR:</span>
                                <input
                                  type="text"
                                  value={item.prCode || ""}
                                  placeholder="2200..."
                                  onChange={(e) => updatePreviewItem(idx, { prCode: e.target.value })}
                                  className="w-24 border border-slate-200 hover:border-amber-400 focus:border-amber-600 rounded px-1 py-0.5 text-[10px] font-mono text-slate-700 bg-white focus:outline-none transition-colors"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-slate-500 font-extrabold min-w-[24px]">PO:</span>
                                <input
                                  type="text"
                                  value={item.poCode || ""}
                                  placeholder="5100..."
                                  onChange={(e) => updatePreviewItem(idx, { poCode: e.target.value })}
                                  className="w-24 border border-slate-200 hover:border-amber-400 focus:border-amber-600 rounded px-1 py-0.5 text-[10px] font-mono text-slate-700 bg-white focus:outline-none transition-colors"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-[#006A4E] font-extrabold min-w-[24px]">Plat:</span>
                                <input
                                  type="text"
                                  value={item.platNomor || ""}
                                  placeholder="H 8458 OC"
                                  onChange={(e) => updatePreviewItem(idx, { platNomor: e.target.value })}
                                  className="w-24 border border-emerald-300 bg-emerald-50/20 hover:border-emerald-500 rounded px-1 py-0.5 text-[10px] font-bold text-slate-800 bg-white focus:outline-none transition-colors uppercase"
                                />
                              </div>
                            </td>

                            {/* CATEGORY SELECTOR */}
                            <td className="p-2.5">
                              <select
                                value={item.category || "logam"}
                                onChange={(e) => {
                                  const cat = e.target.value;
                                  let defaults = {};
                                  if (cat === "logam") {
                                    defaults = { standardSource: "ASTM A403", standardName: "WP304L" };
                                  } else {
                                    defaults = { standardSource: "KSM INTERNAL", standardName: "STANDAR INTERNAL" };
                                  }
                                  updatePreviewItem(idx, { category: cat, ...defaults });
                                }}
                                className="border border-slate-200 hover:border-amber-400 focus:border-amber-600 rounded p-1 text-[10px] font-black text-slate-700 bg-white uppercase focus:outline-none"
                              >
                                <option value="logam">Logam</option>
                                <option value="karung">Karung</option>
                                <option value="benang">Benang</option>
                                <option value="kelistrikan">Kelistrikan</option>
                                <option value="Valve">Valve</option>
                                <option value="filter cloth">Filter Cloth</option>
                                <option value="rubber">Rubber</option>
                              </select>
                            </td>

                            {/* STANDARD ACUAN & GRADE ENTIRELY IMPLEMENTING REQUEST 3 */}
                            <td className="p-2.5 space-y-2 bg-slate-50/50">
                              {item.category === "karung" ? (
                                <div className="flex flex-col space-y-1">
                                  <span className="text-[8px] text-indigo-800 font-extrabold uppercase tracking-wider">Acuan Standard (Master DB)</span>
                                  <select
                                    value={item.standardName || ""}
                                    onChange={(e) => {
                                      const chosenName = e.target.value;
                                      const chosenStd = standards.find(s => s.category === "karung" && s.name === chosenName);
                                      if (chosenStd) {
                                        updatePreviewItem(idx, {
                                          standardName: chosenStd.name,
                                          standardSource: chosenStd.source || "KSM INTERNAL",
                                          itemName: chosenStd.defaultNamaKarung || chosenStd.name
                                        });
                                      }
                                    }}
                                    className="w-full border border-indigo-300 focus:border-indigo-600 rounded p-1.5 text-xs text-slate-800 bg-white font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-colors animate-fade-in"
                                  >
                                    <option value="">-- Pilih Acuan Karung Master --</option>
                                    {standards
                                      .filter(s => s.category === "karung")
                                      .map(s => (
                                        <option key={s.name} value={s.name}>
                                          {s.name}
                                        </option>
                                      ))
                                    }
                                  </select>
                                </div>
                              ) : item.category === "logam" ? (
                                <div className="space-y-1.5 animate-fade-in">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-amber-800 font-extrabold uppercase tracking-wider">Acu: Standard Reference</span>
                                    <select
                                      value={item.standardSource || ""}
                                      onChange={(e) => {
                                        const chosenSource = e.target.value;
                                        const matchingGrades = standards.filter(s => s.category === "logam" && s.source === chosenSource);
                                        updatePreviewItem(idx, {
                                          standardSource: chosenSource,
                                          standardName: matchingGrades.length > 0 ? matchingGrades[0].name : ""
                                        });
                                      }}
                                      className="w-full border border-slate-200 hover:border-amber-400 focus:border-amber-600 rounded px-1.5 py-1 text-xs text-slate-800 bg-white font-extrabold focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                                    >
                                      <option value="">-- Pilih Acuan Logam --</option>
                                      {Array.from(new Set(standards.filter(s => s.category === "logam").map(s => s.source))).sort().map(src => (
                                        <option key={src} value={src}>{src}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-emerald-800 font-extrabold uppercase tracking-wider">Grade: Metal Grade</span>
                                    <select
                                      value={item.standardName || ""}
                                      disabled={!item.standardSource}
                                      onChange={(e) => updatePreviewItem(idx, { standardName: e.target.value })}
                                      className="w-full border border-slate-200 hover:border-amber-400 focus:border-amber-600 rounded px-1.5 py-1 text-xs text-slate-800 bg-white font-black focus:outline-none focus:ring-1 focus:ring-amber-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                      <option value="">-- Pilih Grade Logam --</option>
                                      {standards
                                        .filter(s => s.category === "logam" && s.source === item.standardSource)
                                        .map(s => (
                                          <option key={s.name} value={s.name}>{s.name}</option>
                                        ))
                                      }
                                    </select>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  <span className="text-[8px] text-indigo-800 font-extrabold uppercase tracking-wider">Acuan Standard (KSM / PO)</span>
                                  <input
                                    type="text"
                                    value={item.standardName || ""}
                                    placeholder="Contoh: KSM-K10, API 598, SNI-09"
                                    onChange={(e) => updatePreviewItem(idx, { standardName: e.target.value, standardSource: "KSM INTERNAL" })}
                                    className="w-full border border-slate-200 hover:border-amber-400 focus:border-amber-600 rounded px-2 py-1 text-xs text-slate-800 bg-white font-black focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                                  />
                                </div>
                              )}
                            </td>

                            {/* QUANTITY INPUT */}
                            <td className="p-2.5 space-y-1">
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-slate-550 font-bold w-10">Total Qty:</span>
                                <input
                                  type="text"
                                  value={item.quantity || ""}
                                  placeholder="1 Pcs"
                                  onChange={(e) => updatePreviewItem(idx, { quantity: e.target.value })}
                                  className="w-20 border border-slate-200 hover:border-amber-400 focus:border-amber-600 rounded px-1.5 py-1 text-xs font-bold text-slate-800 bg-white focus:outline-none transition-colors"
                                />
                              </div>
                              {(item.category === "karung" || item.category === "benang") && (
                                <>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-amber-800 font-extrabold w-10">{item.category === "karung" ? "Ball" : "Box"}:</span>
                                    <input
                                      type="text"
                                      value={item.ballCount || ""}
                                      placeholder={item.category === "karung" ? "300" : "50 Box"}
                                      onChange={(e) => updatePreviewItem(idx, { ballCount: e.target.value })}
                                      className="w-20 border border-amber-200 bg-amber-50 hover:border-amber-450 rounded px-1.5 py-0.5 text-[10px] font-bold text-amber-950 focus:outline-none transition-colors"
                                    />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-amber-800 font-extrabold w-10">{item.category === "karung" ? "Lbr" : "Kg"}:</span>
                                    <input
                                      type="text"
                                      value={item.sheetCount || ""}
                                      placeholder={item.category === "karung" ? "150,000" : "1198.65" }
                                      onChange={(e) => updatePreviewItem(idx, { sheetCount: e.target.value })}
                                      className="w-20 border border-amber-200 bg-amber-50 hover:border-amber-450 rounded px-1.5 py-0.5 text-[10px] font-bold text-amber-950 focus:outline-none transition-colors"
                                    />
                                  </div>
                                </>
                              )}
                            </td>

                            {/* ROW DELETION */}
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setBatchPreviewItems(batchPreviewItems.filter((_, i) => i !== idx));
                                }}
                                className="text-red-500 font-bold text-xs hover:bg-red-50 hover:text-red-700 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

            </div>

            {/* List Registrations: Draft Status awaiting testing */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
                <Inbox className="w-5 h-5 text-slate-400" /> Daftar Draft Registrasi Masuk (Menunggu Uji)
              </h3>

              {/* Search draft */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-4">
                <div className="relative w-full sm:max-w-xs">
                  <input
                    type="text"
                    placeholder="Cari draft registrasi..."
                    value={draftSearch}
                    onChange={(e) => setDraftSearch(e.target.value)}
                    className="w-full pl-3.5 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/15 focus:border-slate-800 transition-all font-semibold text-slate-850"
                  />
                  {draftSearch && (
                    <button 
                      type="button" 
                      onClick={() => setDraftSearch("")} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-extrabold"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="text-slate-500 text-[10px] font-mono">
                  Menampilkan <strong>{getFilteredDrafts().length}</strong> dari {registrations.filter(r => r.status === "Draft").length} draft
                </div>
              </div>

              {/* Advanced multi-option filters panel */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 mb-4 space-y-3.5 text-xs animate-fade-in shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-250 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <span className="text-sm">🔍</span>
                    <span>Filter Data Tingkat Lanjut (Menunggu Uji)</span>
                  </div>
                  {(draftFilterCategory !== "All" || draftFilterVendor !== "All" || draftFilterStandard !== "All" || draftFilterDate !== "") && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftFilterCategory("All");
                        setDraftFilterVendor("All");
                        setDraftFilterStandard("All");
                        setDraftFilterDate("");
                      }}
                      className="text-indigo-650 hover:text-indigo-900 font-extrabold text-[11px] flex items-center gap-0.5 cursor-pointer hover:underline"
                    >
                      ✕ Reset Semua Filter
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                  {/* Category Filter */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold text-slate-600">Kategori</label>
                    <select
                      value={draftFilterCategory}
                      onChange={(e) => setDraftFilterCategory(e.target.value)}
                      className="w-full border border-slate-250 hover:border-slate-400 focus:border-slate-600 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 bg-white shadow-xs focus:ring-1 focus:ring-slate-500/20"
                    >
                      <option value="All">Semua Kategori</option>
                      {uniqueDraftCategories.map((cat: any) => (
                        <option key={cat} value={cat}>{String(cat).toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  {/* Vendor Filter */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold text-slate-600">Vendor</label>
                    <select
                      value={draftFilterVendor}
                      onChange={(e) => setDraftFilterVendor(e.target.value)}
                      className="w-full border border-slate-250 hover:border-slate-400 focus:border-slate-600 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 bg-white shadow-xs focus:ring-1 focus:ring-slate-500/20"
                    >
                      <option value="All">Semua Vendor</option>
                      {uniqueDraftVendors.map((v: any) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Standard Filter */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold text-slate-600">Acuan Standar</label>
                    <select
                      value={draftFilterStandard}
                      onChange={(e) => setDraftFilterStandard(e.target.value)}
                      className="w-full border border-slate-250 hover:border-slate-400 focus:border-slate-600 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 bg-white shadow-xs focus:ring-1 focus:ring-slate-500/20"
                    >
                      <option value="All">Semua Standar</option>
                      {uniqueDraftStandards.map((std: any) => (
                        <option key={std} value={std}>{std}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Filter & Date Type */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-extrabold text-slate-600">Filter Tanggal</label>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="draftDateType"
                            checked={draftFilterDateType === "diterima"}
                            onChange={() => setDraftFilterDateType("diterima")}
                            className="w-2.5 h-2.5 cursor-pointer text-indigo-600 rounded-full"
                          />
                          Diterima
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="draftDateType"
                            checked={draftFilterDateType === "ppj"}
                            onChange={() => setDraftFilterDateType("ppj")}
                            className="w-2.5 h-2.5 cursor-pointer text-indigo-600 rounded-full"
                          />
                          PPJ
                        </label>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <input
                        type="date"
                        value={draftFilterDate}
                        onChange={(e) => setDraftFilterDate(e.target.value)}
                        className="w-full border border-slate-250 hover:border-slate-400 focus:border-slate-600 rounded-lg px-2.5 py-1 text-slate-800 font-bold bg-white shadow-xs"
                      />
                      {draftFilterDate && (
                        <button
                          type="button"
                          onClick={() => setDraftFilterDate("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-700 font-extrabold text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Bulk actions panel for Draft registrations queue */}
              {selectedDraftRegs.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-indigo-50 to-indigo-100/50 border border-indigo-150 p-3.5 rounded-xl mb-4 text-xs">
                  <span className="font-black text-indigo-900">
                    📂 Aksi Bersama ({selectedDraftRegs.length} Draft Terpilih):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      askConfirmation(
                        `Kirimkan ${selectedDraftRegs.length} draft terpilih langsung ke antrean pengujian?`,
                        handleBulkSubmitDraftsToUji
                      );
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-lg shadow cursor-pointer transition-colors"
                  >
                    🚀 Ajukan Pengujian Mutu (Bulk)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      askConfirmation(
                        `Apakah Anda yakin ingin menghapus ${selectedDraftRegs.length} draft terpilih?`,
                        handleBulkDeleteDrafts
                      );
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-lg shadow cursor-pointer transition-colors"
                  >
                    🗑️ Hapus Permanen (Bulk)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDraftRegs([])}
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-3 py-2 rounded-lg cursor-pointer transition-colors"
                  >
                    Batal Centang
                  </button>
                </div>
              )}
              
              <div className="overflow-x-auto text-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-xs font-bold text-slate-500 uppercase bg-slate-50/50 select-none">
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedDraftRegs.length === getFilteredDrafts().length && getFilteredDrafts().length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDraftRegs(getFilteredDrafts().map(d => d.id));
                            } else {
                              setSelectedDraftRegs([]);
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortDraft("noReg")}>
                        No Reg {renderSortIndicator("noReg", draftSortKey, draftSortDir)}
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortDraft("ppjCode")}>
                        No PPJ {renderSortIndicator("ppjCode", draftSortKey, draftSortDir)}
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortDraft("itemName")}>
                        Nama Barang / Deskripsi {renderSortIndicator("itemName", draftSortKey, draftSortDir)}
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortDraft("poCode")}>
                        PO & PR {renderSortIndicator("poCode", draftSortKey, draftSortDir)}
                      </th>
                      <th className="p-3">Tanggal</th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortDraft("category")}>
                        Kategori & Standar {renderSortIndicator("category", draftSortKey, draftSortDir)}
                      </th>
                      <th className="p-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredDrafts().slice((draftPage - 1) * 10, draftPage * 10).map((reg) => (
                      <tr key={reg.id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedDraftRegs.includes(reg.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDraftRegs([...selectedDraftRegs, reg.id]);
                              } else {
                                setSelectedDraftRegs(selectedDraftRegs.filter(id => id !== reg.id));
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-850">#{reg.noReg}</td>
                        <td className="p-3 text-indigo-950 font-bold">{reg.ppjCode}</td>
                        <td className="p-3 max-w-[280px]">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1 bg-slate-50">
                            <span className="font-extrabold text-slate-900 uppercase leading-snug">{reg.itemName}</span>
                            
                            {reg.isNewVendorFlag && (
                              <span className="text-[8px] bg-amber-100 text-amber-800 border border-amber-300 font-extrabold px-1.5 py-0.5 rounded-md uppercase inline-flex items-center gap-0.5 shadow-sm">
                                ❓ Vendor Baru / Typo?
                              </span>
                            )}
                            {reg.platNomor && (
                              <span className="text-[8px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-black px-1.5 py-0.5 rounded-md inline-flex items-center shadow-sm">
                                🚗 {reg.platNomor}
                              </span>
                            )}
                            {(reg.ballCount || reg.sheetCount) && (
                              <span className="text-[8px] bg-indigo-100 text-indigo-800 border border-indigo-300 font-extrabold px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 shadow-sm">
                                📦 {reg.category === "karung" ? `Ball: ${reg.ballCount || 0}` : `Box: ${reg.ballCount || 0}`} | {reg.category === "karung" ? `Lbr: ${reg.sheetCount || 0}` : `Kg: ${reg.sheetCount || 0}`}
                              </span>
                            )}

                            {isLateProduct(reg) && (
                              <span className="text-[8px] bg-rose-100 text-rose-800 border border-rose-200 font-extrabold px-1.5 py-0.5 rounded-full uppercase inline-flex items-center gap-0.5 shadow-sm">
                                <span>⏳</span> Telat Review/Uji &gt; 2 Hari
                              </span>
                            )}
                          </div>
                          
                          {reg.description && (
                            <div className="text-[10px] text-slate-550 font-semibold bg-emerald-50/40 text-slate-700 px-2.5 py-1.5 rounded-lg border border-emerald-100 mt-1.5 whitespace-pre-wrap max-h-24 overflow-y-auto leading-relaxed">
                              {reg.description}
                            </div>
                          )}

                          {reg.reviewerComments && (
                            <div className="bg-amber-50 border border-amber-250 rounded-xl px-3 py-2 text-[10px] text-amber-900 mt-2 space-y-1 shadow-sm leading-normal">
                              <div className="flex items-center gap-1 font-extrabold uppercase text-amber-800 tracking-wider text-[8px]">
                                <span>🚨</span> PERLU REVISI / PERBAIKAN:
                              </div>
                              <div className="font-semibold text-slate-750 italic bg-white/80 p-1.5 rounded border border-amber-100 font-sans">
                                &ldquo;{reg.reviewerComments}&rdquo;
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-xs leading-normal font-semibold">
                          <div className="text-slate-800"><span className="text-slate-400 font-bold">PO:</span> {reg.poCode}</div>
                          <div className="text-slate-500"><span className="text-slate-400 font-bold">PR:</span> {reg.prCode}</div>
                        </td>
                        <td className="p-3 text-[11px] leading-relaxed font-semibold">
                          <div className="text-slate-800"><span className="text-slate-400 font-bold">PPJ:</span> {reg.tanggalPPJ ? new Date(reg.tanggalPPJ).toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric"}) : "-"}</div>
                          <div className="text-slate-500"><span className="text-slate-400 font-bold">Received:</span> {reg.tanggalDiterima ? new Date(reg.tanggalDiterima).toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric"}) : "-"}</div>
                        </td>
                        <td className="p-3">
                          <span className="bg-indigo-50 text-indigo-950 font-black text-[10px] uppercase border border-indigo-150 px-2 py-0.5 rounded mr-1">
                            {reg.category}
                          </span>
                          <span className="text-[11px] text-slate-750 font-bold block mt-1">{reg.standardName}</span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2 text-xs">
                            
                            {/* edit button for typos - Requirement 6 */}
                            {canUji && (
                              <button
                                onClick={() => openEditRegistrationModal(reg)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-2.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer border border-slate-200"
                                title="Ubah draf jika ada salah ketik"
                              >
                                Edit
                              </button>
                            )}

                            {/* delete button for redundant/incorrect entries - Requirement 6 */}
                            {canUji && (
                              <button
                                onClick={() => {
                                  askConfirmation(
                                    "Apakah Anda yakin ingin menghapus draft registrasi ini dari antrean?",
                                    () => handleDeleteRegistration(reg.id)
                                  );
                                }}
                                className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-1.5 px-2.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer border border-red-200"
                                title="Hapus draf salah input"
                              >
                                Hapus
                              </button>
                            )}

                            {canUji ? (
                              <button
                                onClick={() => {
                                  startEnteringTesting(reg);
                                  setActiveTab("uji");
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer shadow-sm hover:shadow"
                              >
                                Uji Mutu <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 italic font-medium">Penguji Only</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {registrations.filter(r => r.status === "Draft").length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-10 text-center text-slate-400 italic font-medium">
                          Hari ini tertib. Antrean draft registrasi pengujian kosong.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <PaginationControl
                currentPage={draftPage}
                totalItems={getFilteredDrafts().length}
                pageSize={10}
                onPageChange={(page) => setDraftPage(page)}
              />
            </div>
          </div>
        )}

        {/* 2. TAB UTAMA INPUT HASIL UJI */}
        {activeTab === "uji" && (
          <div className="space-y-6">
            {activeTesting ? (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6 animate-fade-in">
                <div className="border-b pb-4 flex justify-between items-start gap-3 flex-wrap">
                  <div>
                    <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-indigo-200">
                      {activeTesting.category}
                    </span>
                    <h3 className="font-extrabold text-slate-950 mt-1 uppercase text-lg">{activeTesting.itemName}</h3>
                    <p className="text-xs text-slate-500">
                      No PPJ: {activeTesting.ppjCode} | Standard: {activeTesting.standardName} ({activeTesting.standardSource || "KSM"})
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      if (activeTesting) {
                        setImportedCsvRows(prev => prev.map(r => r.usedForRegistrationId && r.usedForRegistrationId.startsWith(activeTesting.id) ? { ...r, usedForRegistrationId: undefined } : r));
                      }
                      setActiveTesting(null);
                    }}
                    className="text-xs bg-slate-100 border text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-all font-semibold cursor-pointer"
                  >
                    Batal Uji
                  </button>
                </div>

                {/* Point Uji Form and PMI Auto-fill */}
                <div className={`space-y-6 ${activeTesting.category === "karung" ? "w-full max-w-none" : "max-w-xl"}`}>
                  
                  {/* Equipment Checklist Section - Requirement 7 */}
                  <div className="bg-slate-50 border p-5 rounded-2xl space-y-3">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1">
                      <span>🛠️</span> Alat Uji Laboratorium Yang Digunakan <span className="text-red-500">*</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">Tiap jenis pengujian wajib mencentang minimal 1 alat ukur.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                       {(CATEGORY_EQUIPMENT[activeTesting.category] || []).map(tool => {
                        const isChecked = testingSelectedTools.includes(tool);
                        return (
                          <label key={tool} className={`flex items-start gap-2.5 p-2 border rounded-xl cursor-pointer transition-all ${
                            isChecked ? "bg-indigo-50 border-indigo-300 text-indigo-950 font-bold animate-pulse" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                          } text-xs`}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setTestingSelectedTools(testingSelectedTools.filter(t => t !== tool));
                                } else {
                                  setTestingSelectedTools([...testingSelectedTools, tool]);
                                }
                              }}
                              className="mt-0.5 rounded text-indigo-650 focus:ring-indigo-550 border-slate-300 cursor-pointer"
                            />
                            <span>{tool}</span>
                          </label>
                        );
                      })}
                      {(CATEGORY_EQUIPMENT[activeTesting.category] || []).length === 0 && (
                        <p className="text-xs text-slate-400 italic">No equipment listed for this category.</p>
                      )}
                    </div>
                  </div>

                  {/* PMI AUTOMATIC FILL FROM WORK BOOK CSV */}
                  {activeTesting.category === "logam" && (
                    <div className="space-y-3">
                      {(() => {
                        const targetMappingId = `${activeTesting.id}_pt${testingPointIndex}`;
                        const mappedRow = importedCsvRows.find(r => r.usedForRegistrationId === targetMappingId);
                        
                        // Auto-matching suggestions
                        const suggestedRows = importedCsvRows.filter(r => {
                          if (r.usedForRegistrationId) return false;
                          const itemNameDigits = activeTesting.itemName.replace(/\D/g, "");
                          const ppjDigits = activeTesting.ppjCode.replace(/\D/g, "");
                          const sampleDigits = r.sample.replace(/\D/g, "");
                          return (
                            (sampleDigits && itemNameDigits && itemNameDigits.includes(sampleDigits)) ||
                            (sampleDigits && ppjDigits && ppjDigits.includes(sampleDigits)) ||
                            activeTesting.itemName.toLowerCase().includes(r.sample.toLowerCase()) ||
                            r.sample.toLowerCase().includes(activeTesting.ppjCode.toLowerCase())
                          );
                        });

                        if (mappedRow) {
                          return (
                            <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl text-xs space-y-2 flex justify-between items-center gap-4">
                              <div>
                                <p className="font-bold text-emerald-950 flex items-center gap-1">
                                  <span>⚡</span> Terhubung data PMI Terimpor
                                </p>
                                <p className="text-[11px] text-emerald-700 leading-tight">
                                  Hasil uji pada titik ini diisi otomatis dari Sample: <strong className="font-bold">{mappedRow.sample} ({mappedRow.match})</strong>. Desimal dibulatkan maks 2 angka di belakang koma.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCancelMappedSpectrometer(mappedRow)}
                                className="text-amber-800 hover:text-amber-950 font-bold hover:underline shrink-0 text-[11px] bg-white border px-2.5 py-1.5 rounded-lg shadow-sm cursor-pointer"
                              >
                                Batalkan Hubungan
                              </button>
                            </div>
                          );
                        }

                        if (importedCsvRows.length === 0) {
                          return (
                            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs space-y-1.5 animate-fade-in text-slate-655 font-medium">
                              <p className="font-extrabold text-slate-800 flex items-center gap-1">
                                <span>📥</span> Pengisian Uji Otomatis (Logam/PMI)
                              </p>
                              <p className="text-[10px] text-slate-500 leading-normal">
                                Database Spektrometer kosong. Anda bisa mengunggah file hasil uji Excel/CSV Spektrometer langsung pada panel bagian atas antrean tunggu uji kapankah saja.
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="bg-slate-50 border p-4 rounded-xl space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1">
                                <span>📥</span> Pilih Baris Database Hasil PMI Terimpor
                              </h4>
                              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded">
                                {importedCsvRows.filter(r => !r.usedForRegistrationId).length} Terimpor Tersedia
                              </span>
                            </div>

                            {suggestedRows.length > 0 && (
                              <div className="space-y-1.5 p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                                <p className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider">🎯 Baris PMI yang Cocok (Saran):</p>
                                <div className="space-y-1.5">
                                  {suggestedRows.map(row => (
                                    <div key={row.id} className="flex justify-between items-center bg-white border border-emerald-200 p-2 rounded-lg text-[11px] gap-2 shadow-sm">
                                      <div className="truncate">
                                        <span className="font-extrabold text-slate-900 bg-emerald-100 text-emerald-850 px-1.5 py-0.5 rounded border border-emerald-250 mr-1.5 text-[10px]">Sample {row.sample}</span>
                                        <span className="text-slate-655 font-bold">{row.match}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleSelectCsvRowForTesting(row);
                                        }}
                                        className="bg-[#006A4E] hover:bg-emerald-800 text-white font-bold text-[10px] px-3 py-1.5 rounded cursor-pointer transition-all shrink-0"
                                      >
                                        Otomatis Isikan
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="space-y-2">
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Cari nomor sample dalam file (mis: 1612 atau SS-304)..."
                                  value={activeCsvSearch}
                                  onChange={(e) => setActiveCsvSearch(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                                />
                                {activeCsvSearch && (
                                  <button
                                    type="button"
                                    onClick={() => setActiveCsvSearch("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>

                              <div className="max-h-[140px] overflow-y-auto border border-slate-100 rounded-lg bg-white p-1 text-[11px] space-y-1">
                                {importedCsvRows
                                  .filter(r => !r.usedForRegistrationId)
                                  .filter(r => {
                                    if (!activeCsvSearch.trim()) return true;
                                    const q = activeCsvSearch.toLowerCase();
                                    return r.sample.toLowerCase().includes(q) || r.match.toLowerCase().includes(q);
                                  })
                                  .slice(0, 10)
                                  .map(row => (
                                    <div key={row.id} className="flex justify-between items-center hover:bg-slate-50 p-2 rounded border border-slate-100 gap-2">
                                      <div className="flex flex-col truncate">
                                        <span className="font-extrabold text-slate-800">Sample {row.sample} ({row.match || "Tanpa Paduan"})</span>
                                        <span className="text-[10px] text-slate-450 truncate font-mono">
                                          {Object.entries(row.values).filter(([_,v])=>!!v).map(([k,v])=>`${k}:${formatToMaxTwoDecimals(v as string)}`).join(", ")}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleSelectCsvRowForTesting(row);
                                        }}
                                        className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-[9px] px-2 py-1 rounded transition-all cursor-pointer shrink-0"
                                      >
                                        Isikan
                                      </button>
                                    </div>
                                  ))}
                                {importedCsvRows.filter(r => !r.usedForRegistrationId).length === 0 && (
                                  <p className="text-center text-slate-400 italic py-4">Semua baris CSV sudah digunakan atau database kosong.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {activeTesting.category === "karung" || activeTesting.category === "filter cloth" ? (
                    <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <h4 className="font-extrabold text-[#006A4E] text-sm flex items-center gap-1.5">
                          <span>📋</span> Mode Pengisian Tabular {activeTesting.category === "filter cloth" ? "Filter Cloth" : "Karung"} Cepat
                        </h4>
                        <p className="text-xs text-emerald-800 font-semibold">Seluruh {testingPointsCount} titik perulangan (trial) ditampilkan di halaman ini sebagai baris tabel.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeTesting.category === "karung" && (
                          <button
                            type="button"
                            onClick={handleAutoGenerateKarungGrid}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1 border border-emerald-700 animate-pulse"
                            title="Generate otomatis seluruh nilai tabel uji karung dalam batas spesifikasi standar (ON SPEC)"
                          >
                            🧪 Simulasi Nilai OK
                          </button>
                        )}
                        <span className="bg-[#006A4E] text-white font-extrabold text-xs px-2.5 py-1.5 rounded shadow-sm shrink-0">
                          Total {testingPointsCount} Trials
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-slate-50 border p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">
                            {activeTesting.category === "Valve" ? "Pengukuran Lot Valve Terpadu" : `Pengukuran Titik ${testingPointIndex} dari total ${testingPointsCount} titik`}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {activeTesting.category === "Valve" ? "Input foto-foto bukti uji manometer, lot, pengetesan valve & kesimpulan." : "Pastikan alat uji terkalibrasi sebelum menginput angka."}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.55 shrink-0">
                          <span className="bg-indigo-650 text-white font-extrabold text-xs px-2.5 py-1.5 rounded font-mono">
                            {activeTesting.category === "Valve" ? "Integrated Test" : `Titik Ke-${testingPointIndex}`}
                          </span>
                        </div>
                      </div>

                      {/* Point identification details & custom standard overriding components - Finding 2 & 3 */}
                      {activeTesting.category !== "Valve" && (
                        <div className="bg-amber-50/15 border border-amber-205 p-4 rounded-xl space-y-3.5 shadow-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-mono text-sm">📍</span>
                            <div>
                              <h5 className="font-extrabold text-slate-700 text-xs uppercase tracking-wide leading-none mb-1">Identifikasi Komponen & Standard Material Khusus</h5>
                              <p className="text-[10px] text-slate-450 leading-tight">Gunakan bagian ini jika barang uji memiliki beberapa komponen terpisah dengan acuan material/grade yang berbeda (misal: Body Valve beda grade dengan Disc Valve). Batas spesifikasi pada titik ini akan otomatis dievaluasi mengikuti standar komponen pilihan Anda.</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {/* Keterangan / Lokasi Titik Uji - Finding 2 */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-slate-600 block uppercase">Keterangan / Lokasi Bagian Komponen</label>
                              <input
                                type="text"
                                value={pointKeterangan}
                                onChange={(e) => setPointKeterangan(e.target.value)}
                                placeholder="mis: Valve Body, Valve Disc, Gasket, Pin Conveyor, dll"
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-800 font-semibold"
                              />
                            </div>
                            
                            {/* Standard Overriding Selection - Finding 3 */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-extrabold text-slate-600 block uppercase">⚖️ Acuan Standard Material Khusus Komponen Ini</label>
                              <select
                                value={pointOverrideStandardId}
                                onChange={(e) => {
                                  const stdId = e.target.value;
                                  setPointOverrideStandardId(stdId);
                                  if (stdId) {
                                    const selectedStd = standards.find(s => s.id === stdId);
                                    if (selectedStd) {
                                      const nextValues = { ...testingValues };
                                      selectedStd.parameters.forEach(p => {
                                        if (nextValues[p.name] === undefined) {
                                          nextValues[p.name] = "";
                                        }
                                      });
                                      setTestingValues(nextValues);
                                    }
                                  }
                                }}
                                className="w-full text-xs p-2 bg-white border border-slate-250 rounded focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-800 font-bold"
                              >
                                <option value="">Sesuai Standar Utama Barang ({activeTesting.standardName})</option>
                                {standards
                                  .filter(s => s.category === activeTesting.category && s.name.toLowerCase() !== activeTesting.standardName.toLowerCase())
                                  .map(s => (
                                    <option key={s.id} value={s.id}>
                                      Acuan Part: {s.name} ({s.source})
                                    </option>
                                  ))
                                }
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTesting.category === "karung" ? (
                    <div className="space-y-6 w-full animate-fade-in overflow-x-auto">
                      {/* TABLE 1: KANTONG LUAR */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-center bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-150">
                          <div>
                            <h4 className="font-extrabold text-[#006A4E] text-xs uppercase tracking-wide">📦 BAGIAN I: KANTONG LUAR (OUTER BAG)</h4>
                            <p className="text-[10px] text-emerald-850 font-medium">Input hasil uji perulangan (trial) karung bagian luar. Tekan Tab untuk berpindah kolom cepat.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newCount = testingPointsCount + 1;
                              setTestingPointsCount(newCount);
                              setKarungGrid(prev => {
                                const next = { ...prev };
                                next[newCount] = {};
                                const std = activeTestingStandard;
                                const allParams = std ? [...std.parameters] : [];
                                customtestingParams.forEach(cp => allParams.push(cp));
                                allParams.forEach(p => {
                                  next[newCount][p.name] = "";
                                });
                                return next;
                              });
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1 border border-amber-700"
                            title="Klik untuk menambah baris pengulangan uji (trial)"
                          >
                            <span>➕</span> Tambah Titik Uji (Trial/Baris)
                          </button>
                        </div>

                        <div className="overflow-x-auto max-w-full">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b bg-slate-100 text-slate-800 font-bold">
                                <th className="p-2 border font-mono w-28">Titik Uji</th>
                                {(() => {
                                  const std = activeTestingStandard;
                                  const allParams = std ? [...std.parameters] : [];
                                  customtestingParams.forEach(cp => allParams.push(cp));
                                  const kantongLuarParams = allParams.filter(p => {
                                    const n = p.name.toLowerCase();
                                    return !n.includes("dalam") && !n.includes("lekat");
                                  });
                                  return kantongLuarParams.map(p => (
                                    <th key={p.name} className="p-2 border text-[10px] uppercase min-w-[120px] text-slate-700" title={`Spec: ${p.spec || '-'}`}>
                                      <div>{p.name}</div>
                                      {p.spec && <div className="text-[9px] text-[#006A4E] font-normal normal-case">({p.spec})</div>}
                                    </th>
                                  ));
                                })()}
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: testingPointsCount }, (_, i) => {
                                const rowIdx = i + 1;
                                const std = activeTestingStandard;
                                const allParams = std ? [...std.parameters] : [];
                                customtestingParams.forEach(cp => allParams.push(cp));
                                const kantongLuarParams = allParams.filter(p => {
                                  const n = p.name.toLowerCase();
                                  return !n.includes("dalam") && !n.includes("lekat");
                                });
                                return (
                                  <tr key={rowIdx} className="hover:bg-slate-50/50 border-b">
                                    <td className="p-2 border font-extrabold text-[#006A4E] bg-slate-50/50">Titik #{rowIdx}</td>
                                    {kantongLuarParams.map(p => {
                                      const cellVal = karungGrid[rowIdx]?.[p.name] || "";
                                      return (
                                        <td key={p.name} className="p-1 border text-xs">
                                          <input
                                            type="text"
                                            value={cellVal}
                                            placeholder={p.unit || "-"}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setKarungGrid(prev => ({
                                                ...prev,
                                                [rowIdx]: {
                                                  ...(prev[rowIdx] || {}),
                                                  [p.name]: val
                                                }
                                              }));
                                            }}
                                            className={`w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-emerald-500 bg-white font-medium ${
                                              cellVal.endsWith("*") ? "bg-amber-50 text-[#9E2A2B] border-amber-300 font-bold" : "text-slate-800 border-slate-250"
                                            }`}
                                          />
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* TABLE 2: KANTONG DALAM */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 mt-4">
                        <div className="bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-150">
                          <h4 className="font-extrabold text-indigo-955 text-xs uppercase tracking-wide">🛡️ BAGIAN II: KANTONG DALAM (INNER BAG)</h4>
                          <p className="text-[10px] text-indigo-700 font-medium">Input hasil uji perulangan (trial) karung bagian dalam & lekat. Tekan Tab untuk berpindah kolom cepat.</p>
                        </div>

                        <div className="overflow-x-auto max-w-full">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b bg-slate-100 text-slate-800 font-bold">
                                <th className="p-2 border font-mono w-28">Titik Uji</th>
                                {(() => {
                                  const std = activeTestingStandard;
                                  const allParams = std ? [...std.parameters] : [];
                                  customtestingParams.forEach(cp => allParams.push(cp));
                                  const kantongDalamParams = allParams.filter(p => {
                                    const n = p.name.toLowerCase();
                                    return n.includes("dalam") || n.includes("lekat");
                                  });
                                  return kantongDalamParams.map(p => (
                                    <th key={p.name} className="p-2 border text-[10px] uppercase min-w-[120px] text-slate-700" title={`Spec: ${p.spec || '-'}`}>
                                      <div>{p.name}</div>
                                      {p.spec && <div className="text-[9px] text-[#006A4E] font-normal normal-case">({p.spec})</div>}
                                    </th>
                                  ));
                                })()}
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: testingPointsCount }, (_, i) => {
                                const rowIdx = i + 1;
                                const std = activeTestingStandard;
                                const allParams = std ? [...std.parameters] : [];
                                customtestingParams.forEach(cp => allParams.push(cp));
                                const kantongDalamParams = allParams.filter(p => {
                                  const n = p.name.toLowerCase();
                                  return n.includes("dalam") || n.includes("lekat");
                                });
                                return (
                                  <tr key={rowIdx} className="hover:bg-slate-50/50 border-b">
                                    <td className="p-2 border font-extrabold text-indigo-955 bg-slate-50/50">Titik #{rowIdx}</td>
                                    {kantongDalamParams.map(p => {
                                      const cellVal = karungGrid[rowIdx]?.[p.name] || "";
                                      return (
                                        <td key={p.name} className="p-1 border text-xs">
                                          <input
                                            type="text"
                                            value={cellVal}
                                            placeholder={p.unit || "-"}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              setKarungGrid(prev => ({
                                                ...prev,
                                                [rowIdx]: {
                                                  ...(prev[rowIdx] || {}),
                                                  [p.name]: val
                                                }
                                              }));
                                            }}
                                            className={`w-full px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-emerald-500 bg-white font-medium ${
                                              cellVal.endsWith("*") ? "bg-amber-50 text-[#9E2A2B] border-amber-300 font-bold" : "text-slate-800 border-slate-250"
                                            }`}
                                          />
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : activeTesting.category === "filter cloth" ? (
                    <div className="space-y-6 animate-fade-in">
                      {/* SPECIFICATION OVERRIDE SECTION */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">📊</span>
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Sesuaikan Batas Spesifikasi untuk PO ini</h4>
                            <p className="text-[10px] text-slate-450 leading-tight">Ubah kisaran Air Permeability acuan sesuai surat pesanan pembelian (PO) pabrik.</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block uppercase">Batas Minimum Uji (Min Spec)</label>
                            <input
                              type="text"
                              value={(() => {
                                const raw = activeTestingStandard?.parameters.find(p => p.name === "Air Permeability")?.spec || "";
                                return raw.split(" - ")[0] || "";
                              })()}
                              onChange={(e) => {
                                const val = e.target.value;
                                setStandards(prev => prev.map(s => {
                                  if (s.name === activeTestingStandard?.name) {
                                    const oldSpec = s.parameters.find(p => p.name === "Air Permeability")?.spec || "";
                                    const oldParts = oldSpec.split(" - ");
                                    const maxVal = oldParts[1] || "";
                                    const newSpecCombined = val || maxVal ? `${val} - ${maxVal}` : "";
                                    return {
                                      ...s,
                                      parameters: s.parameters.map(p => p.name === "Air Permeability" ? { ...p, spec: newSpecCombined } : p)
                                    };
                                  }
                                  return s;
                                }));
                              }}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block uppercase">Batas Maksimum Uji (Max Spec)</label>
                            <input
                              type="text"
                              value={(() => {
                                const raw = activeTestingStandard?.parameters.find(p => p.name === "Air Permeability")?.spec || "";
                                return raw.split(" - ")[1] || "";
                              })()}
                              onChange={(e) => {
                                const val = e.target.value;
                                setStandards(prev => prev.map(s => {
                                  if (s.name === activeTestingStandard?.name) {
                                    const oldSpec = s.parameters.find(p => p.name === "Air Permeability")?.spec || "";
                                    const oldParts = oldSpec.split(" - ");
                                    const minVal = oldParts[0] || "";
                                    const newSpecCombined = minVal || val ? `${minVal} - ${val}` : "";
                                    return {
                                      ...s,
                                      parameters: s.parameters.map(p => p.name === "Air Permeability" ? { ...p, spec: newSpecCombined } : p)
                                    };
                                  }
                                  return s;
                                }));
                              }}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                            />
                          </div>
                        </div>
                      </div>

                      {/* DATA TRIAL TABULAR GRID */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-4">
                        <div className="flex justify-between items-center bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-150 flex-wrap gap-2">
                          <div>
                            <h4 className="font-extrabold text-indigo-950 text-xs uppercase tracking-wide">🔬 DATA PERULANGAN TRIAL (Minimal 5 Perulangan)</h4>
                            <p className="text-[10px] text-indigo-700 font-medium">Input hasil uji Air Permeability (cc/cm2/s) pada 12.7 mmH2O.</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                const newCount = testingPointsCount + 1;
                                setTestingPointsCount(newCount);
                                setKarungGrid(prev => {
                                  const next = { ...prev };
                                  next[newCount] = {};
                                  const std = activeTestingStandard;
                                  const allParams = std ? [...std.parameters] : [];
                                  customtestingParams.forEach(cp => allParams.push(cp));
                                  allParams.forEach(p => {
                                    next[newCount][p.name] = "";
                                  });
                                  return next;
                                });
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1 border border-indigo-700"
                              title="Klik untuk menambah baris pengulangan uji (trial)"
                            >
                              <span>➕</span> Tambah Titik Uji (Trial/Baris)
                            </button>
                            <div className="flex bg-white border border-indigo-250 rounded-lg px-3 py-1.5 text-xs">
                            <span className="font-black text-indigo-900 flex items-center gap-1.5 font-mono">
                              <span>📊</span> Live Average: {(() => {
                                let sum = 0;
                                let count = 0;
                                for (let t = 1; t <= testingPointsCount; t++) {
                                  const v = parseFloat(karungGrid[t]?.["Air Permeability"] || "");
                                  if (!isNaN(v)) { sum += v; count++; }
                                }
                                return count > 0 ? (sum / count).toFixed(2) : "0.00";
                              })()} cc/cm²/s
                            </span>
                          </div>
                        </div>
                        </div>

                        <div className="overflow-x-auto max-w-full">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b bg-slate-100 text-slate-800 font-bold">
                                <th className="p-2 border font-mono w-40">Uji Trial</th>
                                <th className="p-2 border text-[10px] uppercase text-slate-700">
                                  Air Permeability (cc/cm²/s) pada 12.7 mmH2O
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: testingPointsCount }, (_, i) => {
                                const rowIdx = i + 1;
                                const cellVal = karungGrid[rowIdx]?.["Air Permeability"] || "";
                                return (
                                  <tr key={rowIdx} className="hover:bg-slate-50/55 border-b">
                                    <td className="p-2 border font-extrabold text-[#006A4E] bg-slate-50/50">Perulangan #{rowIdx}</td>
                                    <td className="p-2 border text-xs">
                                      <input
                                        type="text"
                                        value={cellVal}
                                        placeholder="cc/cm2/s"
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setKarungGrid(prev => ({
                                            ...prev,
                                            [rowIdx]: {
                                              ...(prev[rowIdx] || {}),
                                              "Air Permeability": val
                                            }
                                          }));
                                        }}
                                        className={`w-full px-3 py-2 text-xs border rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white font-medium ${
                                          cellVal.endsWith("*") ? "bg-amber-50 text-[#9E2A2B] border-amber-300 font-bold font-mono" : "text-slate-800 border-slate-250 font-mono"
                                        }`}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : activeTesting.category === "rubber" ? (
                    <div className="space-y-6 animate-fade-in">
                      {/* SPECIFICATION OVERRIDE SECTION */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🔩</span>
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Sesuaikan Batas Spesifikasi Shore A & Shore D</h4>
                            <p className="text-[10px] text-slate-450 leading-tight">Ubah nilai rentang spesifikasi target PO untuk Shore A dan Shore D.</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block uppercase">Batas Spec Shore A (PO Target)</label>
                            <input
                              type="text"
                              value={activeTestingStandard?.parameters.find(p => {
                                const n = p.name.toLowerCase(); return n.includes("hardness") || n.includes("shore a");
                              })?.spec || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setStandards(prev => prev.map(s => {
                                  if (s.name === activeTestingStandard?.name) {
                                    return {
                                      ...s,
                                      parameters: s.parameters.map(p => {
                                        const n = p.name.toLowerCase();
                                        return (n.includes("hardness") || n.includes("shore a")) ? { ...p, name: "Shore A", spec: val } : p;
                                      })
                                    };
                                  }
                                  return s;
                                }));
                              }}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border rounded text-slate-800 font-medium"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-600 block uppercase">Batas Spec Shore D (PO Target)</label>
                            <input
                              type="text"
                              value={(() => {
                                const param = activeTestingStandard?.parameters.find(p => p.name === "Shore D");
                                return param ? param.spec : "";
                              })()}
                              onChange={(e) => {
                                const val = e.target.value;
                                setStandards(prev => prev.map(s => {
                                  if (s.name === activeTestingStandard?.name) {
                                    const hasShoreD = s.parameters.some(p => p.name === "Shore D");
                                    if (hasShoreD) {
                                      return {
                                        ...s,
                                        parameters: s.parameters.map(p => p.name === "Shore D" ? { ...p, spec: val } : p)
                                      };
                                    } else {
                                      return {
                                        ...s,
                                        parameters: [...s.parameters, { name: "Shore D", unit: "Shore D", spec: val }]
                                      };
                                    }
                                  }
                                  return s;
                                }));
                              }}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border rounded text-slate-800 font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      {/* PHYSICAL MEASUREMENTS INPUTS */}
                      <div className="bg-white border border-slate-250 p-5 rounded-2xl shadow-sm space-y-4">
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <span>🧪</span> Hasil Pengujian Karakteristik Fisik Rubber
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 block uppercase">SHORE A HARDNESS</label>
                            <input
                              type="text"
                              placeholder="Ketik angka hasil ukur, mis: 65"
                              value={testingValues["Hardness"] || testingValues["Shore A"] || ""}
                              onChange={(e) => setTestingValues({ 
                                ...testingValues, 
                                "Hardness": e.target.value,
                                "Shore A": e.target.value
                              })}
                              className="w-full px-3 py-2 border rounded-lg text-xs bg-white text-slate-800 focus:outline-[#006A4E] font-medium"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 block uppercase">SHORE D HARDNESS</label>
                            <input
                              type="text"
                              placeholder="Ketik angka hasil ukur, mis: 72"
                              value={testingValues["Shore D"] || ""}
                              onChange={(e) => setTestingValues({ ...testingValues, "Shore D": e.target.value })}
                              className="w-full px-3 py-2 border rounded-lg text-xs bg-white text-slate-800 focus:outline-[#006A4E] font-medium"
                            />
                          </div>
                        </div>

                        <div className="space-y-1 pt-2">
                          <label className="text-xs font-bold text-slate-700 block uppercase flex items-center gap-1">
                            <span>🔥</span> Ketahanan Panas pada Temperature 200 °C (PO Standar)
                          </label>
                          <select
                            value={testingValues["Ketahanan Panas"] || "Tahan/Tidak Rusak"}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Appending asterisks if selecting "Tidak Tahan / Rusak" to flag off spec automatically!
                              const dbVal = val.toLowerCase().includes("tidak") ? "Tidak Tahan/Rusak*" : "Tahan/Tidak Rusak";
                              setTestingValues({
                                ...testingValues,
                                "Ketahanan Panas": dbVal
                              });
                            }}
                            className={`w-full px-3 py-2.5 border rounded-lg text-xs bg-white font-extrabold focus:outline-emerald-600 ${
                              (testingValues["Ketahanan Panas"] || "").includes("*") 
                                ? "text-red-700 border-red-300 bg-red-50/50" 
                                : "text-emerald-700 border-slate-200"
                            }`}
                          >
                            <option value="Tahan/Tidak Rusak">🟢 Tahan / Tidak Rusak (ON SPEC)</option>
                            <option value="Tidak Tahan/Rusak">🔴 Tidak Tahan / Rusak (DEV-SPEC/OFF SPEC)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : activeTesting.category === "benang" ? (
                    <div className="space-y-6 animate-fade-in">
                      <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-4">
                        <div className="flex gap-2 items-center text-slate-800 border-b pb-3">
                          <span className="text-xl">🧵</span>
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Pengukuran Benang Pengikat (Formula Otomatis)</h4>
                            <p className="text-[10px] text-slate-450 leading-tight">Cukup masukkan nilai berat sample & kuat tarik, rumus Tenacity & Nomor Pita dihitung instan.</p>
                          </div>
                        </div>

                        {/* INPUT FIELDS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-indigo-900 block uppercase flex items-center gap-1">
                              <span>⚖️</span> Berat Sample Per 9m (Gram)
                            </label>
                            <input
                              type="text"
                              placeholder="Masukkan berat, mis: 1.28"
                              value={testingValues["Weight"] || testingValues["Berat/9m"] || ""}
                              onChange={(e) => handleBenangChange(
                                testingValues["Weight"] !== undefined ? "Weight" : "Berat/9m", 
                                e.target.value
                              )}
                              className="w-full px-3 py-2.5 border border-slate-250 rounded-lg text-xs font-bold font-mono text-slate-800"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-indigo-900 block uppercase flex items-center gap-1">
                              <span>💪</span> Kuat Tarik (kgf) [Spec Min 6.8]
                            </label>
                            <input
                              type="text"
                              placeholder="Masukkan Kuat Tarik, mis: 7.15"
                              value={testingValues["Tensile Strength"] || testingValues["Kuat Tarik"] || ""}
                              onChange={(e) => handleBenangChange(
                                testingValues["Tensile Strength"] !== undefined ? "Tensile Strength" : "Kuat Tarik", 
                                e.target.value
                              )}
                              className="w-full px-3 py-2.5 border border-slate-250 rounded-lg text-xs font-bold font-mono text-slate-800"
                            />
                          </div>
                        </div>

                        {/* LIVE AUTOMATIC COMPUTATION RESULTS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-2 text-center shadow-inner relative overflow-hidden">
                            <span className="absolute top-2 right-2 text-[10px] bg-indigo-200 text-indigo-800 font-extrabold px-1.5 py-0.5 rounded">AUTO</span>
                            <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest leading-none">Nomor Pita (denier)</p>
                            <p className="text-2xl font-black text-indigo-900 font-mono tracking-tight">{testingValues["Nomor Pita"] || "0.0"}</p>
                            <div className="text-[9px] font-bold text-slate-500 flex justify-center gap-1">
                              <span>Batas Spec: 1250 - 1300</span>
                              {(() => {
                                const val = parseFloat(testingValues["Nomor Pita"] || "0");
                                if (val === 0) return null;
                                const isOk = val >= 1250 && val <= 1300;
                                return isOk 
                                  ? <span className="text-emerald-700 bg-emerald-150 px-1 rounded font-black">✓ OK</span>
                                  : <span className="text-red-700 bg-red-150 px-1 rounded font-black">✕ OUT</span>;
                              })()}
                            </div>
                          </div>

                          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-2 text-center shadow-inner relative overflow-hidden">
                            <span className="absolute top-2 right-2 text-[10px] bg-emerald-200 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded">AUTO</span>
                            <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest leading-none">Tenacity (gr/denier)</p>
                            <p className="text-2xl font-black text-emerald-900 font-mono tracking-tight">{testingValues["Tenacity"] || "0.00"}</p>
                            <div className="text-[9px] font-bold text-slate-500 flex justify-center gap-1">
                              <span>Batas Spec: Min 5.2</span>
                              {(() => {
                                const val = parseFloat(testingValues["Tenacity"] || "0");
                                if (val === 0) return null;
                                const isOk = val >= 5.2;
                                return isOk 
                                  ? <span className="text-emerald-700 bg-emerald-150 px-1 rounded font-black">✓ OK</span>
                                  : <span className="text-red-700 bg-red-150 px-1 rounded font-black">✕ OUT</span>;
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (activeTesting.category === "kelistrikan" || activeTesting.category === "Kelistrikan") ? (
                    <div className="space-y-6 animate-fade-in">
                      {/* SUB-CATEGORY ELECTRICAL SELECTION WORKBENCH */}
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                        <label className="text-[10px] font-extrabold text-slate-700 block uppercase tracking-wide">
                          🔌 PILIH SUB-KATEGORI ALAT LISTRIK ITRK
                        </label>
                        <select
                          value={electricalType}
                          onChange={(e) => {
                            setElectricalType(e.target.value);
                            // Auto map sub-category options to register parameters properly
                            alert(`Fungsionalitas form & perbandingan spec dialihkan ke: ${e.target.value.toUpperCase()}`);
                          }}
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-white font-extrabold text-slate-800 cursor-pointer focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="motor_listrik">⚡ Motor Listrik AC/DC</option>
                          <option value="vibrator">⚡ Vibrator Motor (Uji Vibrasi)</option>
                          <option value="gearcase_motor">⚡ GearCase Motor (Uji Reducer)</option>
                        </select>
                      </div>

                      {/* FREE CONTROL / TOGGLE HELPER FOR AI OCR ASSISTANT */}
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-blue-950 text-xs uppercase tracking-wide flex items-center gap-1.5">
                            <span>📋</span> Metode Pengisian Data Spesifikasi
                          </h4>
                          <p className="text-[10px] text-blue-700 font-semibold max-w-xl leading-normal">
                            Manual Input <strong>100% Gratis Selamanya</strong>. Tersedia juga asisten Vision AI opsional untuk scan pelat nameplate secara gratis selama masa development ini dengan batasan kuota harian:
                          </p>
                          <div className="flex items-center gap-2 mt-1 shrink-0">
                            <span className="text-[10px] font-black uppercase text-indigo-950 bg-indigo-150 px-2.5 py-1 rounded-md border border-indigo-200 inline-flex items-center gap-1">
                              ⚡ Kuota Harian Vision AI: {dailyOcrCount}/10 digunakan hari ini
                            </span>
                            {dailyOcrCount >= 10 && (
                              <span className="text-[9px] font-black uppercase text-red-600 bg-red-100 px-1.5 py-0.5 rounded animate-pulse">Batas Maksimum Tercapai</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAiOcrAssistant(!showAiOcrAssistant)}
                          className={`px-3.5 py-2 rounded-lg font-extrabold text-xs transition-all cursor-pointer border shrink-0 ${
                            showAiOcrAssistant 
                              ? "bg-[#006A4E] text-white hover:bg-[#00523C] border-[#00523C]" 
                              : "bg-white text-blue-750 border-blue-300 hover:bg-blue-100"
                          }`}
                        >
                          {showAiOcrAssistant ? "✓ Sembunyikan Bantuan AI" : "⚡ Gunakan Bantuan Scan AI"}
                        </button>
                      </div>

                      {/* CAMERA NAMEPLATE PHOTO PROOF CROSSCHECK SECTION */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-inner">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2 mb-1">
                          <div className="space-y-0.5">
                            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                              <span>📸</span> Lampiran Foto Nameplate Alat Listrik
                            </h4>
                            <p className="text-[9px] text-slate-500 font-semibold leading-none">
                              Khusus reviewer/supervisor (tidak masuk laporan cetak, melainkan untuk crosscek data).
                            </p>
                          </div>
                          {nameplatePhoto && (
                            <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full inline-block">
                              ✓ Foto Terlampir
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Photo slot */}
                          <div className="border rounded-xl p-3 bg-white flex flex-col items-center justify-center min-h-[140px] text-center relative overflow-hidden group">
                            {nameplatePhoto ? (
                              <div className="w-full h-full min-h-[130px] flex flex-col items-center justify-center relative">
                                <img 
                                  src={nameplatePhoto} 
                                  className="max-h-32 object-contain rounded-lg border border-slate-200" 
                                  alt="Nameplate attachment review" 
                                />
                                <button
                                  type="button"
                                  onClick={() => setNameplatePhoto("")}
                                  className="mt-2 text-[10px] font-bold text-red-600 hover:underline bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded border border-red-200 cursor-pointer"
                                >
                                  Hapus Lampiran Foto ✕
                                </button>
                              </div>
                            ) : (
                              <label className="w-full h-full min-h-[130px] border-2 border-dashed rounded-xl flex flex-col justify-center items-center cursor-pointer hover:bg-slate-100 p-4 transition-all">
                                <Upload className="w-7 h-7 text-slate-400 mb-1" />
                                <span className="text-xs font-bold text-slate-700">Unggah Foto Nameplate</span>
                                <span className="text-[9px] text-slate-400 font-medium mt-1 leading-tight max-w-[200px]">
                                  Maks 15 MB. Format: JPEG/PNG. (Otomatis terisi jika menggunakan Bantuan Scan AI).
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const base64 = await compressAndConvertToBase64(file);
                                      setNameplatePhoto(base64);
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-550 space-y-1.5 flex flex-col justify-center leading-relaxed">
                            <p className="font-extrabold text-slate-700 flex items-center gap-1">
                              <span>💡</span> Alur Kerja Deteksi & Verifikasi:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 font-semibold text-slate-650">
                              <li>Penguji mengisi kolom spesifikasi <span className="text-indigo-900 border-b border-indigo-150">Sesuai PO</span> terlebih dahulu.</li>
                              <li>Gunakan asisten Vision AI untuk mengotomatisasi pengisian kolom <span className="text-emerald-800 border-b border-emerald-150">Sesuai Nameplate</span>. Nilai yang cocok akan digabungkan.</li>
                              <li>Reviewer akan melihat foto ini untuk memantau integritas hasil pengujian fisik sebelum tanda tangan Digital Trust diterbitkan.</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* AI NAMEPLATE ASSIST PANEL - Only visible if active/toggled on */}
                      {showAiOcrAssistant && (
                        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-xl border border-indigo-900 space-y-4 animate-fade-in shadow-indigo-950/20">
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <p className="text-xs font-black bg-indigo-501/20 text-indigo-300 px-2.5 py-1 rounded inline-flex items-center gap-1.5 border border-indigo-750 uppercase tracking-widest leading-none">
                              <Sparkles className="w-3.5 h-3.5 animate-spin" /> Gemini Vision AI
                            </p>
                            <span className="text-[9px] text-slate-450 font-bold uppercase tracking-wider font-mono">MODEL: GEMINI 2.5 FLASH OCR (GRATIS LIMIT DEV: {dailyOcrCount}/10)</span>
                          </div>
                          
                          <div>
                            <h4 className="font-extrabold text-sm flex items-center gap-1">
                              📷 Scan AI Foto Nameplate Motor
                            </h4>
                            <p className="text-[11px] text-slate-350 leading-tight">
                              Pastikan Anda sudah mengisi manual baria kolom Sesuai PO di bawah. Seret foto nameplate orisinil di bawah untuk menganalisis dan mengisi formulir Nameplate secara cerdas.
                            </p>
                          </div>

                          <div className="relative border-2 border-dashed border-indigo-500/50 hover:border-indigo-400 rounded-xl p-6 text-center transition-all bg-indigo-950/30 cursor-pointer group">
                            {isAnalyzingNameplate ? (
                              <div className="space-y-3 py-2 flex flex-col items-center justify-center">
                                <Loader2 className="w-8 h-8 text-emerald-450 animate-spin" />
                                <div className="space-y-1">
                                  <p className="text-xs font-black text-emerald-400 animate-pulse">Scanning NamePlate via AI...</p>
                                  <p className="text-[10px] text-slate-400 font-medium">Melakukan optical character recognition (OCR) & parsing mendalam...</p>
                                </div>
                              </div>
                            ) : (
                              <label className="cursor-pointer block space-y-2">
                                <Upload className="w-8 h-8 text-indigo-400 mx-auto group-hover:scale-105 transition-transform" />
                                <div className="text-xs">
                                  <span className="font-black text-indigo-300 hover:underline">Pilih atau Seret Foto</span> untuk Scan AI
                                </div>
                                <p className="text-[9px] text-slate-455 font-medium">JPEG, PNG maks 15 MB. Gambar akan dikompres lokal & diarsip.</p>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleNameplateOcr(file);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      )}

                      {/* PHYSICAL SPEC SHEET */}
                      <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                          <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <span>📦</span> Lembar Perbandingan Deskripsi PO vs Hasil Pengolahan Nameplate Aktual
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              const params = ELECTRICAL_PARAMS[electricalType] || ELECTRICAL_PARAMS.motor_listrik;
                              const mockVals = { ...testingValues };
                              params.forEach(p => {
                                mockVals[`${p} (Sesuai PO)`] = "CONTOH MATCH";
                                mockVals[`${p} (Sesuai Nameplate)`] = "CONTOH MATCH";
                              });
                              setTestingValues(mockVals);
                            }}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-2 py-1 rounded cursor-pointer"
                          >
                            ⚡ Autofill Contoh Match
                          </button>
                        </div>

                        <div className="text-[11px] text-slate-500 font-medium leading-relaxed bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                          Isi data parameter di bawah. Jika suatu parameter tidak diisi untuk kedua kolom, maka parameter tersebut <strong>tidak akan muncul di laporan</strong>. Jika nilai Aktual Nameplate berbeda dengan PO, maka di laporan akan otomatis tercetak <strong>tebal</strong> dengan tanda <strong>asterisk (*)</strong>.
                        </div>

                        <div className="space-y-4">
                          {(ELECTRICAL_PARAMS[electricalType] || ELECTRICAL_PARAMS.motor_listrik).map((param) => {
                            const poKey = `${param} (Sesuai PO)`;
                            const npKey = `${param} (Sesuai Nameplate)`;
                            const poVal = testingValues[poKey] || "";
                            const npVal = testingValues[npKey] || "";
                            const isDifferent = poVal.trim() && npVal.trim() && poVal.trim().toLowerCase() !== npVal.trim().toLowerCase();

                            return (
                              <div key={param} className="p-3 border rounded-xl hover:border-slate-350 bg-slate-50/30 transition-all space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{param}</span>
                                  {isDifferent ? (
                                    <span className="text-[9px] font-black uppercase bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                      ⚠️ BEDA DENGAN PO
                                    </span>
                                  ) : poVal.trim() && npVal.trim() ? (
                                    <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                      ✓ MATCH
                                    </span>
                                  ) : null}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-extrabold text-slate-500 uppercase block">1. Sesuai PO</label>
                                    <input
                                      type="text"
                                      placeholder="Contoh nilai spesifikasi PO"
                                      value={poVal}
                                      onChange={(e) => {
                                        setTestingValues({
                                          ...testingValues,
                                          [poKey]: e.target.value
                                        });
                                      }}
                                      className="w-full px-3 py-1.5 text-xs border border-slate-250 rounded-lg text-slate-800 font-medium bg-white focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-extrabold text-slate-500 uppercase block">2. Sesuai Nameplate</label>
                                    <input
                                      type="text"
                                      placeholder="Contoh nilai nameplate"
                                      value={npVal}
                                      onChange={(e) => {
                                        setTestingValues({
                                          ...testingValues,
                                          [npKey]: e.target.value
                                        });
                                      }}
                                      className={`w-full px-3 py-1.5 text-xs border rounded-lg font-bold focus:ring-1 focus:ring-indigo-500 ${
                                        isDifferent 
                                          ? "border-red-300 bg-red-50 text-red-800 focus:ring-red-500" 
                                          : poVal && npVal 
                                            ? "border-emerald-300 bg-emerald-50/10 text-emerald-950" 
                                            : "border-slate-250 bg-white text-slate-800 font-medium"
                                      }`}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : activeTesting.category === "Valve" ? (
                    <div className="space-y-6 animate-fade-in">
                      {/* LOT DISPOSITION NUMBERS */}
                      <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <span>📦</span> 1. Input Disposisi Keadaan Lot Valve
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-indigo-900 uppercase block">Jumlah Valve Diuji (Total Lot)</label>
                            <input
                              type="number"
                              required
                              value={valveTotal}
                              placeholder="mis: 10"
                              onChange={(e) => setValveTotal(e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg text-xs bg-white text-slate-800 font-mono font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-indigo-950 uppercase block">Jumlah Valve Lulus (Pass)</label>
                            <input
                              type="number"
                              required
                              value={valveLulus}
                              placeholder="mis: 10"
                              onChange={(e) => setValveLulus(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-white text-emerald-700 font-mono font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-indigo-955 uppercase block">Jumlah Valve Gagal (Fail)</label>
                            <input
                              type="number"
                              required
                              value={valveGagal}
                              placeholder="mis: 0"
                              onChange={(e) => setValveGagal(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-250 rounded-lg text-xs bg-white text-red-700 font-mono font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* CAMERA PHOTOGRAPHIC PROOFS */}
                      <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-4">
                        <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <span>📸</span> 2. Bukti Foto Pengujian (Batas Ukuran & Kompres Otomatis)
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Photo 1: Manometer */}
                          <div className="space-y-2 text-center border p-3.5 rounded-xl bg-slate-50/50">
                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none mb-1">METER TEKANAN (MANOMETER)</p>
                            {valveManometerPhoto ? (
                              <div className="relative group rounded-lg overflow-hidden border border-slate-200">
                                <img src={valveManometerPhoto} className="w-full h-32 object-cover" alt="Manometer preview" />
                                <button
                                  type="button"
                                  onClick={() => setValveManometerPhoto("")}
                                  className="absolute inset-0 bg-red-600/70 text-white font-bold text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                >
                                  Hapus Foto ✕
                                </button>
                              </div>
                            ) : (
                              <label className="border-2 border-dashed rounded-lg h-32 flex flex-col justify-center items-center cursor-pointer group hover:bg-indigo-50/20 hover:border-indigo-400 transition-all">
                                <Upload className="w-6 h-6 text-slate-400 group-hover:scale-105 transition-transform" />
                                <span className="text-[10px] font-bold text-indigo-650 mt-1">Sertakan Bukti Uji</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const comp = await compressAndConvertToBase64(file);
                                      setValveManometerPhoto(comp);
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>

                          {/* Photo 2: All Lot */}
                          <div className="space-y-2 text-center border p-3.5 rounded-xl bg-slate-50/50">
                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none mb-1">FOTO KESELURUHAN LOT VALVE</p>
                            {valveAllValvesPhoto ? (
                              <div className="relative group rounded-lg overflow-hidden border border-slate-200">
                                <img src={valveAllValvesPhoto} className="w-full h-32 object-cover" alt="All valves preview" />
                                <button
                                  type="button"
                                  onClick={() => setValveAllValvesPhoto("")}
                                  className="absolute inset-0 bg-red-600/70 text-white font-bold text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                >
                                  Hapus Foto ✕
                                </button>
                              </div>
                            ) : (
                              <label className="border-2 border-dashed rounded-lg h-32 flex flex-col justify-center items-center cursor-pointer group hover:bg-indigo-50/20 hover:border-indigo-400 transition-all">
                                <Upload className="w-6 h-6 text-slate-400 group-hover:scale-105 transition-transform" />
                                <span className="text-[10px] font-bold text-indigo-650 mt-1">Sertakan Bukti Lot</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const comp = await compressAndConvertToBase64(file);
                                      setValveAllValvesPhoto(comp);
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>

                          {/* Photo 3: Active Pressure Test */}
                          <div className="space-y-2 text-center border p-3.5 rounded-xl bg-slate-50/50">
                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none mb-1">VALVE KETIKA DITEKAN</p>
                            {valveActiveTestPhoto ? (
                              <div className="relative group rounded-lg overflow-hidden border border-slate-200">
                                <img src={valveActiveTestPhoto} className="w-full h-32 object-cover" alt="Active test preview" />
                                <button
                                  type="button"
                                  onClick={() => setValveActiveTestPhoto("")}
                                  className="absolute inset-0 bg-red-600/70 text-white font-bold text-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                >
                                  Hapus Foto ✕
                                </button>
                              </div>
                            ) : (
                              <label className="border-2 border-dashed rounded-lg h-32 flex flex-col justify-center items-center cursor-pointer group hover:bg-indigo-50/20 hover:border-indigo-400 transition-all">
                                <Upload className="w-6 h-6 text-slate-400 group-hover:scale-105 transition-transform" />
                                <span className="text-[10px] font-bold text-indigo-650 mt-1">Sertakan Bukti Tekan</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const comp = await compressAndConvertToBase64(file);
                                      setValveActiveTestPhoto(comp);
                                    }
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* CONCLUSION STATUS INDICATOR */}
                      <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl shadow-sm space-y-3">
                        <h4 className="font-extrabold text-emerald-950 text-xs uppercase tracking-wide">📐 3. Kesimpulan Akhir Uji Lot Valve</h4>
                        <select
                          value={testingValues["Shell Hydrostatic Test"] || "LULUS / MEMENUHI SYARAT"}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTestingValues({
                              ...testingValues,
                              "Shell Hydrostatic Test": val,
                              "Seat Pneumatic Test": val,
                              "Conclusion": val
                            });
                          }}
                          className={`w-full px-3 py-2.5 border rounded-lg text-xs font-extrabold focus:outline-emerald-600 ${
                            (testingValues["Shell Hydrostatic Test"] || "").includes("TIDAK") 
                              ? "text-red-700 bg-red-50 border-red-300"
                              : "text-emerald-700 bg-white border-emerald-300"
                          }`}
                        >
                          <option value="LULUS / MEMENUHI SYARAT">🟢 LULUS / MEMENUHI SYARAT (OK)</option>
                          <option value="TIDAK LULUS / REJECT">🔴 TIDAK LULUS / REJECT (GAGAL)</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 bg-slate-50/30 border border-slate-100 p-5 rounded-xl">
                      {Object.keys(testingValues).map((paramName) => {
                        // Resolve dynamic local standard for this specific test point if overriden - Finding 3
                        const overriddenStd = pointOverrideStandardId ? standards.find(s => s.id === pointOverrideStandardId) : null;
                        
                        let stdParam = overriddenStd
                          ? overriddenStd.parameters.find(p => p.name === paramName)
                          : activeTestingStandard?.parameters.find(p => p.name === paramName);

                        if (!stdParam) {
                          stdParam = customtestingParams.find(cp => cp.name === paramName);
                        }
                        return (
                          <div key={paramName} className="space-y-1 animate-fade-in">
                            <div className="flex justify-between items-baseline gap-2">
                              <label className="text-xs font-bold text-slate-700 block uppercase">
                                {paramName} {stdParam?.unit ? `(${stdParam.unit})` : ""}
                              </label>
                              {!activeTestingStandard?.parameters.find(p => p.name === paramName) && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200">Kustom</span>
                              )}
                            </div>
                            {stdParam?.spec && (
                              <div className="text-[10px] text-indigo-750 mb-1 font-bold italic bg-indigo-50/55 px-2 py-1 rounded border border-indigo-100/50 flex items-center gap-1">
                                <span>⚖️</span>
                                <span>Batas Spesifikasi {overriddenStd ? `(Standar Komponen: ${overriddenStd.name})` : "(Sesuai Standar Utama)"}: {stdParam.spec}</span>
                              </div>
                            )}
                            <input
                              type="text"
                              placeholder="Masukkan angka atau text, akhiri dengan asterisk * jika deviasi spec"
                              value={testingValues[paramName] || ""}
                              onChange={(e) => setTestingValues({ ...testingValues, [paramName]: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:outline-[#006A4E]"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Catatan Khusus Penguji (Tester Notes) - Requirement 13 */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 mt-4">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none flex items-center gap-1.5">
                      <span>📝</span> Catatan Internal untuk Reviewer & Approver (Tidak Muncul di PDF)
                    </label>
                    <textarea
                      rows={3}
                      value={testerNotes}
                      onChange={(e) => setTesterNotes(e.target.value)}
                      placeholder="Tuliskan catatan internal di sini. Catatan ini hanya ditujukan untuk reviewer/approver selama proses approval dan tidak akan dicetak pada berkas PDF hasil uji."
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-850"
                    />
                  </div>

                  {/* Dynamic Add custom parameter form inside testing card - Requirement 14 */}
                  <div className="border border-slate-200 bg-amber-50/20 p-4 rounded-xl space-y-3">
                    <h5 className="font-extrabold text-slate-700 text-xs uppercase tracking-wide flex items-center gap-1">
                      <span>➕</span> Tambah Parameter Pengujian Khusus (Kustom)
                    </h5>
                    <p className="text-[10px] text-slate-400 leading-tight">Gunakan form ini jika user meminta parameter uji tambahan di luar database standar acuan.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 block uppercase">Nama Parameter</label>
                        <input
                          type="text"
                          placeholder="mis: Ketahanan Robek"
                          value={newCustomParamName}
                          onChange={(e) => setNewCustomParamName(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border rounded-md"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 block uppercase">Batas Spec</label>
                        <input
                          type="text"
                          placeholder="mis: MIN 150 N"
                          value={newCustomParamSpec}
                          onChange={(e) => setNewCustomParamSpec(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border rounded-md"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-600 block uppercase">Satuan</label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="mis: N"
                            value={newCustomParamUnit}
                            onChange={(e) => setNewCustomParamUnit(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border rounded-md"
                          />
                          <button
                            type="button"
                            onClick={handleAddCustomParam}
                            className="bg-amber-600 hover:bg-amber-750 text-white font-bold px-3 py-1 rounded text-xs transition-colors cursor-pointer"
                          >
                            Tambah
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t">
                    <div className="flex flex-wrap items-center gap-3">
                      {activeTesting.category?.toLowerCase() !== "karung" && activeTesting.category?.toLowerCase() !== "filter cloth" && (
                        <span className="text-xs text-slate-500 font-extrabold bg-slate-150 px-2.5 py-1.5 rounded border border-slate-250">
                          📍 Langkah {testingPointIndex} dari {testingPointsCount}
                        </span>
                      )}
                      {activeTesting.category?.toLowerCase() !== "karung" && activeTesting.category?.toLowerCase() !== "valve" && activeTesting.category?.toLowerCase() !== "filter cloth" && (
                        <button
                          type="button"
                          onClick={() => {
                            const newCount = testingPointsCount + 1;
                            setTestingPointsCount(newCount);
                          }}
                          className="bg-amber-600 hover:bg-amber-750 text-white font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5 border border-amber-700"
                          title="Tambah komponen/titik uji lain ke dalam registrasi barang uji ini"
                        >
                          <span>➕</span> Tambah Komponen / Titik Baru
                        </button>
                      )}
                    </div>
                    <button
                      onClick={nextOrSavePoint}
                      className="bg-[#006A4E] text-white hover:bg-emerald-800 font-bold px-6 py-2.5 rounded-lg cursor-pointer flex items-center gap-1 transition-all shadow-sm"
                    >
                      {activeTesting.category === "karung" || activeTesting.category === "filter cloth" ? (
                        <>Simpan Hasil Tabular & Kirim ke Penyetuju <ArrowRight className="w-4 h-4" /></>
                      ) : testingPointIndex < testingPointsCount ? (
                        <>Simpan & Lanjut ke Titik #{testingPointIndex + 1} <ArrowRight className="w-4 h-4" /></>
                      ) : (
                        <>Finalisasi & Kirim ke Penyetuju</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* DASHBOARD WORKSPACE ANTREAN DAN REKOMENDASI */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in pb-12">
                
                {/* Kolom Kiri: Antrean & Rekomendasi (col-span-8) */}
                <div className="lg:col-span-8 space-y-6">
                  {(() => {
                    const allDraftsForUji = registrations.filter(r => r.status === "Draft");
                    let filteredDraftsForUji = allDraftsForUji;
                    if (ujiSearch.trim()) {
                      const q = ujiSearch.toLowerCase();
                      filteredDraftsForUji = filteredDraftsForUji.filter(r => 
                        r.noReg.toLowerCase().includes(q) ||
                        r.ppjCode.toLowerCase().includes(q) ||
                        r.itemName.toLowerCase().includes(q) ||
                        r.vendor.toLowerCase().includes(q) ||
                        (r.standardName || "").toLowerCase().includes(q)
                      );
                    }

                    const recommendedDrafts = lastTestedCategory 
                      ? filteredDraftsForUji.filter(r => r.category === lastTestedCategory)
                      : [];
                    const otherDrafts = lastTestedCategory
                      ? filteredDraftsForUji.filter(r => r.category !== lastTestedCategory)
                      : filteredDraftsForUji;

                    return (
                      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-5">
                        <div className="flex justify-between items-center flex-wrap gap-3 pb-3 border-b border-slate-100">
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                              <span>📋</span> Antrean & Rekomendasi Urutan Pengujian ITRK
                            </h3>
                            <p className="text-[11px] text-slate-500">Pilih & mulai pengujian draft berikutnya di bawah secara estafet berkelanjutan</p>
                          </div>
                          <div className="relative w-full sm:max-w-xs">
                            <input
                              type="text"
                              placeholder="Cari draft registrasi..."
                              value={ujiSearch}
                              onChange={(e) => setUjiSearch(e.target.value)}
                              className="w-full pl-3 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none"
                            />
                            {ujiSearch && (
                              <button
                                type="button"
                                onClick={() => setUjiSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 text-xs font-bold"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        {/* UNIFIED EXCEL / CSV SPECTROMETER DATABASE UPLOADER */}
                        {currentUser.role !== "Tim Reviewer" && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-inner">
                            <div className="flex gap-2 items-center text-slate-800">
                              <span className="text-xl">📊</span>
                              <div>
                                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">Unggah Database Spectrometer (Logam)</h4>
                                <p className="text-[10px] text-slate-450 leading-tight">Mendukung file Excel (.xlsx, .xls) dan CSV (.csv). Mengimpor database hasil uji lab spectrometer untuk pencocokan otomatis sekali klik.</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 flex-wrap">
                              <label className="bg-[#006A4E] hover:bg-[#00523C] text-white font-bold text-[10px] px-3.5 py-2 rounded-lg cursor-pointer transition-all shadow-sm flex items-center gap-1.5 border border-emerald-700 hover:scale-[1.01] active:scale-[0.99]">
                                <Upload className="w-3.5 h-3.5" /> Pilih File Excel atau CSV
                                <input
                                  type="file"
                                  accept=".csv,.xlsx,.xls"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      const rows = await parseExcelOrCsvFile(file);
                                      if (rows.length === 0) {
                                        alert("Format file tidak sesuai (pastikan ada kolom 'Sample,Match 1...' di baris pertama)");
                                        return;
                                      }
                                      setImportedCsvRows(rows);
                                      alert(`Berhasil membaca & menyimpan ${rows.length} baris spectrometer PMI di memori local storage browser.`);
                                    } catch (err) {
                                      alert(`Gagal memproses file: ${err}`);
                                    }
                                  }}
                                  className="hidden"
                                />
                              </label>

                              {importedCsvRows.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] bg-emerald-100 text-emerald-850 font-bold px-2 py-1 rounded border border-emerald-200">
                                    {importedCsvRows.filter(r => !r.usedForRegistrationId).length} Baris PMI Bebas / {importedCsvRows.length} Total
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      askConfirmation(
                                        "Apakah Anda yakin ingin mengosongkan seluruh database hasil spectrometer terimpor?",
                                        () => {
                                          setImportedCsvRows([]);
                                        }
                                      );
                                    }}
                                    className="text-rose-600 hover:text-rose-800 font-bold text-[10px] bg-white border border-rose-250 hover:bg-rose-50 px-2.5 py-1 rounded transition-all cursor-pointer"
                                  >
                                    Kosongkan
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 1. SEKSI REKOMENDASI */}
                        {lastTestedCategory && recommendedDrafts.length > 0 && (
                          <div className="space-y-2.5 p-4 bg-indigo-50/40 border border-indigo-110 rounded-xl">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1">
                                <span>⚡</span> Rekomendasi Selanjutnya (Jenis Uji: {lastTestedCategory.toUpperCase()})
                              </h4>
                              <span className="text-[10px] bg-indigo-200 text-indigo-900 font-extrabold px-2 py-0.5 rounded-full">
                                {recommendedDrafts.length} Menunggu
                              </span>
                            </div>
                            <p className="text-[10px] text-indigo-700 leading-relaxed font-medium">
                              Melanjutkan pengujian pada kategori material yang sama menghemat waktu pengerjaan karena instrumen uji laboratorium sudah terpasang & terkalibrasi.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                              {recommendedDrafts.map(reg => (
                                <div key={reg.id} className="bg-white border border-indigo-200 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-indigo-455 transition-all flex flex-col justify-between space-y-3">
                                  <div>
                                    <div className="flex justify-between items-start gap-2">
                                      <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase border border-indigo-200">
                                        No. Reg #{reg.noReg}
                                      </span>
                                      <span className="text-[10px] text-slate-450 font-mono font-bold">
                                        No PPJ {reg.ppjCode}
                                      </span>
                                    </div>
                                    <h5 className="font-extrabold text-slate-900 text-xs mt-1.5 uppercase line-clamp-1" title={reg.itemName}>
                                      {reg.itemName}
                                    </h5>
                                    <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 font-semibold">
                                      Standar: {reg.standardName} ({reg.standardSource || "KSM"})
                                    </p>
                                  </div>
                                  {currentUser.role !== "Tim Reviewer" ? (
                                    <button
                                      type="button"
                                      onClick={() => startEnteringTesting(reg)}
                                      className="w-full bg-[#006A4E] hover:bg-[#00523C] text-white font-bold text-[11px] py-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                                    >
                                      Mulai Uji Sekarang <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <span className="text-center text-[10px] text-slate-400 italic">Reviewer Only</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 2. SEKSI ANTREAN LAINNYA */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                            {lastTestedCategory && recommendedDrafts.length > 0 ? "Antrean Kategori Lainnya" : "Semua Antrean Tunggu Uji"}
                          </h4>
                          {otherDrafts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {otherDrafts.map(reg => (
                                <div key={reg.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-slate-350 transition-all flex flex-col justify-between space-y-3">
                                  <div>
                                    <div className="flex justify-between items-start gap-2">
                                      <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded border border-emerald-200">
                                        No. Reg #{reg.noReg}
                                      </span>
                                      <span className="text-[10px] text-slate-450 font-mono font-bold">
                                        No PPJ {reg.ppjCode}
                                      </span>
                                    </div>
                                    <h5 className="font-extrabold text-slate-900 text-xs mt-1.5 uppercase line-clamp-1" title={reg.itemName}>
                                      {reg.itemName}
                                    </h5>
                                    <div className="flex items-center gap-1.5 mt-1.5 text-[9px]">
                                      <span className="bg-slate-100 text-slate-805 font-extrabold px-1.5 py-0.2 rounded border uppercase">
                                        {reg.category}
                                      </span>
                                      <span className="text-slate-400 font-bold">
                                        {reg.points} Titik Uji
                                      </span>
                                    </div>
                                  </div>
                                  {currentUser.role !== "Tim Reviewer" ? (
                                    <button
                                      type="button"
                                      onClick={() => startEnteringTesting(reg)}
                                      className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] py-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                                    >
                                      Mulai Uji Sekarang <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <span className="text-center text-[10px] text-slate-400 italic">Reviewer Only</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            recommendedDrafts.length === 0 && (
                              <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-2">
                                <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
                                <p className="text-slate-650 font-semibold text-sm">Semua Antrean Uji Telah Diselesaikan!</p>
                                <p className="text-slate-400 text-xs">Belum ada registrasi baru berstatus draf yang masuk hari ini.</p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Kolom Kanan: Database PMI (col-span-4) */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                        <span>📊</span> Excel PMI Spectrometer Logam
                      </h3>
                      <p className="text-[11px] text-slate-500">Kelola dan impor database rincian unsur spectrometer untuk pengisian cepat otomatis</p>
                    </div>

                    {importedCsvRows.length === 0 ? (
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-5 text-center space-y-3 hover:border-emerald-500 transition-colors bg-slate-50/50">
                        <div className="text-3xl text-slate-300">📄</div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-700">Impor Data Spektrometer</p>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Mendukung file Excel (.xlsx, .xls) & CSV (.csv) untuk pengisian otomatis hasil uji lab logam
                          </p>
                        </div>
                        <label className="inline-block bg-[#006A4E] hover:bg-[#00523C] text-white font-bold text-[11px] px-3.5 py-2 rounded-lg cursor-pointer transition-colors shadow-sm border border-emerald-700">
                          Pilih File Excel / CSV
                          <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const rows = await parseExcelOrCsvFile(file);
                                if (rows.length === 0) {
                                  alert("Format file tidak sesuai (pastikan ada kolom 'Sample,Match 1...')");
                                  return;
                                }
                                setImportedCsvRows(rows);
                                alert(`Berhasil mengimpor ${rows.length} baris data spektrometer!`);
                              } catch (err) {
                                alert(`Gagal memproses file: ${err}`);
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-[11px]">
                          <div>
                            <span className="font-extrabold text-slate-805">{importedCsvRows.length} Baris Total</span>
                            <span className="text-slate-300 mx-1.5">|</span>
                            <span className="text-emerald-700 font-bold">{importedCsvRows.filter(r => !r.usedForRegistrationId).length} Bebas</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              askConfirmation(
                                "Apakah Anda yakin ingin menghapus seluruh database PMI dalam memori ini?",
                                () => {
                                  setImportedCsvRows([]);
                                }
                              );
                            }}
                            className="text-rose-600 hover:text-rose-800 font-extrabold text-[10px] transition-colors hover:underline cursor-pointer bg-white border border-slate-200 px-2 py-0.5 rounded"
                          >
                            Hapus Semua
                          </button>
                        </div>

                        {activeTesting && activeTesting.category?.toLowerCase() === "logam" && (
                          <div className="bg-emerald-50 border border-emerald-200 p-2 text-[11px] font-bold text-[#006A4E] text-center rounded-lg flex items-center justify-center gap-1.5 animate-pulse">
                            <span>🎯</span> Memetakan ke Form Aktif: <span className="underline font-black">{activeTesting.itemName}</span> (Titik #{testingPointIndex})
                          </div>
                        )}

                        {/* Live Filter Baris PMI */}
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Cari Sample / Standar (mis: 1612)..."
                            value={activeCsvSearch}
                            onChange={(e) => setActiveCsvSearch(e.target.value)}
                            className="w-full px-2.5 py-1.5 pl-3 text-xs border border-slate-205 bg-white text-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          {activeCsvSearch && (
                            <button
                              type="button"
                              onClick={() => setActiveCsvSearch("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-bold text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 border border-slate-100 rounded-xl p-2 bg-slate-50">
                          {importedCsvRows
                            .filter(row => {
                              if (!activeCsvSearch.trim()) return true;
                              const q = activeCsvSearch.toLowerCase();
                              return (
                                row.sample.toLowerCase().includes(q) ||
                                row.match.toLowerCase().includes(q)
                              );
                            })
                            .map(row => {
                              const isUsed = !!row.usedForRegistrationId;
                              const baseRegId = row.usedForRegistrationId ? row.usedForRegistrationId.split("_pt")[0] : null;
                              const regItem = baseRegId 
                                ? registrations.find(r => r.id === baseRegId) 
                                : null;
                              const ptNum = row.usedForRegistrationId && row.usedForRegistrationId.includes("_pt") 
                                ? row.usedForRegistrationId.split("_pt")[1] 
                                : null;
                              return (
                                <div 
                                  key={row.id} 
                                  onClick={(e) => {
                                    if (!isUsed && activeTesting && activeTesting.category?.toLowerCase() === "logam") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleSelectCsvRowForTesting(row);
                                    }
                                  }}
                                  className={`border rounded-lg p-2.5 text-xs space-y-1.5 transition-all ${
                                    isUsed ? "opacity-60 bg-slate-50 border-slate-150 shadow-none" : "border-slate-200 bg-white shadow-sm hover:border-emerald-500 hover:bg-emerald-50/10 cursor-pointer"
                                  }`}
                                >
                                  <div className="flex justify-between items-start gap-1.5">
                                    <div className="truncate">
                                      <p className="font-extrabold text-slate-900 text-xs text-left">Sample {row.sample}</p>
                                      <span className="text-[9px] bg-slate-100 text-slate-650 border border-slate-200 font-bold px-1.5 py-0.2 rounded uppercase inline-block mt-0.5">
                                        {row.match || "Sisa Spec"}
                                      </span>
                                    </div>
                                    {isUsed ? (
                                      <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                                        <span className="text-[8px] bg-emerald-105 text-emerald-800 font-black px-1.5 py-0.2 rounded border border-emerald-250 uppercase shrink-0">
                                          PPJ: {regItem?.ppjCode || "Detail"}{ptNum ? ` (Titik #${ptNum})` : ""}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setImportedCsvRows(prev => prev.map(r => r.id === row.id ? { ...r, usedForRegistrationId: undefined } : r));
                                            showToast("Hubungan data spektrometer dibatalkan.", "info");
                                          }}
                                          className="text-[9px] text-indigo-700 hover:underline font-bold"
                                        >
                                          Reset/Lepaskan
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {activeTesting && activeTesting.category?.toLowerCase() === "logam" && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleSelectCsvRowForTesting(row);
                                            }}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition-all shadow-sm"
                                            title="Masukkan data spectrometer ini ke parameter uji aktif"
                                          >
                                            👉 Petakan ke Form Uji
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            askConfirmation(
                                              "Hapus baris ini dari database?",
                                              () => {
                                                setImportedCsvRows(prev => prev.filter(r => r.id !== row.id));
                                              }
                                            );
                                          }}
                                          className="text-rose-650 hover:text-rose-800 font-extrabold text-[9px] cursor-pointer"
                                          title="Hapus baris ini dari database"
                                        >
                                          Hapus
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                    <div className="flex flex-wrap gap-1 text-[9px] font-mono">
                                      {Object.entries(row.values)
                                        .filter(([_,val]) => !!val)
                                        .slice(0, 6)
                                        .map(([k, v]) => (
                                          <span key={k} className="bg-slate-50 border border-slate-100 text-slate-500 px-1 py-0.2 rounded whitespace-nowrap">
                                            {k}:{formatToMaxTwoDecimals(v as string)}
                                          </span>
                                        ))}
                                    {Object.entries(row.values).filter(([_,val]) => !!val).length > 6 && (
                                      <span className="text-slate-400">+{Object.entries(row.values).filter(([_,val]) => !!val).length - 6}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          {importedCsvRows.length === 0 && (
                            <p className="text-xs text-slate-450 italic text-center py-6">Database dalam memori kosong.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* 3. REVIEW TAB (Tim Reviewer Only) */}
        {activeTab === "review" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4 animate-fade-in">Pengajuan Hasil Uji Tertunda (Butuh Review & Persetujuan)</h3>
              
              {/* Search review */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-4 text-xs">
                <div className="relative w-full sm:max-w-xs">
                  <input
                    type="text"
                    placeholder="Cari pengajuan hasil uji..."
                    value={reviewSearch}
                    onChange={(e) => setReviewSearch(e.target.value)}
                    className="w-full pl-3.5 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/15 focus:border-slate-800 transition-all font-semibold text-slate-850"
                  />
                  {reviewSearch && (
                    <button 
                      type="button" 
                      onClick={() => setReviewSearch("")} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-extrabold"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="text-slate-500 text-[10px] font-mono">
                  Menampilkan <strong>{getFilteredReviews().length}</strong> dari {registrations.filter(r => r.status === "Uji").length} tertunda
                </div>
              </div>

              {/* Bulk reviews action console */}
              {selectedReviewRegs.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-150 p-3.5 rounded-xl mb-4 text-xs animate-fade-in">
                  <span className="font-extrabold text-[#006A4E]">
                    📂 Verifikasi Bersama ({selectedReviewRegs.length} Uji Terpilih):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      askConfirmation(
                        `Yakin ingin menyetujui & menerbitkan sertifikat untuk ${selectedReviewRegs.length} antrean terpilih?`,
                        () => handleBulkReviewApprove(true)
                      );
                    }}
                    className="bg-[#006A4E] hover:bg-emerald-800 text-white font-extrabold text-xs px-3.5 py-2 rounded-lg shadow cursor-pointer transition-colors"
                  >
                    🏆 Setujui & Terbitkan Semua (Bulk)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!reviewComments.trim()) {
                        alert("Wajib mengetikkan Keterangan / Alasan Bulk terlebih dahulu di kolom input sebelum menolak antrean terpilih!");
                        return;
                      }
                      askConfirmation(
                        `Yakin ingin menolak kembali ke draft untuk ${selectedReviewRegs.length} antrean terpilih?`,
                        () => handleBulkReviewApprove(false)
                      );
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-lg shadow cursor-pointer transition-colors"
                  >
                    ❌ Tolak & Kembalikan ke Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedReviewRegs([])}
                    className="bg-white border border-slate-300 text-slate-705 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    Batal Centang
                  </button>
                </div>
              )}

              <div className="overflow-x-auto text-sm animate-fade-in">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-xs font-bold text-slate-500 uppercase bg-slate-50/50 select-none">
                      <th className="p-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedReviewRegs.length === getFilteredReviews().length && getFilteredReviews().length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedReviewRegs(getFilteredReviews().map(r => r.id));
                            } else {
                              setSelectedReviewRegs([]);
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortReview("noReg")}>
                        No Reg {renderSortIndicator("noReg", reviewSortKey, reviewSortDir)}
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortReview("ppjCode")}>
                        No PPJ {renderSortIndicator("ppjCode", reviewSortKey, reviewSortDir)}
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortReview("itemName")}>
                        Nama Barang / Deskripsi {renderSortIndicator("itemName", reviewSortKey, reviewSortDir)}
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortReview("vendor")}>
                        PO & Vendor {renderSortIndicator("vendor", reviewSortKey, reviewSortDir)}
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortReview("pengujiInitials")}>
                        Penguji {renderSortIndicator("pengujiInitials", reviewSortKey, reviewSortDir)}
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortReview("tanggalDiuji")}>
                        Tanggal {renderSortIndicator("tanggalDiuji", reviewSortKey, reviewSortDir)}
                      </th>
                      <th className="p-3">Tindakan Keputusan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredReviews().slice((reviewPage - 1) * 10, reviewPage * 10).map((reg) => (
                      <tr key={reg.id} className="border-b hover:bg-slate-50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedReviewRegs.includes(reg.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReviewRegs([...selectedReviewRegs, reg.id]);
                              } else {
                                setSelectedReviewRegs(selectedReviewRegs.filter(id => id !== reg.id));
                              }
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800">#{reg.noReg}</td>
                        <td className="p-3 font-semibold text-slate-700 bg-slate-50/20">{reg.ppjCode}</td>
                        <td className="p-3 max-w-[340px]">
                          <div className="font-extrabold text-slate-900 uppercase leading-snug">{reg.itemName}</div>
                          <div className="text-[10px] text-[#006A4E] font-extrabold mt-1">Standard: {reg.standardName}</div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 mb-1 bg-slate-50">
                            {reg.isNewVendorFlag && (
                              <span className="text-[8px] bg-amber-100 text-amber-800 border border-amber-300 font-extrabold px-1.5 py-0.5 rounded-md uppercase inline-flex items-center gap-0.5 shadow-sm">
                                ❓ Vendor Baru / Typo?
                              </span>
                            )}
                            {reg.platNomor && (
                              <span className="text-[8px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-black px-1.5 py-0.5 rounded-md inline-flex items-center shadow-sm">
                                🚗 {reg.platNomor}
                              </span>
                            )}
                            {(reg.ballCount || reg.sheetCount) && (
                              <span className="text-[8px] bg-indigo-100 text-indigo-800 border border-indigo-300 font-extrabold px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 shadow-sm">
                                📦 {reg.category === "karung" ? `Ball: ${reg.ballCount || 0}` : `Box: ${reg.ballCount || 0}`} | {reg.category === "karung" ? `Lbr: ${reg.sheetCount || 0}` : `Kg: ${reg.sheetCount || 0}`}
                              </span>
                            )}
                          </div>
                          
                          {reg.description && (
                            <div className="mt-2 space-y-0.5">
                              <span className="text-[9px] font-black uppercase text-slate-500 block leading-none">ℹ️ Deskripsi PO:</span>
                              <div className="text-[10px] text-slate-700 font-semibold bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 whitespace-pre-wrap max-h-24 overflow-y-auto leading-normal">
                                {reg.description}
                              </div>
                            </div>
                          )}

                          {reg.notes && (
                            <div className="mt-2.5 space-y-0.5">
                              <span className="text-[9px] font-black uppercase text-[#006A4E] block leading-none">📝 Catatan Internal Penguji:</span>
                              <div className="text-[10px] text-indigo-950 font-semibold bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-150 whitespace-pre-wrap max-h-24 overflow-y-auto leading-normal">
                                {reg.notes}
                              </div>
                            </div>
                          )}

                          {reg.categoryOptions?.nameplatePhoto && (
                            <div className="mt-2.5 space-y-1">
                              <span className="text-[9px] font-black uppercase text-emerald-850 block leading-none">📸 Lampiran Foto Nameplate:</span>
                              <div className="flex items-center gap-2">
                                <img 
                                  src={reg.categoryOptions.nameplatePhoto} 
                                  className="w-10 h-10 object-contain rounded border border-slate-250 cursor-pointer bg-white hover:scale-105 transition-transform" 
                                  alt="Thumbnail Nameplate" 
                                  onClick={() => setViewingReport(reg)}
                                />
                                <span className="text-[9px] text-slate-500 font-semibold leading-tight">
                                  Klik gambar untuk crosscheck detail data
                                </span>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-xs border-l border-r border-slate-100">
                          <strong className="text-slate-700">{reg.vendor}</strong><br/>
                          PO: {reg.poCode}
                        </td>
                        <td className="p-3 text-xs font-bold text-slate-900">
                          {reg.pengujiInitials}
                        </td>
                        <td className="p-3 text-xs font-semibold text-slate-600">
                          {reg.tanggalDiuji}
                        </td>
                        <td className="p-3">
                          {canReview ? (
                            <div className="flex flex-col gap-2">
                              {/* Overlay Report modal review */}
                              <button
                                onClick={() => {
                                  // Sync current reviewUseQrMap with our viewing report initial state so the modal loads the correct state
                                  const currentQrVal = reviewUseQrMap[reg.id] !== false;
                                  setViewingReport({ ...reg, useQrSignature: currentQrVal });
                                }}
                                className="bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-all text-xs font-bold px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer animate-pulse"
                              >
                                <Eye className="w-3.5 h-3.5 animate-bounce" />
                                Review Cetak Sertifikat
                              </button>
 
                              {/* Form review directly */}
                              <div className="space-y-2 border-t pt-2 mt-1">
                                <input
                                  type="text"
                                  placeholder="Beri komentar persetujuan..."
                                  value={reviewCommentsMap[reg.id] || ""}
                                  onChange={(e) => setReviewCommentsMap({ ...reviewCommentsMap, [reg.id]: e.target.value })}
                                  className="w-full border p-1 rounded text-xs bg-slate-50 text-slate-800 focus:bg-white"
                                />
                                <div className="flex items-center gap-2 mb-1">
                                  <input 
                                    type="checkbox" 
                                    id={`reviewUseQr-${reg.id}`} 
                                    checked={reviewUseQrMap[reg.id] !== false}
                                    onChange={(e) => setReviewUseQrMap({ ...reviewUseQrMap, [reg.id]: e.target.checked })}
                                    className="rounded text-emerald-700 text-xs cursor-pointer" 
                                  />
                                  <label htmlFor={`reviewUseQr-${reg.id}`} className="text-[10px] font-bold text-slate-500 cursor-pointer">Gunakan QR (Digital Trust)</label>
                                </div>
                                <div className="flex gap-1.5 justify-end">
                                  <button
                                    onClick={() => handleReviewDecision(reg.id, false)}
                                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold py-1 px-2.5 rounded cursor-pointer"
                                  >
                                    Kembalikan
                                  </button>
                                  <button
                                    onClick={() => handleReviewDecision(reg.id, true)}
                                    className="bg-[#006A4E] hover:bg-emerald-800 text-white text-[10px] font-bold py-1 px-3 rounded cursor-pointer flex items-center gap-0.5"
                                  >
                                    Terbitkan!
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-rose-600 italic font-bold">Reviewer Only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {getFilteredReviews().length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-slate-400 italic font-medium">
                          Tidak ada pengajuan hasil uji yang tertunda menunggu review penyetuju.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <PaginationControl
                currentPage={reviewPage}
                totalItems={getFilteredReviews().length}
                pageSize={10}
                onPageChange={(page) => setReviewPage(page)}
              />
            </div>
          </div>
        )}

        {/* 4. TERBIT TAB (1-word completed documents) */}
        {activeTab === "terbit" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Kanal Penerbitan Laporan Resmi (Certified Reports)</h3>
                  <p className="text-xs text-slate-500">Dua opsi ttd dan QR Code didukung lengkap. Centang beberapa list di bawah untuk unduh cetak batch bersamaan.</p>
                </div>
                {selectedCompletedRegs.length > 0 && (
                  <button
                    onClick={triggerBatchPrint}
                    className="bg-[#006A4E] hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow animate-pulse"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak Batch Terpilih ({selectedCompletedRegs.length} Berkas)
                  </button>
                )}
              </div>

              {/* Search Terbit */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div className="relative w-full sm:max-w-xs">
                  <input
                    type="text"
                    placeholder="Cari sertifikat diterbitkan..."
                    value={terbitSearch}
                    onChange={(e) => setTerbitSearch(e.target.value)}
                    className="w-full pl-3.5 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/15 focus:border-slate-800 transition-all font-semibold text-slate-850"
                  />
                  {terbitSearch && (
                    <button 
                      type="button" 
                      onClick={() => setTerbitSearch("")} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-extrabold"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="text-slate-500 text-[10px] font-mono">
                  Menampilkan <strong>{getFilteredTerbits().length}</strong> dari {registrations.filter(r => r.status === "Terbit").length} diterbitkan
                </div>
              </div>

              {/* Advanced multi-option filters panel for Terbit (Revisi 1) */}
              <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 mb-2 space-y-3.5 text-xs animate-fade-in shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-250 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <span className="text-sm">🔍</span>
                    <span>Filter Data Tingkat Lanjut (Diterbitkan)</span>
                  </div>
                  {(terbitFilterCategory !== "All" || terbitFilterVendor !== "All" || terbitFilterStandard !== "All" || terbitFilterDate !== "") && (
                    <button
                      type="button"
                      onClick={() => {
                        setTerbitFilterCategory("All");
                        setTerbitFilterVendor("All");
                        setTerbitFilterStandard("All");
                        setTerbitFilterDate("");
                      }}
                      className="text-indigo-650 hover:text-indigo-900 font-extrabold text-[11px] flex items-center gap-0.5 cursor-pointer hover:underline"
                    >
                      ✕ Reset Semua Filter
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                  {/* Category Filter */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold text-slate-600">Kategori</label>
                    <select
                      value={terbitFilterCategory}
                      onChange={(e) => setTerbitFilterCategory(e.target.value)}
                      className="w-full border border-slate-250 hover:border-slate-400 focus:border-slate-600 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 bg-white shadow-xs focus:ring-1 focus:ring-slate-500/20"
                    >
                      <option value="All">Semua Kategori</option>
                      {uniqueTerbitCategories.map((cat: any) => (
                        <option key={cat} value={cat}>{String(cat).toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  {/* Vendor Filter */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold text-slate-600">Vendor</label>
                    <select
                      value={terbitFilterVendor}
                      onChange={(e) => setTerbitFilterVendor(e.target.value)}
                      className="w-full border border-slate-250 hover:border-slate-400 focus:border-slate-600 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 bg-white shadow-xs focus:ring-1 focus:ring-slate-500/20"
                    >
                      <option value="All">Semua Vendor</option>
                      {uniqueTerbitVendors.map((v: any) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>

                  {/* Standard Filter */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold text-slate-600">Acuan Standar</label>
                    <select
                      value={terbitFilterStandard}
                      onChange={(e) => setTerbitFilterStandard(e.target.value)}
                      className="w-full border border-slate-250 hover:border-slate-400 focus:border-slate-600 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 bg-white shadow-xs focus:ring-1 focus:ring-slate-500/20"
                    >
                      <option value="All">Semua Standar</option>
                      {uniqueTerbitStandards.map((std: any) => (
                        <option key={std} value={std}>{std}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Filter & Date Type */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-extrabold text-slate-600">Filter Tanggal</label>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="terbitDateType"
                            checked={terbitFilterDateType === "terbit"}
                            onChange={() => setTerbitFilterDateType("terbit")}
                            className="w-2.5 h-2.5 cursor-pointer text-indigo-600 rounded-full"
                          />
                          Terbit
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="terbitDateType"
                            checked={terbitFilterDateType === "diterima"}
                            onChange={() => setTerbitFilterDateType("diterima")}
                            className="w-2.5 h-2.5 cursor-pointer text-indigo-600 rounded-full"
                          />
                          Diterima
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="terbitDateType"
                            checked={terbitFilterDateType === "ppj"}
                            onChange={() => setTerbitFilterDateType("ppj")}
                            className="w-2.5 h-2.5 cursor-pointer text-indigo-600 rounded-full"
                          />
                          PPJ
                        </label>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <input
                        type="date"
                        value={terbitFilterDate}
                        onChange={(e) => setTerbitFilterDate(e.target.value)}
                        className="w-full border border-slate-250 hover:border-slate-400 focus:border-slate-600 rounded-lg px-2.5 py-1 text-slate-800 font-bold bg-white shadow-xs"
                      />
                      {terbitFilterDate && (
                        <button
                          type="button"
                          onClick={() => setTerbitFilterDate("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-700 font-extrabold text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto text-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-xs font-bold text-slate-500 uppercase bg-slate-50/50 select-none">
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedCompletedRegs.length === getFilteredTerbits().length && getFilteredTerbits().length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCompletedRegs(getFilteredTerbits().map(r => r.id));
                            } else {
                              setSelectedCompletedRegs([]);
                            }
                          }}
                          className="rounded text-emerald-700"
                        />
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortTerbit("noReg")}>
                        No. Reg / Tgl {renderSortIndicator("noReg", terbitSortKey, terbitSortDir)}
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortTerbit("noSurat")}>
                        No Surat Resmi {renderSortIndicator("noSurat", terbitSortKey, terbitSortDir)}
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortTerbit("itemName")}>
                        Nama Barang PO / PR {renderSortIndicator("itemName", terbitSortKey, terbitSortDir)}
                      </th>
                      <th className="p-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredTerbits().slice((terbitPage - 1) * 10, terbitPage * 10).map((reg) => (
                      <tr key={reg.id} className="border-b hover:bg-slate-50/50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedCompletedRegs.includes(reg.id)}
                            onChange={() => handleCheckboxToggleBatch(reg.id)}
                            className="rounded text-emerald-700 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800">
                          #{reg.noReg}
                          <span className="block text-[10px] text-slate-400 font-normal">{reg.tanggalTerbit}</span>
                        </td>
                        <td className="p-3 font-semibold text-slate-950">{reg.noSurat}</td>
                        <td className="p-3 text-xs">
                          <strong className="block text-slate-900 uppercase">{reg.itemName}</strong>
                          <span className="text-slate-500">PO: {reg.poCode}</span>

                          <div className="flex flex-wrap items-center gap-1.5 mt-1 bg-slate-50">
                            {reg.isNewVendorFlag && (
                              <span className="text-[8px] bg-amber-100 text-amber-800 border border-amber-300 font-extrabold px-1.5 py-0.5 rounded-md uppercase inline-flex items-center gap-0.5 shadow-sm">
                                ❓ Vendor Baru / Typo?
                              </span>
                            )}
                            {reg.platNomor && (
                              <span className="text-[8px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-black px-1.5 py-0.5 rounded-md inline-flex items-center shadow-sm">
                                🚗 {reg.platNomor}
                              </span>
                            )}
                            {(reg.ballCount || reg.sheetCount) && (
                              <span className="text-[8px] bg-indigo-100 text-indigo-800 border border-indigo-300 font-extrabold px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 shadow-sm">
                                📦 {reg.category === "karung" ? `Ball: ${reg.ballCount || 0}` : `Box: ${reg.ballCount || 0}`} | {reg.category === "karung" ? `Lbr: ${reg.sheetCount || 0}` : `Kg: ${reg.sheetCount || 0}`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 flex gap-1.5 flex-wrap">
                          <button
                            onClick={() => setViewingReport(reg)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#006A4E]" /> Pratinjau
                          </button>
                        </td>
                      </tr>
                    ))}
                    {getFilteredTerbits().length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-10 text-center text-slate-400 italic">
                          Belum ada sertifikat laporan diterbitkan secara resmi yang cocok dengan pencarian Anda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <PaginationControl
                currentPage={terbitPage}
                totalItems={getFilteredTerbits().length}
                pageSize={10}
                onPageChange={(page) => setTerbitPage(page)}
              />
            </div>
          </div>
        )}

        {/* 5. TAB STATISTIK ANALISA */}
        {activeTab === "analisa" && (() => {
          // Dynamic options for Year filter
          const uniqueAnalisaYears = Array.from(new Set(registrations.map(r => {
            const dVal = r.tanggalPPJ || r.tanggalDiterima || r.tanggalTerbit || r.tanggalDiuji || "";
            if (dVal && dVal.includes("-")) {
              return dVal.split("-")[0];
            }
            return null;
          }).filter(Boolean))).sort();

          const indonesianMonths = [
            { value: "01", label: "Januari" },
            { value: "02", label: "Februari" },
            { value: "03", label: "Maret" },
            { value: "04", label: "April" },
            { value: "05", label: "Mei" },
            { value: "06", label: "Juni" },
            { value: "07", label: "Juli" },
            { value: "08", label: "Agustus" },
            { value: "09", label: "September" },
            { value: "10", label: "Oktober" },
            { value: "11", label: "November" },
            { value: "12", label: "Desember" }
          ];

          // Filtered dataset for Analisa interactive widgets
          const filteredRegsForAnalisa = registrations.filter(r => {
            if (analisaFilterCategory !== "All" && r.category !== analisaFilterCategory) return false;
            if (analisaFilterVendor !== "All" && r.vendor !== analisaFilterVendor) return false;

            // Date filtering acuan
            const dVal = (
              analisaFilterDateType === "terbit" 
                ? (r.tanggalTerbit || r.tanggalDiuji || "") 
                : (analisaFilterDateType === "diterima" 
                    ? r.tanggalDiterima 
                    : r.tanggalPPJ)
            ) || "";

            // Check range
            if (analisaFilterStartDate && dVal < analisaFilterStartDate) return false;
            if (analisaFilterEndDate && dVal > analisaFilterEndDate) return false;

            // Check month and year if available
            if (dVal) {
              const parts = dVal.split("-");
              if (parts.length >= 2) {
                const year = parts[0];
                const month = parts[1]; // "01", "02", etc.
                if (analisaFilterYear !== "All" && year !== analisaFilterYear) return false;
                if (analisaFilterMonth !== "All" && month !== analisaFilterMonth) return false;
              } else {
                if (analisaFilterYear !== "All" || analisaFilterMonth !== "All") return false;
              }
            } else {
              if (analisaFilterStartDate || analisaFilterEndDate || analisaFilterYear !== "All" || analisaFilterMonth !== "All") return false;
            }

            return true;
          });

          const totalItemsFiltered = filteredRegsForAnalisa.length;
          const publishedCountFiltered = filteredRegsForAnalisa.filter(r => r.status === "Terbit").length;
          const testedCountFiltered = filteredRegsForAnalisa.filter(r => r.status === "Uji").length;
          const reviewCountFiltered = filteredRegsForAnalisa.filter(r => r.status === "Review").length;
          const draftCountFiltered = filteredRegsForAnalisa.filter(r => r.status === "Draft").length;

          const onSpecFiltered = filteredRegsForAnalisa.filter(r => getRegSpecStatus(r) === "onspec").length;
          const offSpecFiltered = filteredRegsForAnalisa.filter(r => getRegSpecStatus(r) === "offspec").length;
          const draftSpecFiltered = filteredRegsForAnalisa.filter(r => getRegSpecStatus(r) === "draft").length;

          const totalSpecCount = onSpecFiltered + offSpecFiltered + draftSpecFiltered;
          const pctOnSpec = totalSpecCount > 0 ? (onSpecFiltered / totalSpecCount) * 100 : 0;
          const pctOffSpec = totalSpecCount > 0 ? (offSpecFiltered / totalSpecCount) * 100 : 0;
          const pctDraft = totalSpecCount > 0 ? (draftSpecFiltered / totalSpecCount) * 100 : 0;

          // Compute categoryStats based on filteredRegsForAnalisa
          const categoryStatsFiltered = ["karung", "logam", "filter cloth", "kelistrikan", "Valve", "benang", "rubber"].map(cat => {
            const regs = filteredRegsForAnalisa.filter(r => r.category === cat);
            const total = regs.length;
            const onspec = regs.filter(r => getRegSpecStatus(r) === "onspec").length;
            const offspec = regs.filter(r => getRegSpecStatus(r) === "offspec").length;
            const draft = regs.filter(r => getRegSpecStatus(r) === "draft").length;
            const tested = total - draft;
            const complianceRate = tested > 0 ? (onspec / tested) * 100 : 100;
            
            return {
              category: cat,
              total,
              onspec,
              offspec,
              draft,
              tested,
              complianceRate
            };
          });

          // Compute vendorStats based on filteredRegsForAnalisa
          const activeVendorList = Array.from(new Set(filteredRegsForAnalisa.map(r => r.vendor))).filter(Boolean);
          const vendorStatsFiltered = activeVendorList.map(v => {
            const regs = filteredRegsForAnalisa.filter(r => r.vendor === v);
            const total = regs.length;
            const onspec = regs.filter(r => getRegSpecStatus(r) === "onspec").length;
            const offspec = regs.filter(r => getRegSpecStatus(r) === "offspec").length;
            const draft = regs.filter(r => getRegSpecStatus(r) === "draft").length;
            const tested = total - draft;
            const complianceRate = tested > 0 ? (onspec / tested) * 100 : 100;
            
            return {
              vendor: v,
              total,
              onspec,
              offspec,
              draft,
              tested,
              complianceRate
            };
          }).sort((a, b) => b.total - a.total);

          // Compute trend stats based on filteredRegsForAnalisa
          // Determine if we should show daily (harian) detailed view (Requirement 3)
          const isDailyTrend = analisaFilterMonth !== "All" || analisaFilterStartDate !== "" || analisaFilterEndDate !== "";

          const trendStatsByMonthFiltered: { [key: string]: { monthName: string, total: number, onspec: number, offspec: number, draft: number } } = {};
          
          filteredRegsForAnalisa.forEach(r => {
            const dVal = (
              analisaFilterDateType === "terbit" 
                ? (r.tanggalTerbit || r.tanggalDiuji || "") 
                : (analisaFilterDateType === "diterima" 
                    ? r.tanggalDiterima 
                    : r.tanggalPPJ)
            ) || "";

            let key = "2026-04"; // Fallback
            let displayName = "April 2026";

            if (dVal && dVal.includes("-")) {
              const parts = dVal.split("-");
              if (parts.length >= 2) {
                const year = parts[0];
                const month = parts[1];
                const day = parts[2] || "";

                if (isDailyTrend) {
                  // Group by YYYY-MM-DD
                  key = dVal;
                  const monthNamesIndo: { [key: string]: string } = {
                    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "Mei", "06": "Jun",
                    "07": "Jul", "08": "Agu", "09": "Sep", "10": "Okt", "11": "Nov", "12": "Des"
                  };
                  const mName = monthNamesIndo[month] || month;
                  displayName = day ? `${parseInt(day, 10)} ${mName}` : `${mName} ${year}`;
                } else {
                  // Group by YYYY-MM
                  key = `${year}-${month}`;
                  const monthNamesIndo: { [key: string]: string } = {
                    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "Mei", "06": "Jun",
                    "07": "Jul", "08": "Agu", "09": "Sep", "10": "Okt", "11": "Nov", "12": "Des"
                  };
                  const mName = monthNamesIndo[month] || month;
                  displayName = `${mName} ${year}`;
                }
              }
            }
            
            if (!trendStatsByMonthFiltered[key]) {
              trendStatsByMonthFiltered[key] = {
                monthName: displayName,
                total: 0,
                onspec: 0,
                offspec: 0,
                draft: 0
              };
            }
            
            trendStatsByMonthFiltered[key].total += 1;
            const spec = getRegSpecStatus(r);
            if (spec === "onspec") {
              trendStatsByMonthFiltered[key].onspec += 1;
            } else if (spec === "offspec") {
              trendStatsByMonthFiltered[key].offspec += 1;
            } else {
              trendStatsByMonthFiltered[key].draft += 1;
            }
          });

          const sortedMonthsFiltered = Object.keys(trendStatsByMonthFiltered).sort().map(key => ({
            key,
            ...trendStatsByMonthFiltered[key]
          }));

          const hasActiveFilters = (
            analisaFilterCategory !== "All" || 
            analisaFilterVendor !== "All" || 
            analisaFilterStartDate !== "" || 
            analisaFilterEndDate !== "" || 
            analisaFilterMonth !== "All" || 
            analisaFilterYear !== "All"
          );

          return (
            <div className="space-y-6">
              
              {/* Analisa Top Filtering bar */}
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5 space-y-4 text-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span>📊</span>
                      <span>Filter Dashboard Analisa Data</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">Saring data infografis berdasarkan kriteria kategori, vendor, rentang tanggal, atau bulan dan tahun spesifik.</p>
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={() => {
                        setAnalisaFilterCategory("All");
                        setAnalisaFilterVendor("All");
                        setAnalisaFilterStartDate("");
                        setAnalisaFilterEndDate("");
                        setAnalisaFilterMonth("All");
                        setAnalisaFilterYear("All");
                      }}
                      className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-3 py-1.5 transition-all self-start md:self-center"
                    >
                      ✕ Reset Semua Filter
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Left Column: Atribut Filter */}
                  <div className="md:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Kategori</label>
                      <select
                        value={analisaFilterCategory}
                        onChange={(e) => setAnalisaFilterCategory(e.target.value)}
                        className="w-full border border-slate-250 hover:border-slate-400 focus:border-slate-600 rounded-xl px-3 py-2 font-bold text-slate-800 bg-white shadow-xs focus:ring-1 focus:ring-slate-500/20"
                      >
                        <option value="All">Semua Kategori</option>
                        {["karung", "logam", "filter cloth", "kelistrikan", "Valve", "benang", "rubber"].map(cat => (
                          <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Vendor</label>
                      <select
                        value={analisaFilterVendor}
                        onChange={(e) => setAnalisaFilterVendor(e.target.value)}
                        className="w-full border border-slate-250 hover:border-slate-400 focus:border-slate-600 rounded-xl px-3 py-2 font-bold text-slate-800 bg-white shadow-xs focus:ring-1 focus:ring-slate-500/20 truncate"
                      >
                        <option value="All">Semua Vendor</option>
                        {Array.from(new Set(registrations.map(r => r.vendor))).filter(Boolean).map(vendor => (
                          <option key={vendor} value={vendor}>{vendor}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Middle Column: Rentang Tanggal */}
                  <div className="md:col-span-4 grid grid-cols-2 gap-3 border-t md:border-t-0 md:border-l border-slate-100 md:pl-4">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Mulai Tanggal</label>
                      <input
                        type="date"
                        value={analisaFilterStartDate}
                        onChange={(e) => setAnalisaFilterStartDate(e.target.value)}
                        className="w-full border border-slate-250 hover:border-slate-400 focus:border-slate-600 rounded-xl px-3 py-1.5 font-bold text-slate-800 bg-white shadow-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Selesai Tanggal</label>
                      <input
                        type="date"
                        value={analisaFilterEndDate}
                        onChange={(e) => setAnalisaFilterEndDate(e.target.value)}
                        className="w-full border border-slate-250 hover:border-slate-400 focus:border-slate-600 rounded-xl px-3 py-1.5 font-bold text-slate-800 bg-white shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Right Column: Bulan & Tahun Spesifik */}
                  <div className="md:col-span-3 grid grid-cols-2 gap-3 border-t md:border-t-0 md:border-l border-slate-100 md:pl-4">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Bulan</label>
                      <select
                        value={analisaFilterMonth}
                        onChange={(e) => setAnalisaFilterMonth(e.target.value)}
                        className="w-full border border-slate-250 hover:border-slate-400 focus:border-slate-600 rounded-xl px-2.5 py-2 font-bold text-slate-800 bg-white shadow-xs"
                      >
                        <option value="All">Semua Bulan</option>
                        {indonesianMonths.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Tahun</label>
                      <select
                        value={analisaFilterYear}
                        onChange={(e) => setAnalisaFilterYear(e.target.value)}
                        className="w-full border border-slate-250 hover:border-slate-400 focus:border-slate-600 rounded-xl px-2.5 py-2 font-bold text-slate-800 bg-white shadow-xs"
                      >
                        <option value="All">Semua Tahun</option>
                        {uniqueAnalisaYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Date Type Selector Line */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-600">
                  <div className="flex items-center gap-3">
                    <span>📅 Tipe Tanggal Acuan:</span>
                    <div className="flex items-center gap-3.5">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="analisaDateType"
                          checked={analisaFilterDateType === "ppj"}
                          onChange={() => setAnalisaFilterDateType("ppj")}
                          className="w-3.5 h-3.5 cursor-pointer text-[#006A4E]"
                        />
                        <span>Tanggal PPJ</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="analisaDateType"
                          checked={analisaFilterDateType === "diterima"}
                          onChange={() => setAnalisaFilterDateType("diterima")}
                          className="w-3.5 h-3.5 cursor-pointer text-[#006A4E]"
                        />
                        <span>Tanggal Diterima</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="analisaDateType"
                          checked={analisaFilterDateType === "terbit"}
                          onChange={() => setAnalisaFilterDateType("terbit")}
                          className="w-3.5 h-3.5 cursor-pointer text-[#006A4E]"
                        />
                        <span>Tanggal Terbit / Uji</span>
                      </label>
                    </div>
                  </div>
                  {hasActiveFilters && (
                    <div className="text-[#006A4E] bg-emerald-50 border border-emerald-100 rounded px-2.5 py-1 font-mono text-[10px]">
                      Ditemukan: <strong>{totalItemsFiltered}</strong> dari {registrations.length} unit
                    </div>
                  )}
                </div>
              </div>

              {/* Bento Metrics grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-1">
                  <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Total Sampel</span>
                  <p className="text-3xl font-black text-slate-900">{totalItemsFiltered}</p>
                  <div className="text-[10px] text-slate-400">Total terdata di sistem</div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm space-y-1">
                  <span className="text-xs font-bold text-emerald-800 block uppercase tracking-wider">Dokumen Selesai</span>
                  <p className="text-3xl font-black text-emerald-950">{publishedCountFiltered}</p>
                  <div className="text-[10px] text-emerald-700">Tergabung terbit resmi</div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 shadow-sm space-y-1">
                  <span className="text-xs font-bold text-amber-800 block uppercase tracking-wider">Sedang Diuji</span>
                  <p className="text-3xl font-black text-amber-950">{testedCountFiltered + reviewCountFiltered}</p>
                  <div className="text-[10px] text-amber-700">Dalam pengerjaan uji & review</div>
                </div>

                <div className="bg-red-50 border border-red-100 rounded-2xl p-5 shadow-sm space-y-1">
                  <span className="text-xs font-bold text-red-800 block uppercase tracking-wider">Deviasi Suku Cadang</span>
                  <p className="text-3xl font-black text-red-950">{offSpecFiltered}</p>
                  <div className="text-[10px] text-red-700">Barang diluar standar acuan (*)</div>
                </div>

              </div>

              {/* Modern Compliance Donut Chart Card */}
              <div className="bg-white border rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 max-w-[320px]">
                  <h3 className="font-extrabold text-slate-800 text-sm">Status Kepatuhan Kualitas (On-Spec vs Off-Spec)</h3>
                  <p className="text-xs text-slate-500">Persentase item yang berhasil lolos pengujian secara presisi terhadap standar acuan teknis.</p>
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-full bg-emerald-600 block shrink-0" />
                      <span className="font-bold text-slate-700">On-Spec (Sesuai Standar): {onSpecFiltered} unit ({pctOnSpec.toFixed(1)}%)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-full bg-rose-600 block shrink-0" />
                      <span className="font-bold text-slate-700">Off-Spec (Butuh Koreksi): {offSpecFiltered} unit ({pctOffSpec.toFixed(1)}%)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-full bg-slate-300 block shrink-0" />
                      <span className="font-bold text-slate-700">Belum Diuji (Draft): {draftSpecFiltered} unit ({pctDraft.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>
                <div className="relative flex items-center justify-center">
                  <div className="w-36 h-36 rounded-full border border-slate-100 flex items-center justify-center relative shadow-inner" style={{
                    background: `conic-gradient(#10b981 0% ${pctOnSpec}%, #f43f5e ${pctOnSpec} % ${pctOnSpec + pctOffSpec}%, #cbd5e1 ${pctOnSpec + pctOffSpec}% 100%)`
                  } as any}>
                    {/* Inner white cutout for donut effect */}
                    <div className="w-24 h-24 bg-white rounded-full shadow-md flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 block">Kepatuhan</span>
                      <span className="text-xl font-black text-slate-900">
                        {totalSpecCount - draftSpecFiltered > 0 ? ((onSpecFiltered / (totalSpecCount - draftSpecFiltered)) * 100).toFixed(0) : "0"}%
                      </span>
                      <span className="text-[8px] text-slate-500 font-bold font-mono">ON-SPEC RATE</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Category charts visualizer */}
                <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-extrabold text-slate-900 text-sm">Analisis Kepatuhan per Kategori Sampel</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-650 font-bold px-2 py-1 rounded">On-Spec vs Off-Spec</span>
                  </div>
                  <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                    {categoryStatsFiltered.map(stat => {
                      const catTotal = stat.total;
                      const catOnSpecPct = catTotal > 0 ? (stat.onspec / catTotal) * 100 : 0;
                      const catOffSpecPct = catTotal > 0 ? (stat.offspec / catTotal) * 100 : 0;
                      const catDraftPct = catTotal > 0 ? (stat.draft / catTotal) * 100 : 0;
                      return (
                        <div key={stat.category} className="border border-slate-100 rounded-2xl p-4 hover:bg-slate-50/30 transition-all space-y-2.5">
                          <div className="flex justify-between items-center text-xs font-black uppercase text-slate-800">
                            <span className="tracking-wide">{stat.category}</span>
                            <span className="text-slate-500 font-mono text-[10px]">{stat.total} Unit</span>
                          </div>
                          
                          {/* Stacked Composition Bar */}
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                            {stat.onspec > 0 && (
                              <div 
                                className="bg-emerald-600 h-full transition-all hover:opacity-90"
                                style={{ width: `${catOnSpecPct}%` }}
                                title={`On-spec: ${stat.onspec}`}
                              />
                            )}
                            {stat.offspec > 0 && (
                              <div 
                                className="bg-rose-500 h-full transition-all hover:opacity-90"
                                style={{ width: `${catOffSpecPct}%` }}
                                title={`Off-spec: ${stat.offspec}`}
                              />
                            )}
                            {stat.draft > 0 && (
                              <div 
                                className="bg-slate-300 h-full transition-all hover:opacity-90"
                                style={{ width: `${catDraftPct}%` }}
                                title={`Awaiting: ${stat.draft}`}
                              />
                            )}
                          </div>

                          {/* Detailed Labels */}
                          <div className="flex justify-between items-center text-[10px] text-slate-600 font-bold">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-600 block shrink-0" />
                              <span>On-Spec: {stat.onspec}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500 block shrink-0" />
                              <span>Off-Spec: {stat.offspec}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-slate-300 block shrink-0" />
                              <span>Draft: {stat.draft}</span>
                            </div>
                          </div>

                          <div className="pt-1.5 border-t border-dashed border-slate-150 flex justify-between items-center text-[10px]">
                            <span className="text-slate-400 font-bold">On-Spec Rate:</span>
                            <span className={`font-mono font-black ${stat.complianceRate >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {stat.complianceRate.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Outstanding Vendors info log list */}
                <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-extrabold text-slate-900 text-sm">Peringkat Kepatuhan Kualitas Vendor</h3>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 font-black border border-emerald-100 rounded px-1.5 py-0.5">Top Active Vendors</span>
                  </div>
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                    {vendorStatsFiltered.slice(0, 15).map((stat, i) => {
                      return (
                        <div key={i} className="flex flex-col gap-1.5 text-xs border-b pb-2.5">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-100 text-slate-700 font-black font-mono w-5 h-5 flex items-center justify-center rounded text-[10px]">
                                {i + 1}
                              </span>
                              <span className="font-black text-slate-800 uppercase truncate max-w-[150px]" title={stat.vendor}>{stat.vendor}</span>
                            </div>
                            <span className="font-bold text-slate-500 font-mono text-[10px]">{stat.total} Sampel ({stat.draft} Draft)</span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-3 text-[10px]">
                            <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                              <div className="bg-emerald-600 h-full" style={{ width: `${stat.complianceRate}%` }} />
                              <div className="bg-rose-500 h-full" style={{ width: `${100 - stat.complianceRate}%` }} />
                            </div>
                            <span className="font-mono font-black text-slate-850 shrink-0">
                              {stat.tested > 0 ? `Compliance: ${stat.complianceRate.toFixed(0)}%` : "Belum ada uji"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {vendorStatsFiltered.length === 0 && (
                      <p className="text-slate-400 italic text-center text-xs py-10">Belum ada data vendor teruji.</p>
                    )}
                  </div>
                </div>

                {/* Trend timeline line visualization */}
                <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4 lg:col-span-2">
                  <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-extrabold text-slate-900 text-sm">Tren Pengujian & Sertifikasi Sampel Bulanan</h3>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">Timeline ITRK 2026</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div className="md:col-span-1 space-y-2">
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Rata-rata Bulanan</span>
                        <p className="text-2xl font-black text-slate-800">
                          {sortedMonthsFiltered.length > 0 ? (totalItemsFiltered / sortedMonthsFiltered.length).toFixed(1) : "0"}
                        </p>
                        <span className="text-[10px] text-slate-500 font-bold block">Unit / Bulan</span>
                      </div>
                    </div>
                    <div className="md:col-span-3 flex items-end justify-between gap-2 h-40 pt-4 px-2 select-none">
                      {sortedMonthsFiltered.map((month) => {
                        const maxCount = Math.max(...sortedMonthsFiltered.map(m => m.total), 1);
                        const totalHeight = (month.total / maxCount) * 100;

                        return (
                          <div key={month.key} className="flex-1 flex flex-col items-center gap-2 group relative">
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full mb-2 bg-slate-900 text-white font-mono text-[9px] px-2.5 py-1.5 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap space-y-1">
                              <div className="font-black border-b border-slate-700 pb-0.5">{month.monthName}</div>
                              <div>Total: {month.total} unit</div>
                              <div className="text-emerald-400">✓ On-Spec: {month.onspec}</div>
                              <div className="text-rose-400">✗ Off-Spec: {month.offspec}</div>
                              <div className="text-slate-400">⏱ Draft: {month.draft}</div>
                            </div>

                            {/* Stacked Visual Bar */}
                            <div className="w-full bg-slate-100 rounded-t-lg overflow-hidden flex flex-col-reverse justify-start shadow-sm hover:brightness-95 transition-all" style={{ height: `${Math.max(totalHeight, 15)}%`, minHeight: '24px' }}>
                              <div className="bg-emerald-600 shrink-0" style={{ height: `${month.total > 0 ? (month.onspec / month.total) * 100 : 0}%` }} />
                              <div className="bg-rose-500 shrink-0" style={{ height: `${month.total > 0 ? (month.offspec / month.total) * 100 : 0}%` }} />
                              <div className="bg-slate-300 shrink-0" style={{ height: `${month.total > 0 ? (month.draft / month.total) * 100 : 0}%` }} />
                            </div>

                            <span className="text-[10px] font-bold text-slate-500 font-mono truncate max-w-full">
                              {month.monthName}
                            </span>
                          </div>
                        );
                      })}
                      {sortedMonthsFiltered.length === 0 && (
                        <p className="text-slate-400 italic text-center w-full py-10">Belum ada data bulanan.</p>
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          );
        })()}

        {/* 6. TAB MASTER DATABASE */}
        {activeTab === "master" && (
          <div className="space-y-6 bg-slate-50/20 p-1 rounded-3xl">
            
            {/* Batch Upload / Excel Import Card - Requirement 2 */}
            <div className="bg-white border hover:border-slate-300 rounded-3xl p-6 shadow-sm space-y-4 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 rounded-2xl text-[#006A4E]">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">Batch Import Database Standard Mutu</h3>
                  <p className="text-xs text-slate-500">Unggah file Excel (.xlsx) atau .csv untuk mempulas data acuan secara massal tanpa input manual.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 border-2 border-dashed border-slate-200 hover:border-[#006A4E] rounded-2xl p-6 transition-all flex flex-col items-center justify-center text-center text-xs relative cursor-pointer bg-slate-50/50 hover:bg-emerald-50/10 group">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const parsedList = await parseExcelOrCsvStandards(file);
                        if (parsedList.length === 0) {
                          alert("File tidak berisi data standard acuan yang cocok.");
                          return;
                        }
                        askConfirmation(
                          `Sistem mendeteksi ${parsedList.length} standard mutu mandiri di dalam dokumen ${file.name}. Teruskan impor data standard tersebut ke server?`,
                          () => {
                            handleBulkImportStandards(parsedList);
                          }
                        );
                      } catch (err: any) {
                        alert("Gagal mem-parsing berkas excel: " + err.message);
                      }
                      e.target.value = "";
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  <div className="space-y-2 pointer-events-none select-none">
                    <div className="mx-auto w-10 h-10 bg-emerald-50 text-[#006A4E] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-extrabold text-[#006A4E]">Seret berkas excel atau csv milik Anda di sini</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Mendukung standard format file excel .xlsx / .xls maupun comma-separated value .csv</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-[11px] text-slate-600 space-y-2 font-medium">
                  <p className="font-extrabold text-slate-800 flex items-center gap-1.5 border-b pb-1">
                    <span className="p-1 bg-amber-100 text-amber-800 rounded-md font-bold">INFO</span>
                    Struktur Format Batas Uji:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-500 leading-relaxed">
                    <li><strong className="text-slate-700">Kategori:</strong> logam, karung, benang, rubber, Valve, dsb.</li>
                    <li><strong className="text-slate-700">Nama:</strong> grade material (e.g. WP304L, CF8M, dsb.)</li>
                    <li><strong className="text-slate-700">Acuan:</strong> sumber rujukan standard (e.g. ASTM A403)</li>
                    <li><strong className="text-slate-700">Bentuk Produk:</strong> (Khusus Logam) e.g. Seamless & Welded Pipes</li>
                    <li><strong className="text-slate-700">Parameter:</strong> nama unsur uji rincian uji, satuan, serta spec.</li>
                  </ul>
                  <div className="pt-2.5 border-t border-slate-200 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const wb = XLSX.utils.book_new();
                          const ws = XLSX.utils.aoa_to_sheet([
                            ["Kategori", "Nama", "Acuan", "Parameter", "Satuan", "Batas", "Bentuk"],
                            ["logam", "B8M", "ASTM A240", "Mn", "%", "2 max", "Plate"],
                            ["logam", "B8M", "ASTM A240", "Cr", "%", "16.00-18.00", "Plate"],
                            ["logam", "B8M", "ASTM A240", "Ni", "%", "10.00-14.00", "Plate"],
                            ["logam", "B8M", "ASTM A240", "Mo", "%", "2.00-3.00", "Plate"],
                            ["logam", "CF8M", "ASTM A351", "Cr", "%", "18.00-21.00", "Valve Component"],
                            ["logam", "CF8M", "ASTM A351", "Ni", "%", "9.00-12.00", "Valve Component"],
                            ["benang", "Standard benang jahit karung PG", "KSM-B01", "Kuat Tarik", "cN", "min 150", "Bag Stitching Threads"],
                            ["karung", "Karung Plastik PP", "KSM-A20", "Hardness", "Shore A", "70-90", "Packaging Bags"],
                            ["Valve", "Standard Pressure Test Workshop PG", "API 598", "Shell Hydrostatic Test", "Text", "LULUS", "Flanged Valve"]
                          ]);
                          XLSX.utils.book_append_sheet(wb, ws, "Standard Mutu Template");
                          const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                          const blob = new Blob([wbout], { type: "application/octet-stream" });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.setAttribute("href", url);
                          link.setAttribute("download", "template_database_standard_mutu.xlsx");
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          showToast("Berhasil mendownload template Excel standard mutu!", "success");
                        } catch (err: any) {
                          showToast("Gagal men-generate file Excel: " + err.message, "error");
                        }
                      }}
                      className="w-full bg-[#006A4E] hover:bg-emerald-800 text-white font-extrabold text-[10px] py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm border border-emerald-950/20"
                    >
                      <span>📥</span> Download Excel (.xlsx) Template
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Firebase integration card */}
            <div className="bg-white border hover:border-slate-300 rounded-3xl p-6 shadow-sm space-y-4 transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-orange-50 rounded-2xl text-orange-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base tracking-tight flex items-center gap-2">
                      Koneksi &amp; Sinkronisasi Cloud Firestore
                      {firebaseStatusLoading ? (
                        <span className="text-xs text-slate-400 font-normal">Memuat...</span>
                      ) : firebaseStatus?.connectionTest === "Success" ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-black uppercase">Terhubung</span>
                      ) : (
                        <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.5 rounded-full font-black uppercase font-sans">Belum Terkoneksi</span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500">Gunakan panel ini untuk memonitor, mencocokkan, dan memaksa sinkronisasi/migrasi data lokal Anda ke Google Cloud Firestore secara real-time.</p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={fetchFirebaseStatus}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer border flex items-center gap-1.5 self-start md:self-auto"
                >
                  🔄 Perbarui Status
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* Column 1: Config Info */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Detail Project &amp; Database</h4>
                  {firebaseStatus?.configExists ? (
                    <div className="space-y-2 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Project ID</span>
                        <span className="text-slate-800 font-bold break-all">{firebaseStatus?.config?.projectId || "new-iris-f6f26"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Database ID</span>
                        <span className="text-slate-800 font-bold break-all">{firebaseStatus?.config?.firestoreDatabaseId || "default"}</span>
                      </div>
                      <div className="pt-1.5 text-[10px] font-sans text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-lg flex items-center gap-1.5">
                        <span>✓</span> Kredensial Firebase aktif terdeteksi di lingkungan server!
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl font-medium">
                      Konfigurasi Firebase belum terdeteksi. Silakan jalankan inisialisasi Firebase di platform.
                    </div>
                  )}
                </div>

                {/* Column 2: Stats comparison */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Statistik Record Data</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-xl border flex flex-col justify-between">
                      <span className="text-slate-500 text-[10px] font-semibold">Registrasi (Lokal)</span>
                      <strong className="text-slate-800 text-sm mt-1">{registrations.length}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border flex flex-col justify-between">
                      <span className="text-slate-500 text-[10px] font-semibold">Registrasi (Cloud)</span>
                      <strong className="text-slate-800 text-sm mt-1">{firebaseStatus?.stats?.registrations ?? 0}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border flex flex-col justify-between">
                      <span className="text-slate-500 text-[10px] font-semibold">Standard (Lokal)</span>
                      <strong className="text-slate-800 text-sm mt-1">{standards.length}</strong>
                    </div>
                    <div className="bg-white p-2 rounded-xl border flex flex-col justify-between">
                      <span className="text-slate-500 text-[10px] font-semibold">Standard (Cloud)</span>
                      <strong className="text-slate-800 text-sm mt-1">{firebaseStatus?.stats?.standards ?? 0}</strong>
                    </div>
                  </div>
                  {firebaseStatus?.connectionTest === "Failed" && (
                    <div className="text-[10px] font-medium text-rose-700 bg-rose-50 p-2 rounded-lg break-words">
                      Gagal membaca Firestore: {firebaseStatus.errorMsg}
                    </div>
                  )}
                </div>

                {/* Column 3: Billing limits and Migration Action */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Info Kuota &amp; Plan Free (Spark)</h4>
                    
                    {/* Visual Progress Bar & Percentage Usage */}
                    {(() => {
                      const dbBytes = firebaseStatus?.dbSizeBytes || 0;
                      const limitBytes = firebaseStatus?.limitBytes || 1073741824;
                      const pct = (dbBytes / limitBytes) * 100;
                      
                      const formatSize = (b: number) => {
                        if (b === 0) return "0 B";
                        const k = 1024;
                        const sizes = ["Bytes", "KB", "MB", "GB"];
                        const i = Math.floor(Math.log(b) / Math.log(k));
                        return parseFloat((b / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
                      };

                      return (
                        <div className="space-y-1 bg-white p-2.5 rounded-xl border">
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                            <span>Sisa Kuota Disk</span>
                            <span className="text-orange-600 font-extrabold">{(100 - pct).toFixed(4)}% Tersedia</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border">
                            <div 
                              className="bg-orange-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${Math.max(0.8, Math.min(100, pct))}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-mono text-slate-500">
                            <span>Terpakai: {formatSize(dbBytes)} ({pct.toFixed(4)}%)</span>
                            <span>Limit: {formatSize(limitBytes)}</span>
                          </div>
                        </div>
                      );
                    })()}

                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      Penyimpanan 1 GiB setara dengan <strong>1.07 Miliar Karakter (Bytes)</strong>. Untuk data teks registrasi (~1 KB per berkas), ini dapat menampung hingga <strong>1.000.000+ data registrasi</strong>.
                    </p>
                    <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                      Dengan 10.000 registrasi/tahun, penyimpanan Anda baru akan penuh dalam waktu <strong>100+ tahun</strong>!
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isSyncingFirebase || !firebaseStatus?.configExists}
                      onClick={async () => {
                        setIsSyncingFirebase(true);
                        try {
                          const res = await fetch("/api/firebase/force-sync", { method: "POST" });
                          if (res.ok) {
                            const data = await res.json();
                            if (data.success) {
                              showToast(`Berhasil migrasi data lokal ke Firestore! Synced: ${data.synced.registrations} registrasi, ${data.synced.standards} standar.`, "success");
                              fetchFirebaseStatus();
                              if (typeof onDataRefresh === "function") onDataRefresh();
                              return;
                            }
                          }
                          throw new Error("API not available or returned error");
                        } catch (err: any) {
                          console.warn("Backend API force-sync failed or unavailable. Initiating client-side direct seed to Firestore...");
                          try {
                            // Seed standards
                            for (const std of DEFAULT_STANDARDS) {
                              await setDoc(doc(db, "standards", std.id), std);
                            }
                            // Seed signatures
                            for (const sig of DEFAULT_SIGNATURES) {
                              await setDoc(doc(db, "signatures", sig.id), sig);
                            }
                            // Seed registrations
                            for (const reg of DEFAULT_REGISTRATIONS) {
                              await setDoc(doc(db, "registrations", reg.id), reg);
                            }
                            // Seed users
                            for (const user of DEFAULT_USERS) {
                              await setDoc(doc(db, "users", user.username), user);
                            }
                            
                            showToast("Berhasil menginisialisasi / migrasi seluruh data sampel langsung ke Cloud Firestore!", "success");
                            fetchFirebaseStatus();
                            if (typeof onDataRefresh === "function") onDataRefresh();
                          } catch (clientErr: any) {
                            console.error("Client-side seeding failed:", clientErr);
                            showToast("Gagal melakukan migrasi data: " + clientErr.message, "error");
                          }
                        } finally {
                          setIsSyncingFirebase(false);
                        }
                      }}
                      className={`w-full text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm border ${
                        isSyncingFirebase 
                          ? "bg-slate-400 border-slate-500 cursor-not-allowed" 
                          : "bg-orange-600 hover:bg-orange-700 border-orange-800/20 active:scale-[0.98]"
                      }`}
                    >
                      {isSyncingFirebase ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Memigrasikan Data...
                        </>
                      ) : (
                        "🚀 Paksa Migrasi Data ke Firestore"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Add standard grades */}
              <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Atur Standard Acuan & Grade (ASTM / KSM)</h3>
                
                <form onSubmit={handleAddStandard} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600 block">Kategori Uji</label>
                      <select
                        value={newStdCategory}
                        onChange={(e) => setNewStdCategory(e.target.value)}
                        className="w-full border p-2 rounded-lg bg-slate-50 text-slate-900"
                      >
                        <option value="logam">Logam</option>
                        <option value="karung">Karung</option>
                        <option value="benang">Benang</option>
                        <option value="kelistrikan">Kelistrikan</option>
                        <option value="Valve">Valve</option>
                        <option value="filter cloth">Filter Cloth</option>
                        <option value="rubber">Rubber</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block bg-slate-100 px-2 py-0.5 rounded inline-block text-xs">
                        {newStdCategory === "logam" ? "Nama Standard Grade" : "Nama Standard Acuan"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={newStdCategory === "logam" ? "Contoh: WP304L, CF8M, F316" : "Contoh: KSM-K10, API 598, SNI-09"}
                        value={newStdName}
                        onChange={(e) => setNewStdName(e.target.value)}
                        className="w-full border p-2 rounded-lg bg-white text-slate-800 font-bold"
                      />
                    </div>
                  </div>

                  {newStdCategory === "logam" ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block bg-slate-100 px-2 py-0.5 rounded inline-block text-xs">
                          Acuan Standard (E.g. ASTM / ASME) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: ASTM A403, ASTM A182"
                          value={newStdSource}
                          onChange={(e) => setNewStdSource(e.target.value)}
                          className="w-full border p-2 rounded-lg bg-white text-slate-800 font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block bg-slate-100 px-2 py-0.5 rounded inline-block text-xs">
                          Bentuk Produk (Product Form) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Plate / Sheet / Strip, Seamless & Welded Pipes, Bars & Shapes"
                          value={newStdDescription}
                          onChange={(e) => setNewStdDescription(e.target.value)}
                          className="w-full border p-2 rounded-lg bg-white text-slate-800 font-medium"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block bg-slate-100 px-2 py-0.5 rounded inline-block text-xs">
                        Keterangan atau Sumber Terbit (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: KSM INTERNAL, DEFAULT"
                        value={newStdSource}
                        onChange={(e) => setNewStdSource(e.target.value)}
                        className="w-full border p-2 rounded-lg bg-white text-slate-800"
                      />
                    </div>
                  )}

                  {(newStdCategory === "karung" || newStdCategory === "benang") && (
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded inline-block text-xs border border-emerald-250">
                        Nama Karung / Deskripsi Ter-standarisasi (Default Nama Karung)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: PHONSKA SUB 50KG, UREA SUB 50KG, BENANG"
                        value={newStdDefaultNamaKarung}
                        onChange={(e) => setNewStdDefaultNamaKarung(e.target.value)}
                        className="w-full border border-emerald-350 p-2 rounded-lg bg-emerald-50/50 text-emerald-950 font-semibold"
                      />
                    </div>
                  )}

                  {/* Dynamic parameters input list inside standard creator */}
                  <div className="space-y-2 border-t pt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-700">Nilai Parameter & Spec Batasan</span>
                      <button
                        type="button"
                        onClick={addParamRow}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold px-2 py-1 rounded cursor-pointer"
                      >
                        + Tambah Baris
                      </button>
                    </div>

                    {newStdParams.map((p, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Nama (Mis. % Cr)"
                          value={p.name}
                          onChange={(e) => {
                            const updated = [...newStdParams];
                            updated[idx].name = e.target.value;
                            setNewStdParams(updated);
                          }}
                          className="w-full border p-1 rounded font-mono text-slate-700"
                        />
                        <input
                          type="text"
                          placeholder="Satuan (Mis %)"
                          value={p.unit}
                          onChange={(e) => {
                            const updated = [...newStdParams];
                            updated[idx].unit = e.target.value;
                            setNewStdParams(updated);
                          }}
                          className="w-20 border p-1 rounded font-mono text-slate-700"
                        />
                        <input
                          type="text"
                          placeholder="Spec (18.00-20.00)"
                          value={p.spec}
                          onChange={(e) => {
                            const updated = [...newStdParams];
                            updated[idx].spec = e.target.value;
                            setNewStdParams(updated);
                          }}
                          className="w-full border p-1 rounded font-mono text-slate-700"
                        />
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => removeParamRow(idx)}
                            className="text-red-500 font-bold px-1.5"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#006A4E] hover:bg-emerald-800 text-white font-bold py-2 rounded-lg cursor-pointer"
                  >
                    Simpan Standard Mutu
                  </button>
                </form>
              </div>

              {/* Configure signature block */}
              <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="font-bold text-slate-900 text-sm">Signatures Pejabat ITRK (Penerbitan Laporan)</h3>
                  {!canReview && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full font-bold border border-amber-100">Hanya Baca</span>
                  )}
                </div>
                
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {signatures.map(sig => (
                    <div key={sig.id} className="group border rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2 text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 uppercase">
                            {sig.name}
                            {sig.active && (
                              <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase">Aktif</span>
                            )}
                          </p>
                          <p className="text-slate-500 font-semibold text-[10px] uppercase tracking-wide mt-0.5">{sig.position}</p>
                          <p className="text-slate-400 font-mono text-[9px] mt-0.5">INISIAL: <strong className="text-slate-600">{sig.initials}</strong> | TIPE: <strong className="text-slate-600 uppercase">{sig.signatureType || "qrcode"}</strong></p>
                        </div>
                        
                        {canReview && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleSignature(sig.id)}
                              className={`font-bold px-2.5 py-1 rounded-lg text-[10px] transition-all cursor-pointer border ${
                                sig.active 
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" 
                                  : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"
                              }`}
                            >
                              {sig.active ? "Aktif" : "Pilih Aktif"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditSignatureClick(sig)}
                              className="text-[#006A4E] hover:text-emerald-800 font-extrabold text-[10px] bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              Edit/TTD
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                askConfirmation(
                                  "Apakah Anda yakin ingin menghapus pejabat penandatangan ini?",
                                  () => handleDeleteSignature(sig.id)
                                );
                              }}
                              className="text-rose-600 hover:text-rose-800 font-extrabold text-[10px] bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 hover:bg-rose-100 transition-colors cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {signatures.length === 0 && (
                    <p className="text-slate-400 italic text-center text-xs py-6">Belum ada pejabat penandatangan terdaftar.</p>
                  )}
                </div>

                {canReview ? (
                  <form onSubmit={handleAddSignature} className="space-y-3 text-xs border-t pt-4">
                    <h4 className="font-extrabold text-slate-800">Daftarkan Pejabat Baru</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Nama Lengkap & Gelar</label>
                        <input
                          type="text"
                          required
                          placeholder="Mis. Ir. Ragil, M.T."
                          value={newSigName}
                          onChange={(e) => setNewSigName(e.target.value)}
                          className="w-full border p-2 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Nama Jabatan (Posisi)</label>
                        <input
                          type="text"
                          required
                          placeholder="Mis. VP Inspeksi Rotating"
                          value={newSigPosition}
                          onChange={(e) => setNewSigPosition(e.target.value)}
                          className="w-full border p-2 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 items-end">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500">Inisial Tanda Tangan (Max 3 Karakter)</label>
                        <input
                          type="text"
                          maxLength={3}
                          required
                          placeholder="Contoh: RS, BS"
                          value={newSigInitials}
                          onChange={(e) => setNewSigInitials(e.target.value)}
                          className="w-full border p-2 rounded bg-white font-mono text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                      <button 
                        type="submit" 
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold py-2 rounded-lg cursor-pointer transition-colors shadow-sm"
                      >
                        + Tambahkan Pejabat
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-amber-50 text-amber-800 border border-amber-100 rounded-xl p-3 text-[10px] font-medium leading-relaxed">
                    Hanya Reviewer dan Superadmin yang memiliki wewenang untuk menambah, mengubah, menghapus, atau men-toggle status keaktifan pejabat penandatangan ITRK.
                  </div>
                )}
              </div>

              {/* Full-width Card to view active standards by category */}
              <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4 col-span-1 lg:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Katalog Standard Acuan Terdaftar</h3>
                    <p className="text-xs text-slate-500">Pilih tab kategori dibawah ini untuk memfilter daftar acuan mutu dan spesifikasi yang aktif di laboratorium ITRK.</p>
                  </div>
                </div>

                {/* Categories Tab bar - Fulfills Requirement 3 */}
                <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {["logam", "karung", "benang", "kelistrikan", "Valve", "filter cloth", "rubber"].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setActiveMasterCatTab(cat);
                        setMasterSearch("");
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer ${
                        activeMasterCatTab === cat
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-950 hover:bg-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Search Master DB */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="relative w-full sm:max-w-xs">
                    <input
                      type="text"
                      placeholder="Cari nama standard, sumber acuan, dll..."
                      value={masterSearch}
                      onChange={(e) => setMasterSearch(e.target.value)}
                      className="w-full pl-3.5 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/15 focus:border-slate-800 transition-all font-semibold text-slate-850"
                    />
                    {masterSearch && (
                      <button 
                        type="button" 
                        onClick={() => setMasterSearch("")} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-extrabold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="text-slate-500 text-[10px] font-mono">
                    Menampilkan <strong>{getFilteredMasters().length}</strong> dari {standards.filter(s => s.category === activeMasterCatTab).length} standard
                  </div>
                </div>

                {/* Standards Table */}
                <div className="overflow-x-auto max-h-96 overflow-y-auto border rounded-xl bg-white">
                  <table className="w-full text-left text-xs font-sans">
                    <thead>
                      <tr className="bg-slate-50 border-b font-extrabold text-slate-605 uppercase select-none">
                        <th 
                          className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => handleSortMaster("name")}
                        >
                          {activeMasterCatTab === "logam" ? "Grade Logam / Material" : "Standard Acuan (KSM / PO)"} {renderSortIndicator("name", masterSortKey, masterSortDir)}
                        </th>
                        <th 
                          className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => handleSortMaster("source")}
                        >
                          {activeMasterCatTab === "logam" ? "Acuan Standard (E.g. ASTM)" : "Sumber Penerbit"} {renderSortIndicator("source", masterSortKey, masterSortDir)}
                        </th>
                        <th className="p-3">Deskripsi / Keterangan</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getFilteredMasters().slice((masterPage - 1) * 10, masterPage * 10).map((std, sIdx) => (
                        <tr key={std.id || sIdx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 font-extrabold text-slate-800 uppercase">
                            <span className="bg-slate-150 px-1 py-0.5 rounded text-[10px] text-slate-500 mr-2 uppercase font-mono">
                              {activeMasterCatTab === "logam" ? "Grade" : "Acuan"}
                            </span>
                            {std.name}
                          </td>
                          <td className="p-3 font-semibold text-slate-500 uppercase">
                            {activeMasterCatTab !== "logam" && (!std.source || std.source === "KSM INTERNAL") ? (
                              <span className="text-slate-400 italic">KSM INTERNAL</span>
                            ) : (
                              std.source
                            )}
                          </td>
                          <td className="p-3 font-medium text-slate-600">
                            {std.description || <span className="text-slate-400 italic">-</span>}
                          </td>
                          <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setViewingStandardDetail(std)}
                              className="text-indigo-600 hover:text-indigo-800 font-extrabold text-[11px] bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors cursor-pointer"
                            >
                              Detail
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditStandardClick(std)}
                              className="text-[#006A4E] hover:text-emerald-800 font-extrabold text-[11px] bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                askConfirmation(
                                  "Apakah Anda yakin ingin menghapus standard acuan ini?",
                                  () => handleDeleteStandard(std.id)
                                );
                              }}
                              className="text-rose-600 hover:text-rose-800 font-extrabold text-[11px] bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 hover:bg-rose-100 transition-colors cursor-pointer"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                      {getFilteredMasters().length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-10 text-center text-slate-400 italic font-medium bg-slate-50/20">
                            Tidak ditemukan standard terdaftar yang cocok dengan pencarian Anda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationControl
                  currentPage={masterPage}
                  totalItems={getFilteredMasters().length}
                  pageSize={10}
                  onPageChange={(page) => setMasterPage(page)}
                />
              </div>
            </div>
          </div>
        )}

        {/* 7. TAB ARSIP (RAW-DATA) */}
        {activeTab === "arsip" && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Pusat Arsip RAW DATA ITRK (Database Terpusat)</h3>
                  <p className="text-xs text-slate-500">Menyajikan seluruh riwayat material termasuk parameter yang tidak dicetak di sertifikat unduh.</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedArsipRegs.length > 0 && (
                    <button
                      onClick={() => setSelectedArsipRegs([])}
                      className="text-xs text-rose-600 font-bold hover:underline bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 cursor-pointer transition-colors"
                    >
                      Batal Pilih
                    </button>
                  )}
                  <button
                    onClick={handleExportArchiveCsv}
                    className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    {selectedArsipRegs.length > 0 
                      ? `Ekspor ${selectedArsipRegs.length} Item Terpilih ke Excel (.csv)` 
                      : "Ekspor database ke Excel (.csv)"
                    }
                  </button>
                </div>
              </div>

              {/* Search Arsip */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div className="relative w-full sm:max-w-xs">
                  <input
                    type="text"
                    placeholder="Cari dalam pusat arsip..."
                    value={arsipSearch}
                    onChange={(e) => setArsipSearch(e.target.value)}
                    className="w-full pl-3.5 pr-8 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-slate-500/15 focus:border-slate-800 transition-all font-semibold text-slate-850"
                  />
                  {arsipSearch && (
                    <button 
                      type="button" 
                      onClick={() => setArsipSearch("")} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-extrabold"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="text-slate-500 text-[10px] font-mono">
                  Menampilkan <strong>{getFilteredArsips().length}</strong> dari {registrations.length} arsip total {selectedArsipRegs.length > 0 && `(${selectedArsipRegs.length} Terpilih)`}
                </div>
              </div>

              <div className="overflow-x-auto text-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b text-xs font-bold text-slate-500 uppercase bg-slate-50/50 select-none">
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={getFilteredArsips().length > 0 && getFilteredArsips().every(reg => selectedArsipRegs.includes(reg.id))}
                          onChange={() => {
                            const isAllSelected = getFilteredArsips().length > 0 && getFilteredArsips().every(reg => selectedArsipRegs.includes(reg.id));
                            if (isAllSelected) {
                              setSelectedArsipRegs([]);
                            } else {
                              setSelectedArsipRegs(getFilteredArsips().map(reg => reg.id));
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortArsip("noReg")}>
                        No. Reg {renderSortIndicator("noReg", arsipSortKey, arsipSortDir)}
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortArsip("status")}>
                        Status {renderSortIndicator("status", arsipSortKey, arsipSortDir)}
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortArsip("ppjCode")}>
                        No PPJ / PR / PO {renderSortIndicator("ppjCode", arsipSortKey, arsipSortDir)}
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortArsip("itemName")}>
                        Nama Barang {renderSortIndicator("itemName", arsipSortKey, arsipSortDir)}
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortArsip("pengujiInitials")}>
                        Penguji {renderSortIndicator("pengujiInitials", arsipSortKey, arsipSortDir)}
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSortArsip("tanggalDiuji")}>
                        Tanggal {renderSortIndicator("tanggalDiuji", arsipSortKey, arsipSortDir)}
                      </th>
                      <th className="p-3">Raw Parameter Terpola</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredArsips().slice((arsipPage - 1) * 10, arsipPage * 10).map((reg) => (
                      <tr key={reg.id} className="border-b hover:bg-slate-50/50 text-xs">
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedArsipRegs.includes(reg.id)}
                            onChange={() => {
                              if (selectedArsipRegs.includes(reg.id)) {
                                setSelectedArsipRegs(selectedArsipRegs.filter(id => id !== reg.id));
                              } else {
                                setSelectedArsipRegs([...selectedArsipRegs, reg.id]);
                              }
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900">#{reg.noReg}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                            reg.status === "Terbit" ? "bg-emerald-50 text-emerald-800 border-emerald-250" :
                            reg.status === "Review" ? "bg-blue-50 text-blue-800 border-blue-250" : "bg-slate-100 text-slate-400"
                          }`}>
                            {reg.status}
                          </span>
                        </td>
                        <td className="p-3">
                          PPJ: {reg.ppjCode} <br/>
                          PR: {reg.prCode} <br/>
                          PO: {reg.poCode}
                        </td>
                        <td className="p-3">
                          <strong className="block text-slate-900 uppercase font-extrabold">{reg.itemName}</strong>
                          <span className="text-slate-400 text-[10px]">Cat: {reg.category} / Standard: {reg.standardName}</span>
                        </td>
                        <td className="p-3 font-bold text-slate-700">
                          {reg.pengujiInitials || <span className="text-slate-300 italic font-normal">-</span>}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {reg.tanggalDiuji || <span className="text-slate-300 italic">-</span>}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-indigo-950 max-w-[320px] truncate" title={JSON.stringify(reg.results)}>
                          {reg.results.length > 0 ? (
                            reg.results.map(pt => 
                              `[Pt ${pt.pointIndex}]: ` + Object.entries(pt.values).map(([k,v]) => `${k}=${v}`).join(",")
                            ).join(" | ")
                          ) : (
                            <span className="text-slate-400 italic">Belum ada hasil pengukuran</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {getFilteredArsips().length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-10 text-center text-slate-400 italic">
                          Tidak ditemukan arsip data yang cocok dengan pencarian Anda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <PaginationControl
                currentPage={arsipPage}
                totalItems={getFilteredArsips().length}
                pageSize={10}
                onPageChange={(page) => setArsipPage(page)}
              />
            </div>
          </div>
        )}

        {/* 8. TAB USER (PASSWORD MANAGEMENT & USERS CREATOR) */}
        {activeTab === "user" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Users account registry creator (SuperAdmin Only) */}
              <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Registrasi Akun Karyawan Baru (IRIS Local ID)</h3>
                
                {isDewa ? (
                  <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">Username Login</label>
                        <input
                          type="text"
                          required
                          placeholder="Mis: haris.uji"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="w-full border p-2 rounded-lg bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">Sandi Pengguna</label>
                        <input
                          type="password"
                          required
                          placeholder="Sandi keamanan"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full border p-2 rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-600">Nama Lengkap Pemilik Akun</label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Haris Sanjaya Utama"
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        className="w-full border p-2 rounded-lg bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">Hak Akses Jabatan (Otoritas)</label>
                        <select
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          className="w-full border p-2 rounded-lg bg-slate-50 text-slate-900"
                        >
                          <option value="Tim Penguji">Tim Penguji (Semua kecuali Review / User Baru)</option>
                          <option value="Tim Reviewer">Tim Reviewer (Semua kecuali Isi Hasil Uji / User Baru)</option>
                          <option value="SuperAdmin">SuperAdmin (Dewa Otoritas Penuh)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-slate-600">Inisial Tanda Tangan (3 Huruf)</label>
                        <input
                          type="text"
                          required
                          maxLength={3}
                          placeholder="Contoh: HSU"
                          value={newInitials}
                          onChange={(e) => setNewInitials(e.target.value.toUpperCase())}
                          className="w-full border p-2 rounded-lg bg-white"
                        />
                      </div>
                    </div>

                    {userSuccessMsg && <p className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded font-bold">{userSuccessMsg}</p>}
                    {userErrorMsg && <p className="bg-red-50 border border-red-200 text-red-800 p-2.5 rounded font-bold">{userErrorMsg}</p>}

                    <button type="submit" className="w-full bg-[#006A4E] hover:bg-emerald-800 text-white font-bold py-2.5 rounded-lg cursor-pointer">
                      Simpan Pengguna Baru
                    </button>
                  </form>
                ) : (
                  <div className="p-4 bg-red-50 border rounded-xl flex items-start gap-3 text-xs">
                    <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-red-910">Otoritas Tidak Diizinkan</h4>
                      <p className="text-red-700 font-medium">Hanya akun SuperAdmin (dewa aplikasi) yang sah membuat akun login karyawan atau memodifikasi kredensial lokal utama.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Individual Password Modifiers */}
              <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Ganti Sandi Keamanan Akun Anda</h3>
                <p className="text-xs text-slate-400">Pastikan sandi and bersifat personal dan tidak dib bagikan ke pihak eksternal.</p>
                
                <div className="space-y-3.5 text-xs max-w-sm">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-705 block">Username Aktif</label>
                    <input type="text" disabled value={currentUser.username} className="border p-2 rounded bg-slate-50 w-full text-slate-500 font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-705 block">Sandi Baru</label>
                    <input id="change-pass-field" type="password" placeholder="••••••••" className="border p-2 rounded bg-white w-full text-slate-900" />
                  </div>
                  <button
                    onClick={async () => {
                      const input = document.getElementById("change-pass-field") as HTMLInputElement;
                      if (!input.value) return;
                      try {
                        // 1. Direct client-side write to Firestore first
                        await setDoc(doc(db, "users", currentUser.username), {
                          ...currentUser,
                          password: input.value
                        });

                        // 2. Sync with local server database
                        try {
                          await fetch("/api/users/update", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ username: currentUser.username, password: input.value })
                          });
                        } catch (syncErr) {
                          console.warn("Server-side password update sync failed:", syncErr);
                        }

                        alert("Sandi berhasil diperbarui dan disinkronkan!");
                        input.value = "";
                      } catch (err: any) {
                        alert("Gagal memperbarui sandi di Firestore: " + err.message);
                      }
                    }}
                    className="bg-slate-900 text-white font-bold px-4 py-2 rounded cursor-pointer"
                  >
                    Perbarui Sandi
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* DETAILED REPORT VIEW MODAL PREVIEW */}
      {viewingReport && (
        <div className="fixed inset-0 bg-slate-900/55 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-slate-100 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border">
            
            {/* Modal Controls Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between no-print">
              <div>
                <span className="text-xs bg-emerald-600 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">PREVIEW REGIST_#{viewingReport.noReg}</span>
                <p className="text-sm text-slate-400 font-bold font-mono tracking-tight mt-0.5">{viewingReport.noSurat || "SURAT_BELUM_TERBIT"}</p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-650 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Unduh / Cetak PDF Laporan
                </button>
                <button
                  onClick={() => setViewingReport(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold text-xs px-3 py-2 rounded-lg cursor-pointer"
                >
                  Tutup Pratinjau
                </button>
              </div>
            </div>

            {/* REVIEWER WORKSPACE PANEL (No Print) */}
            {viewingReport.status === "Review" && (
              <div className="bg-slate-50 border-b p-5 space-y-4 no-print text-xs shadow-inner">
                <div className={`grid grid-cols-1 ${viewingReport.categoryOptions?.nameplatePhoto ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
                  {/* PO Description */}
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <span className="text-sm">📋</span> Deskripsi PO / Item Detail
                    </h4>
                    <div className="bg-white border rounded-xl p-3 text-slate-705 font-medium leading-relaxed shadow-xs max-h-24 overflow-y-auto min-h-[64px]">
                      {viewingReport.description || <span className="text-slate-400 italic">Tidak ada spesifikasi deskripsi PO tambahan.</span>}
                    </div>
                  </div>

                  {/* Penguji Notes */}
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-indigo-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <span className="text-sm text-indigo-500">📝</span> Catatan Internal Penguji (Sampel #{viewingReport.noReg})
                    </h4>
                    <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-3 text-indigo-950 font-bold leading-relaxed shadow-xs max-h-24 overflow-y-auto min-h-[64px]">
                      {viewingReport.notes || <span className="text-slate-400 font-medium italic">Penguji tidak menyertakan catatan internal tambahan.</span>}
                    </div>
                  </div>

                  {/* Nameplate Photo Cross-check */}
                  {viewingReport.categoryOptions?.nameplatePhoto && (
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-emerald-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                        <span className="text-sm">📸</span> Nameplate Pembanding (Dari Penguji)
                      </h4>
                      <div className="bg-emerald-50/50 border border-emerald-250 rounded-xl p-2.5 flex flex-col items-center justify-center shadow-xs min-h-[64px] max-h-24 overflow-y-auto">
                        <div className="flex items-center gap-3">
                          <img 
                            src={viewingReport.categoryOptions.nameplatePhoto} 
                            className="max-h-16 object-contain rounded border border-slate-200 cursor-pointer hover:scale-105 transition-transform" 
                            alt="Nameplate comparison crosscheck" 
                            onClick={() => {
                              // Let the user view the image in full size if clicked
                              const win = window.open();
                              if (win) {
                                win.document.write(`<img src="${viewingReport.categoryOptions?.nameplatePhoto}" style="max-width:100%; max-height:100vh; display:block; margin:auto;"/>`);
                              }
                            }}
                          />
                          <p className="text-[9px] text-slate-500 font-semibold leading-tight">
                            Klik foto untuk membukanya pada tab baru secara penuh.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status and Action controls inside modal */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-dashed">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id={`modal-qr-toggle-${viewingReport.id}`}
                        checked={viewingReport.useQrSignature !== false}
                        onChange={(e) => {
                          const val = e.target.checked;
                          // 1. Update the local viewingReport state so that ReportDocument immediately updates inside the modal!
                          setViewingReport({ ...viewingReport, useQrSignature: val });
                          // 2. Also save into the corresponding reviewUseQrMap state so direct reviews and final actions sync perfectly
                          setReviewUseQrMap(prev => ({ ...prev, [viewingReport.id]: val }));
                        }}
                        className="w-4.5 h-4.5 rounded text-[#006A4E] border-slate-350 focus:ring-emerald-500 cursor-pointer mt-0.5"
                      />
                      <div>
                        <label htmlFor={`modal-qr-toggle-${viewingReport.id}`} className="font-extrabold text-slate-800 cursor-pointer block text-xs">
                          Gunakan QR (Digital Trust Code) pada Laporan
                        </label>
                        <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5 max-w-xl">
                          Jika dicentang, cetakan sertifikat akan disajikan dengan plat verifikasi Digital Trust Card dan penjamin QRIS. Jika dimatikan, hanya menampilkan tanda tangan administratif biasa.
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-450 font-mono">
                      STATUS REPORT: <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold uppercase">{viewingReport.status}</span>
                    </div>
                  </div>

                  {/* Comment & Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 items-end">
                    <div className="flex-1 w-full space-y-1">
                      <label className="text-[10px] font-black text-slate-600 block uppercase leading-none">Keputusan Review & Komentar:</label>
                      <input
                        type="text"
                        placeholder="Tulis alasan jika menolak, atau ketik tanggapan persetujuan..."
                        value={reviewCommentsMap[viewingReport.id] || ""}
                        onChange={(e) => setReviewCommentsMap({ ...reviewCommentsMap, [viewingReport.id]: e.target.value })}
                        className="w-full border p-2.5 rounded-lg text-xs bg-slate-50 text-slate-850 font-semibold focus:bg-white focus:outline-emerald-600 font-medium leading-relaxed"
                      />
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={async () => {
                          const comment = (reviewCommentsMap[viewingReport.id] || "").trim();
                          if (!comment) {
                            alert("Ketikkan alasan penolakan/pengembalian terlebih dahulu pada komentar di atas!");
                            return;
                          }
                          await handleReviewDecision(viewingReport.id, false, viewingReport.useQrSignature !== false);
                          setViewingReport(null);
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold py-2 px-3.5 rounded-lg cursor-pointer transition-all shrink-0"
                      >
                        Kembalikan (Draft)
                      </button>
                      <button
                        onClick={async () => {
                          const comment = reviewCommentsMap[viewingReport.id] || "";
                          await handleReviewDecision(viewingReport.id, true, viewingReport.useQrSignature !== false);
                          setViewingReport(null);
                        }}
                        className="bg-[#006A4E] hover:bg-emerald-800 text-white text-xs font-extrabold py-2 px-4 rounded-lg cursor-pointer flex items-center gap-1 transition-all shadow-md shrink-0"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Terbitkan Sertifikat!
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Embedded Certificate rendering */}
            <div className="p-6 md:p-10 max-h-[75vh] overflow-y-auto bg-slate-100">
              <div className="print-container">
                <ReportDocument registration={viewingReport} standards={standards} registrations={registrations} signatures={signatures} />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* EDITING REGISTRATION MODAL */}
      {editingReg && (
        <div className="fixed inset-0 bg-slate-900/55 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden border">
            
            <div className="p-6 border-b flex justify-between items-center bg-slate-900 text-white">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-400 rotate-45" /> Edit Draft Registrasi #{editingReg.noReg}
                </h3>
                <p className="text-xs text-slate-400">Sesuaikan data draf sampel untuk mengoreksi salah tik sebelum masuk tahap pengujian.</p>
              </div>
              <button 
                onClick={() => setEditingReg(null)}
                className="text-slate-400 hover:text-white font-extrabold text-sm px-3 py-1 bg-slate-800 rounded-lg cursor-pointer"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleUpdateRegistration} className="p-6 text-xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">No. PPJ (4 Digit)<span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    maxLength={4}
                    value={editPPJCode}
                    onChange={(e) => setEditPPJCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-xs font-bold border rounded-lg px-3 py-2 bg-white text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 block">No. Purchase Request (PR)</label>
                  <input 
                    type="text" 
                    value={editPRCode}
                    onChange={(e) => setEditPRCode(e.target.value)}
                    className="w-full text-xs border rounded-lg px-3 py-2 bg-white text-slate-800 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 block">No. Purchase Order (PO)</label>
                  <input 
                    type="text" 
                    value={editPOCode}
                    onChange={(e) => setEditPOCode(e.target.value)}
                    className="w-full text-xs border rounded-lg px-3 py-2 bg-white text-slate-800 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Vendor Pengirim<span className="text-red-500">*</span></label>
                  <AutoComplete 
                    placeholder="Cari atau ketik nama vendor..."
                    value={editVendor}
                    onChange={(val) => setEditVendor(val)}
                    options={Array.from(new Set(registrations.map(r => r.vendor).filter(Boolean)))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Kategori Material Uji</label>
                  <select
                    value={editCategory}
                    onChange={(e) => {
                      setEditCategory(e.target.value);
                      setEditStandardName("");
                      setEditStandardSource("");
                      setEditMetalAcuan("");
                    }}
                    className="w-full text-xs border rounded-lg px-3 py-2 bg-white text-slate-800 font-bold"
                  >
                    <option value="logam">Logam</option>
                    <option value="karung">Karung</option>
                    <option value="benang">Benang Jahit</option>
                    <option value="kelistrikan">Kelistrikan</option>
                    <option value="Valve">Valve</option>
                    <option value="filter cloth">Filter Cloth</option>
                    <option value="rubber">Rubber</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Nama Barang / Deskripsi<span className="text-red-500">*</span></label>
                  {editCategory === "karung" ? (
                    <div className="p-2 border rounded-lg bg-indigo-50 border-indigo-200 text-indigo-900 font-extrabold text-xs uppercase select-none min-h-[38px] flex items-center shadow-sm">
                      {editItemName || "NAMA DEFAULT ACUAN (Otomatis dari Standard)"}
                    </div>
                  ) : (
                    <AutoComplete 
                      placeholder="Contoh: ELBOW 8IN, BOLT, PHONSKA"
                      value={editItemName}
                      onChange={(val) => setEditItemName(val)}
                      options={Array.from(new Set(registrations.filter(r => r.category === editCategory).map(r => r.itemName).filter(Boolean)))}
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 block">Keterangan Spesifik Tambahan</label>
                  <input 
                    type="text" 
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full text-xs border rounded-lg px-3 py-2 bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-3">
                {editCategory === "karung" ? (
                  <div className="space-y-1 md:col-span-2">
                    <label className="font-bold text-slate-700 block bg-slate-100 px-2 py-0.5 rounded inline-block text-xs">Katalog Standard Mutu <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={editStandardName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditStandardName(val);
                        const found = standards.find(s => s.category === "karung" && s.name === val);
                        if (found) {
                          setEditStandardSource(found.source || "KSM INTERNAL");
                          setEditItemName(found.defaultNamaKarung || found.name);
                        } else {
                          setEditItemName("");
                        }
                      }}
                      className="w-full text-xs border border-indigo-300 rounded-lg px-3 py-2 bg-white text-slate-800 font-extrabold focus:outline-indigo-500 transition-all shadow-sm"
                    >
                      <option value="">-- Pilih Acuan Karung Master --</option>
                      {standards
                        .filter(s => s.category === "karung")
                        .map(s => (
                          <option key={s.name} value={s.name}>
                            {s.name}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                ) : editCategory === "logam" ? (
                  <>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block bg-slate-100 px-2 py-0.5 rounded inline-block">1. Pilih Acuan Standard Logam <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={editMetalAcuan}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditMetalAcuan(val);
                          setEditStandardName("");
                          setEditStandardSource("");
                        }}
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 font-extrabold focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">-- Pilih Acuan Logam --</option>
                        {Array.from(new Set(standards.filter(s => s.category === "logam").map(s => s.source).filter(Boolean))).sort().map(src => (
                          <option key={src} value={src}>{src}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block bg-slate-100 px-2 py-0.5 rounded inline-block">2. Pilih Standard Grade Logam <span className="text-red-500">*</span></label>
                      <select
                        required
                        disabled={!editMetalAcuan}
                        value={editStandardName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditStandardName(val);
                          const found = standards.find(s => s.category === "logam" && s.source === editMetalAcuan && s.name === val);
                          if (found) {
                            setEditStandardSource(found.source);
                          }
                        }}
                        className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 font-extrabold focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="">-- Pilih Grade Logam --</option>
                        {standards
                          .filter(s => s.category === "logam" && s.source === editMetalAcuan)
                          .map(s => (
                            <option key={s.name} value={s.name}>{s.name}</option>
                          ))
                        }
                      </select>
                    </div>

                    {editMetalAcuan && (
                      <div className="md:col-span-3 bg-amber-50 border border-amber-250 text-amber-900 rounded-xl px-4 py-2.5 text-xs flex items-center justify-between shadow-sm animate-fade-in mt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">💡</span>
                          <div>
                            <span className="font-bold text-slate-700">ASTM {editMetalAcuan.toUpperCase()}</span> diperuntukkan bagi bentuk produk:{" "}
                            <strong className="text-emerald-900 underline font-black uppercase text-[10px] tracking-wide">{getProductFormForAcuan(editMetalAcuan, standards) || "Logam Spesifik"}</strong>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-1 md:col-span-2">
                    <label className="font-bold text-slate-600 block">Katalog Standard Mutu <span className="text-red-500">*</span></label>
                    <AutoComplete 
                      placeholder="Cari standard..."
                      value={editStandardName}
                      onChange={(val) => {
                        setEditStandardName(val);
                        const found = standards.find(s => s.category === editCategory && s.name === val);
                        if (found) {
                          setEditStandardSource(found.source || "KSM INTERNAL");
                          if ((editCategory === "karung" || editCategory === "benang") && found.defaultNamaKarung) {
                            setEditItemName(found.defaultNamaKarung);
                          }
                        }
                      }}
                      options={standards.filter(s => s.category === editCategory).map(s => s.name)}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Jumlah & Satuan Fisis</label>
                  <input 
                    type="text" 
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-full text-xs border rounded-lg px-3 py-2 bg-white text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 block">Tanggal PPJ Dokumen</label>
                  <input 
                    type="date" 
                    value={editTanggalPPJ}
                    onChange={(e) => setEditTanggalPPJ(e.target.value)}
                    className="w-full text-xs border rounded-lg px-3 py-2 bg-white text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 block">Tanggal Diterima Lab</label>
                  <input 
                    type="date" 
                    value={editTanggalDiterima}
                    onChange={(e) => setEditTanggalDiterima(e.target.value)}
                    className="w-full text-xs border rounded-lg px-3 py-2 bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* Plat Nomor Pengirim if editCategory is Karung or Benang */}
              {(editCategory === "karung" || editCategory === "benang") && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="space-y-1">
                    <label className="font-extrabold text-indigo-700 block uppercase tracking-wide">📦 Plat Nomor Pengirim (Wajib)<span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      placeholder="misal: W 1463 AB"
                      value={editPlatNomor}
                      onChange={(e) => setEditPlatNomor(e.target.value.toUpperCase())}
                      className="w-full text-xs border border-indigo-200 rounded-lg px-3 py-2 bg-indigo-50/25 text-indigo-950 font-black uppercase tracking-wider focus:outline-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setEditingReg(null)} 
                  className="px-4 py-2 border rounded-lg text-slate-500 font-bold hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="bg-[#006A4E] hover:bg-emerald-800 text-white font-extrabold px-6 py-2 rounded-lg shadow transition-all cursor-pointer"
                >
                  Simpan Perubahan Draf
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Edit Standard Modal */}
      {editingStandard && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border shadow-2xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Edit Standard Acuan & Batas Batasan</h3>
                <p className="text-[11px] text-slate-500">Sesuaikan rincian parameter, nilai spesifikasi, nama grade, dan bentuk produk.</p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingStandard(null)} 
                className="text-slate-400 hover:text-slate-700 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStandard} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-500 block">Kategori</label>
                  <select
                    value={editStdCategory}
                    onChange={(e) => setEditStdCategory(e.target.value)}
                    className="w-full border p-2 rounded-lg bg-slate-50 text-slate-900 outline-none"
                  >
                    <option value="logam">Logam</option>
                    <option value="karung">Karung</option>
                    <option value="benang">Benang</option>
                    <option value="kelistrikan">Kelistrikan</option>
                    <option value="Valve">Valve</option>
                    <option value="filter cloth">Filter Cloth</option>
                    <option value="rubber">Rubber</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    {editStdCategory === "logam" ? "Nama Standard Grade" : "Nama Standard Acuan"}
                  </label>
                  <input
                    type="text"
                    required
                    value={editStdName}
                    onChange={(e) => setEditStdName(e.target.value)}
                    className="w-full border p-2 rounded-lg bg-white text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">
                  {editStdCategory === "logam" ? "Acuan Standard (E.g. ASTM / ASME)" : "Keterangan / Sumber Terbit"}
                </label>
                <input
                  type="text"
                  required
                  value={editStdSource}
                  onChange={(e) => setEditStdSource(e.target.value)}
                  className="w-full border p-2 rounded-lg bg-white text-slate-800 font-medium"
                />
              </div>

              {editStdCategory === "logam" && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Bentuk Produk (Product Form)</label>
                  <input
                    type="text"
                    required
                    value={editStdDescription}
                    onChange={(e) => setEditStdDescription(e.target.value)}
                    className="w-full border p-2 rounded-lg bg-white text-slate-800"
                  />
                </div>
              )}

              {(editStdCategory === "karung" || editStdCategory === "benang") && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded inline-block text-xs border border-emerald-250">
                    Nama Karung / Deskripsi Ter-standarisasi (Default Nama Karung)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: PHONSKA SUB 50KG, UREA SUB 50KG, BENANG"
                    value={editStdDefaultNamaKarung}
                    onChange={(e) => setEditStdDefaultNamaKarung(e.target.value)}
                    className="w-full border border-emerald-350 p-2 rounded-lg bg-emerald-50/50 text-emerald-950 font-semibold"
                  />
                </div>
              )}

              <div className="space-y-2 border-t pt-3 max-h-52 overflow-y-auto pr-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700">Parameter & Spesifikasi</span>
                  <button
                    type="button"
                    onClick={() => setEditStdParams([...editStdParams, { name: "", unit: "", spec: "" }])}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded text-[10px]"
                  >
                    + Tambah Baris
                  </button>
                </div>

                {editStdParams.map((p, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      required
                      placeholder="Nama Unsur / Uji"
                      value={p.name}
                      onChange={(e) => {
                        const next = [...editStdParams];
                        next[idx].name = e.target.value;
                        setEditStdParams(next);
                      }}
                      className="w-1/3 border p-1.5 rounded text-slate-800 font-bold"
                    />
                    <input
                      type="text"
                      placeholder="Satuan (e.g. %)"
                      value={p.unit}
                      onChange={(e) => {
                        const next = [...editStdParams];
                        next[idx].unit = e.target.value;
                        setEditStdParams(next);
                      }}
                      className="w-1/4 border p-1.5 rounded text-slate-800"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Spec Batas"
                      value={p.spec}
                      onChange={(e) => {
                        const next = [...editStdParams];
                        next[idx].spec = e.target.value;
                        setEditStdParams(next);
                      }}
                      className="w-1/3 border p-1.5 rounded text-slate-800 font-medium"
                    />
                    {editStdParams.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setEditStdParams(editStdParams.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 font-black text-xs px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingStandard(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-50 text-slate-600 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-lg font-black"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Standard Detail Modal */}
      {viewingStandardDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border shadow-2xl w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-3.5">
              <div>
                <span className="text-[9px] bg-indigo-100 text-indigo-800 font-extrabold uppercase px-2 py-0.5 rounded-full inline-block mb-1 font-mono">
                  Detail {viewingStandardDetail.category}
                </span>
                <h3 className="font-extrabold text-slate-950 text-base uppercase leading-tight">
                  {viewingStandardDetail.name}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setViewingStandardDetail(null)} 
                className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-800 max-h-[380px] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3.5 bg-slate-50 p-3 rounded-xl border border-slate-150">
                <div>
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Sumber / Penerbit</span>
                  <span className="font-bold text-slate-900 uppercase">
                    {viewingStandardDetail.source || "KSM INTERNAL"}
                  </span>
                </div>
                {viewingStandardDetail.category === "karung" && viewingStandardDetail.defaultNamaKarung && (
                  <div>
                    <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Default Nama Karung</span>
                    <span className="font-bold text-slate-900">{viewingStandardDetail.defaultNamaKarung}</span>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Deskripsi Lengkap</span>
                  <span className="font-medium text-slate-700">
                    {viewingStandardDetail.description || "Tidak ada keterangan tambahan."}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 uppercase text-[10px] tracking-wider mb-2 flex items-center gap-1.5 border-b pb-1">
                  📦 Rincian Parameter Spesifikasi ({viewingStandardDetail.parameters?.length || 0})
                </h4>
                
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100 uppercase text-[9px] tracking-wider">
                        <th className="p-2.5">Parameter</th>
                        <th className="p-2.5">Batas Syarat Spesifikasi</th>
                        <th className="p-2.5">Satuan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {viewingStandardDetail.parameters && viewingStandardDetail.parameters.length > 0 ? (
                        viewingStandardDetail.parameters.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2.5 font-bold text-slate-900">{p.name || "-"}</td>
                            <td className="p-2.5 font-mono text-indigo-700 font-extrabold">{p.spec || "-"}</td>
                            <td className="p-2.5 text-slate-500 font-semibold">{p.unit || "-"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-slate-400 italic">
                            Tidak ada parameter spesifikasi terdaftar.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3.5 border-t">
              <button
                type="button"
                onClick={() => setViewingStandardDetail(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl font-bold cursor-pointer transition-colors text-xs"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Signature & Canvas TTD Modal - Requirement 3 & 4 */}
      {editingSignature && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl border shadow-2xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Custom Pejabat & Tanda Tangan</h3>
                <p className="text-[11px] text-slate-500 font-medium">Buat/unggah gambar tanda tangan, atur inisial, dan pilih metode ttd laporan.</p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingSignature(null)} 
                className="text-slate-400 hover:text-slate-700 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => handleUpdateSignature(e)} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    required
                    value={editSigName}
                    onChange={(e) => setEditSigName(e.target.value)}
                    className="w-full border p-2 rounded-lg bg-white text-slate-800 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Jabatan / Posisi</label>
                  <input
                    type="text"
                    required
                    value={editSigPosition}
                    onChange={(e) => setEditSigPosition(e.target.value)}
                    className="w-full border p-2 rounded-lg bg-white text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Inisial Tanda Tangan</label>
                  <input
                    type="text"
                    maxLength={3}
                    required
                    value={editSigInitials}
                    onChange={(e) => setEditSigInitials(e.target.value)}
                    className="w-full border p-2 rounded-lg bg-white text-slate-850 font-mono uppercase focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Jenis Tanda Tangan Laporan</label>
                  <select
                    value={editSigType}
                    onChange={(e) => setEditSigType(e.target.value as any)}
                    className="w-full border p-2 rounded-lg bg-white text-slate-850 font-semibold focus:outline-none"
                  >
                    <option value="qrcode">QR Code Dinamis (Standard Keamanan)</option>
                    <option value="digital">Tanda Tangan Digital (Canvas / Gambar)</option>
                  </select>
                </div>
              </div>

              {editSigType === "digital" && (
                <div className="space-y-3.5 border-t pt-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800">Coretan Tanda Tangan (Canvas Menggambar):</span>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-rose-600 hover:text-rose-850 font-bold text-[10px] bg-rose-50 border border-rose-100 rounded px-2.5 py-1"
                    >
                      Bersihkan Canvas
                    </button>
                  </div>

                  {/* DPI-scaled high-resolution smooth drawing pad */}
                  <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white max-w-[402px] mx-auto shadow-inner">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="cursor-crosshair bg-white block"
                    />
                  </div>

                  <div className="space-y-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <label className="font-bold text-slate-700 block mb-1">Atau Unggah berkas PNG Tanda Tangan:</label>
                    <input
                      type="file"
                      accept="image/png"
                      onChange={handleSignatureImageUpload}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-emerald-50 file:text-[#006A4E] hover:file:bg-emerald-100 cursor-pointer"
                    />
                  </div>

                  {editSigImage ? (
                    <div className="space-y-1">
                      <span className="font-bold text-slate-500 block">Preview Gambar TTD terpola (Base64):</span>
                      <div className="border border-slate-200 rounded-2xl p-2 bg-slate-100/50 flex items-center justify-center max-h-24 overflow-hidden shadow-inner">
                        <img src={editSigImage} alt="Signature Preview" className="max-h-20 object-contain text-slate-400 font-mono text-[10px]" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                  ) : (
                    <p className="text-center font-bold text-slate-400 italic py-2 text-[10px]">Silakan bubuhkan tanda tangan di canvas di atas atau unggah file PNG.</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t pt-3.5">
                <button
                  type="button"
                  onClick={() => setEditingSignature(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-50 text-slate-600 font-extrabold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#006A4E] hover:bg-emerald-800 text-white rounded-lg font-black"
                >
                  Simpan Tanda Tangan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden batch print helper rendering selected documents - Requirement 9 */}
      <div style={{ display: "none" }} aria-hidden="true" className="no-print hidden">
        {selectedCompletedRegs.map(id => {
          const reg = registrations.find(r => r.id === id);
          if (!reg) return null;
          return (
            <div key={id} id={`batch-print-wrapper-${id}`}>
              <ReportDocument 
                registration={reg} 
                standards={standards} 
                registrations={registrations}
                signatures={signatures}
              />
            </div>
          );
        })}
      </div>

      {/* High-Fidelity Custom Confirmation Modal Overlay (Requirement 1 - replaces blocked window.confirm) */}
      {confirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden transform scale-100 transition-all">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <span className="text-xl font-bold">⚠️</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900">Konfirmasi Tindakan</h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {confirmModal.message}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-3.5 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.onCancel) confirmModal.onCancel();
                  setConfirmModal(null);
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-lg transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="px-5 py-2 bg-[#006A4E] hover:bg-emerald-800 text-white font-black text-xs rounded-lg shadow-md hover:shadow transition-all cursor-pointer"
              >
                Ya, Setujui
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Dismissing Toast Notification Banner (Pojok Kanan Layar) */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-[99999] animate-bounce-short">
          <div className={`
            flex items-center gap-3 px-4.5 py-3.5 rounded-xl shadow-2xl border text-xs font-bold text-white max-w-sm transition-all duration-300
            ${toastType === "error" ? "bg-rose-600 border-rose-500" : ""}
            ${toastType === "success" ? "bg-emerald-600 border-emerald-500" : ""}
            ${toastType === "info" ? "bg-indigo-600 border-indigo-500" : ""}
          `}>
            {toastType === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-100 shrink-0" />}
            {toastType === "error" && <AlertTriangle className="w-5 h-5 text-rose-100 shrink-0" />}
            {toastType === "info" && <Inbox className="w-5 h-5 text-indigo-100 shrink-0" />}
            <span className="flex-1 leading-relaxed">{toastMessage}</span>
            <button 
              type="button" 
              onClick={() => setToastMessage(null)}
              className="text-white hover:text-slate-200 font-extrabold text-sm ml-2 focus:outline-none cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
