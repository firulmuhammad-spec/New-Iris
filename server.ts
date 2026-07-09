import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, doc, deleteDoc } from "firebase/firestore";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: "50mb" }));

// Standard/Reference standards default data
const DEFAULT_STANDARDS = [
  {
    id: "std-1",
    category: "logam",
    name: "AISI 304",
    source: "ASTM A240",
    description: "Stainless steel grade 304 standard composition",
    parameters: [
      { name: "C", unit: "%", spec: "0.08 max" },
      { name: "Mn", unit: "%", spec: "2.00 max" },
      { name: "Si", unit: "%", spec: "0.75 max" },
      { name: "P", unit: "%", spec: "0.045 max" },
      { name: "S", unit: "%", spec: "0.030 max" },
      { name: "Cr", unit: "%", spec: "18.00 - 20.00" },
      { name: "Ni", unit: "%", spec: "8.00 - 10.50" }
    ]
  },
  {
    id: "std-2",
    category: "logam",
    name: "AISI 316L",
    source: "ASTM A240",
    description: "Low carbon chemical composition for AISI 316L",
    parameters: [
      { name: "C", unit: "%", spec: "0.030 max" },
      { name: "Mn", unit: "%", spec: "2.00 max" },
      { name: "Si", unit: "%", spec: "0.75 max" },
      { name: "P", unit: "%", spec: "0.045 max" },
      { name: "S", unit: "%", spec: "0.030 max" },
      { name: "Cr", unit: "%", spec: "16.00 - 18.00" },
      { name: "Ni", unit: "%", spec: "10.00 - 14.00" },
      { name: "Mo", unit: "%", spec: "2.00 - 3.00" }
    ]
  },
  {
    id: "std-3",
    category: "logam",
    name: "A283C",
    source: "ASTM A283",
    description: "Carbon steel structural plates grade C",
    parameters: [
      { name: "C", unit: "%", spec: "0.24 max" },
      { name: "Si", unit: "%", spec: "0.40 max" },
      { name: "Mn", unit: "%", spec: "0.90 max" },
      { name: "Tensile Strength", unit: "kg/mm²", spec: "38 - 52" }
    ]
  },
  {
    id: "std-4",
    category: "karung",
    name: "Standard Karung Pupuk",
    source: "KSM-K10",
    description: "Standar Karung Luar & Dalam PT Petrokimia Gresik",
    parameters: [
      { name: "Panjang Karung Luar", unit: "cm", spec: "94 +2/-0" },
      { name: "Lebar Karung Luar", unit: "cm", spec: "58 +2/-0" },
      { name: "Berat Karung Luar", unit: "Gram", spec: "110 min" },
      { name: "Kuat Tarik Lusi Luar", unit: "Kg", spec: "95 min" },
      { name: "Kuat Tarik Pakan Luar", unit: "Kg", spec: "95 min" },
      { name: "Kuat Tarik Jahitan Luar", unit: "Kg", spec: "40 min" },
      { name: "Tetal Lusi Luar / 10cm", unit: "Helai", spec: "48 min" },
      { name: "Tetal Pakan Luar / 10cm", unit: "Helai", spec: "48 min" },
      { name: "Index Putih", unit: "%", spec: "83 min" },
      { name: "Panjang Karung Dalam", unit: "cm", spec: "112 +2/-0" },
      { name: "Lebar Karung Dalam", unit: "cm", spec: "60 +2/-0" },
      { name: "Berat Karung Dalam", unit: "Gram", spec: "48 min" },
      { name: "Tebal Karung Dalam", unit: "Mikron", spec: "40 min" }
    ]
  },
  {
    id: "std-5",
    category: "benang",
    name: "Standard benang jahit karung PG",
    source: "KSM-B01",
    description: "Standar Benang jahit karung",
    parameters: [
      { name: "Tensile Strength", unit: "kgf", spec: "Min 6.8" },
      { name: "Nomor Pita", unit: "denier", spec: "1250 - 1300" },
      { name: "Tenacity", unit: "gr/denier", spec: "Min 5.2" }
    ]
  },
  {
    id: "std-6",
    category: "kelistrikan",
    name: "Standard PO Vs Nameplate",
    source: "PO Spec Check",
    description: "Parameter kelistrikan nameplate vs PO",
    parameters: [
      { name: "Merk", unit: "Text", spec: "Match PO" },
      { name: "Type", unit: "Text", spec: "Match PO" },
      { name: "RPM", unit: "rpm", spec: "Tolerance 5%" },
      { name: "Voltage Rating", unit: "V", spec: "Match PO" },
      { name: "Insulation Class", unit: "Class", spec: "F or Better" },
      { name: "IP Rating", unit: "IP", spec: "55 Min" }
    ]
  },
  {
    id: "std-7",
    category: "Valve",
    name: "Standard Pressure Test Workshop PG",
    source: "PO Spec Check",
    description: "Pressure test parameters for rating class 150 valves",
    parameters: [
      { name: "Shell Hydrostatic Test", unit: "Bar", spec: "30 Bar - No Leak" },
      { name: "Seat Pneumatic Test", unit: "Bar", spec: "6 Bar - No Leak" },
      { name: "Body Material Check", unit: "Text", spec: "Match PO" }
    ]
  },
  {
    id: "std-8",
    category: "filter cloth",
    name: "Filter Cloth Air Permeability",
    source: "PO Spec Check",
    description: "Air continuous permeability specs from purchase order",
    parameters: [
      { name: "Air Permeability", unit: "L/dm²/min", spec: "" },
      { name: "Weight", unit: "g/m²", spec: "450 - 500" }
    ]
  },
  {
    id: "std-9",
    category: "rubber",
    name: "Industrial Rubber Sheet",
    source: "KSM-R05",
    description: "Mechanical standard for rubber seals/gaskets",
    parameters: [
      { name: "Hardness", unit: "Shore A", spec: "60 - 70" },
      { name: "Tensile Strength", unit: "MPa", spec: "10 Min" },
      { name: "Elongation at Break", unit: "%", spec: "250 Min" }
    ]
  }
];

const DEFAULT_SIGNATURES = [
  { id: "sig-1", name: "Ragil Sulistiyo", position: "ITRK Bengkel & Uji Material", initials: "RS", active: true },
  { id: "sig-2", name: "Budi Santoso", position: "Kepala Departemen ITRK", initials: "BS", active: true },
  { id: "sig-3", name: "Imron Rosyadi", position: "Senior Inspector ITRK", initials: "IR", active: true }
];

// Seed some initial registrations spanning the whole lifecycle: Draft, Uji, Review, Terbit
const DEFAULT_REGISTRATIONS = [
  {
    id: "reg-0565",
    noReg: "0565",
    noSurat: "0565/PR.00.02/90/MI/2026",
    ppjCode: "0882",
    ppjFull: "0882/LG.01.01/101/MI/2026",
    prCode: "2200108471",
    poCode: "5100146424",
    vendor: "SETIA KARYA SENTOSA",
    category: "logam",
    standardName: "AISI 304",
    standardSource: "ASTM A240",
    itemName: "EXPANSION JOINT:BELLOWS;4INX150MM;IIR",
    description: "Pengujian material logam body stainless steel",
    quantity: "3 Meter",
    points: 1,
    status: "Terbit",
    tanggalPPJ: "2026-03-13",
    tanggalDiterima: "2026-03-16",
    tanggalDiuji: "2026-03-16",
    tanggalTerbit: "2026-03-16",
    pengujiInitials: "RS",
    reviewerInitials: "BS",
    trustCardId: "TC-0565-A8F9",
    useQrSignature: true,
    results: [
      {
        pointIndex: 1,
        pointName: "Titik Uji expansion joint",
        values: {
          "Mn": "1.29",
          "Cr": "15.17*",
          "Ni": "10.90*",
          "Mo": "2.29*"
        }
      }
    ],
    reviewerComments: "Semua parameter valid. Sesuai spesifikasi ASTM A240 dengan sedikit anotasi unsur penstabil."
  },
  {
    id: "reg-0566",
    noReg: "0566",
    noSurat: "0566/PR.00.02/90/MI/2026",
    ppjCode: "0883",
    ppjFull: "0883/LG.01.01/63/MI/2026",
    prCode: "2200108671",
    poCode: "5100147465",
    vendor: "VP Perencanaan dan Penerimaan Barang",
    category: "kelistrikan",
    standardName: "Standard Nameplate Motor",
    standardSource: "PO Spec Check",
    itemName: "GEARCASE-MOTOR:SK 12080AZH-90SP/4 TF",
    description: "Insulation tester, Kyoritsu 3132A , No.seri W8242011",
    quantity: "4 Unit",
    points: 1,
    status: "Terbit",
    tanggalPPJ: "2026-03-13",
    tanggalDiterima: "2026-03-16",
    tanggalDiuji: "2026-03-16",
    tanggalTerbit: "2026-03-16",
    pengujiInitials: "RS",
    reviewerInitials: "BS",
    trustCardId: "TC-0566-B3D2",
    useQrSignature: false,
    results: [
      {
        pointIndex: 1,
        pointName: "Motor 1.1 KW",
        values: {
          "Merk": "NORD (OK)",
          "Type": "90SP/4 (OK)",
          "RPM": "1430 (OK)",
          "Voltage Rating": "380VAC (OK)",
          "Insulation Class": "F/55 (OK)",
          "IP Rating": "IP 55 (OK)"
        }
      }
    ]
  },
  {
    id: "reg-0567",
    noReg: "0567",
    noSurat: "0567/PR.00.02/90/MI/2026",
    ppjCode: "0884",
    ppjFull: "0884/LG.01.01/63/MI/2026",
    prCode: "2200109500",
    poCode: "5100148753",
    vendor: "VP Perencanaan dan Penerimaan Barang / Jasa",
    category: "kelistrikan",
    standardName: "Standard Nameplate Motor",
    standardSource: "PO Spec Check",
    itemName: "MOTOR,AC:3PH;4P;55KW;1500RPM;380V;250M",
    description: "Nameplate comparison vs PO requirements",
    quantity: "1 Unit",
    points: 1,
    status: "Terbit",
    tanggalPPJ: "2026-03-13",
    tanggalDiterima: "2026-03-16",
    tanggalDiuji: "2026-03-16",
    tanggalTerbit: "2026-03-16",
    pengujiInitials: "RS",
    reviewerInitials: "BS",
    trustCardId: "TC-0567-C772",
    useQrSignature: true,
    results: [
      {
        pointIndex: 1,
        pointName: "Motor AC 55 KW",
        values: {
          "Merk": "WEG (OK)",
          "Type": "250M-04 (OK)",
          "RPM": "1481 (OK)",
          "Voltage Rating": "380 V (OK)",
          "Insulation Class": "F / 55 (OK)",
          "IP Rating": "IP 55 (OK)"
        }
      }
    ]
  },
  {
    id: "reg-0568",
    noReg: "0568",
    noSurat: "0568/PR.00.02/90/MI/2026",
    ppjCode: "0885",
    ppjFull: "0885/LG.01.01/101/MI/2026",
    prCode: "2200108577",
    poCode: "5100147229",
    vendor: "VP Pengelolaan Persediaan Suku Cadang & Bahan Baku",
    category: "logam",
    standardName: "A283C",
    standardSource: "ASTM A283",
    itemName: "PLATE:8X2100X6000MM;CS;A283-C",
    description: "LIBS Metal Analyzer & Hardness test standard checking",
    quantity: "2 Lbr",
    points: 2,
    status: "Terbit",
    tanggalPPJ: "2026-03-13",
    tanggalDiterima: "2026-03-16",
    tanggalDiuji: "2026-03-16",
    tanggalTerbit: "2026-03-16",
    pengujiInitials: "RS",
    reviewerInitials: "BS",
    trustCardId: "TC-0568-D901",
    useQrSignature: true,
    results: [
      {
        pointIndex: 1,
        pointName: "PLATE:8X2100X6000MM (T1)",
        values: {
          "C": "0.04",
          "Si": "0.11",
          "Mn": "0.56",
          "Tensile Strength": "49"
        }
      },
      {
        pointIndex: 2,
        pointName: "PLATE:10X2100X6000MM (T2)",
        values: {
          "C": "0.03",
          "Si": "0.09",
          "Mn": "0.55",
          "Tensile Strength": "44"
        }
      }
    ]
  },
  {
    id: "reg-1463",
    noReg: "1463",
    ppjCode: "1463",
    ppjFull: "1463/LG.01.01/101/MI/2026",
    prCode: "2200110320",
    poCode: "5100149638",
    vendor: "SETIA KARYA SENTOSA",
    category: "karung",
    standardName: "Standard Karung Pupuk",
    standardSource: "KSM-K10",
    itemName: "KARUNG PUPUK NPK PHONSKA 50KG",
    description: "Uji fisik karung kemasan",
    quantity: "3 Pcs",
    points: 1,
    status: "Uji",
    tanggalPPJ: "2026-04-02",
    tanggalDiterima: "2026-04-05",
    tanggalDiuji: "2026-04-10",
    pengujiInitials: "RS",
    results: [
      {
        pointIndex: 1,
        pointName: "Sample Karung 1",
        values: {
          "Panjang Karung Luar": "96",
          "Lebar Karung Luar": "59",
          "Berat Karung Luar": "111",
          "Kuat Tarik Lusi Luar": "99",
          "Kuat Tarik Pakan Luar": "98",
          "Kuat Tarik Jahitan Luar": "44",
          "Tetal Lusi Luar / 10cm": "48",
          "Tetal Pakan Luar / 10cm": "48",
          "Index Putih": "84",
          "Panjang Karung Dalam": "113",
          "Lebar Karung Dalam": "60",
          "Berat Karung Dalam": "49",
          "Tebal Karung Dalam": "41"
        }
      }
    ]
  },
  {
    id: "reg-1466",
    noReg: "1466",
    ppjCode: "1466",
    ppjFull: "1466/LG.01.01/101/MI/2026",
    prCode: "2200109315",
    poCode: "5100146638",
    vendor: "VARIA SEMBADA MANDIRI",
    category: "Valve",
    standardName: "Standard Pressure Test Workshop PG",
    standardSource: "PO Spec Check",
    itemName: "VALVE,GLOBE:1/2IN;150LB;RF;BB;OSY;CF8M",
    description: "Pressure integrity hydrotest and seat pneumatic tests",
    quantity: "4 Pcs",
    points: 1,
    status: "Draft",
    tanggalPPJ: "2026-04-02",
    tanggalDiterima: "2026-04-05",
    results: []
  }
];

const DB_PATH = path.join(process.cwd(), "db.json");

// Initialize Firebase SDK
let firebaseApp: any;
let firestoreDb: any;

try {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    firebaseApp = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    console.log("Firebase initialized successfully with DB ID:", firebaseConfig.firestoreDatabaseId);
  } else {
    console.warn("firebase-applet-config.json not found. Firestore sync disabled.");
  }
} catch (err) {
  console.error("Failed to initialize Firebase:", err);
}

async function syncDbFromFirestore() {
  if (!firestoreDb) return;
  try {
    console.log("Syncing database from Firestore...");
    const rootCols = ["registrations", "standards", "signatures", "users"];
    const fetchedData: any = {
      registrations: [],
      standards: [],
      signatures: [],
      users: []
    };

    for (const colName of rootCols) {
      const colRef = collection(firestoreDb, colName);
      const snapshot = await getDocs(colRef);
      snapshot.forEach(docSnap => {
        fetchedData[colName].push(docSnap.data());
      });
    }

    if (fetchedData.registrations.length > 0 || fetchedData.standards.length > 0 || fetchedData.users.length > 0) {
      console.log(`Successfully synced from Firestore. Got ${fetchedData.registrations.length} registrations, ${fetchedData.standards.length} standards, ${fetchedData.signatures.length} signatures, ${fetchedData.users.length} users.`);
      
      const finalData = {
        standards: fetchedData.standards.length > 0 ? fetchedData.standards : DEFAULT_STANDARDS,
        signatures: fetchedData.signatures.length > 0 ? fetchedData.signatures : DEFAULT_SIGNATURES,
        registrations: fetchedData.registrations,
        users: fetchedData.users.length > 0 ? fetchedData.users : [
          { username: "adm", password: "123", role: "SuperAdmin", name: "Administrator Utama", initials: "ADM" },
          { username: "uji", password: "123", role: "Tim Penguji", name: "Ragil Sulistiyo", initials: "RS" },
          { username: "rev", password: "123", role: "Tim Reviewer", name: "Budi Santoso", initials: "BS" }
        ]
      };
      
      fs.writeFileSync(DB_PATH, JSON.stringify(finalData, null, 2));
    } else {
      console.log("Firestore database is empty. Seeding initial data from local default database...");
      const dbData = loadDb();
      await seedFirestoreFromLocal(dbData);
    }
  } catch (err) {
    console.error("Error syncing database from Firestore:", err);
  }
}

async function seedFirestoreFromLocal(dbData: any) {
  if (!firestoreDb) return;
  try {
    console.log("Seeding Firestore with initial values...");
    for (const reg of dbData.registrations || []) {
      await setDoc(doc(firestoreDb, "registrations", String(reg.id)), reg);
    }
    for (const std of dbData.standards || []) {
      await setDoc(doc(firestoreDb, "standards", String(std.id)), std);
    }
    for (const sig of dbData.signatures || []) {
      await setDoc(doc(firestoreDb, "signatures", String(sig.id)), sig);
    }
    for (const u of dbData.users || []) {
      await setDoc(doc(firestoreDb, "users", String(u.username)), u);
    }
    console.log("Firestore seeding completed successfully.");
  } catch (err) {
    console.error("Error seeding Firestore:", err);
  }
}

async function syncFirestoreData(data: any) {
  if (!firestoreDb) return;
  try {
    // 1. Sync registrations
    const regCol = collection(firestoreDb, "registrations");
    const regSnapshot = await getDocs(regCol);
    const existingRegIds = new Set<string>();
    regSnapshot.forEach(docSnap => {
      existingRegIds.add(docSnap.id);
    });
    const currentRegIds = new Set(data.registrations.map((r: any) => String(r.id)));
    for (const id of existingRegIds) {
      if (!currentRegIds.has(id)) {
        await deleteDoc(doc(firestoreDb, "registrations", id));
        console.log(`Firestore registration deleted: ${id}`);
      }
    }
    for (const reg of data.registrations || []) {
      await setDoc(doc(firestoreDb, "registrations", String(reg.id)), reg);
    }

    // 2. Sync standards
    const stdCol = collection(firestoreDb, "standards");
    const stdSnapshot = await getDocs(stdCol);
    const existingStdIds = new Set<string>();
    stdSnapshot.forEach(docSnap => {
      existingStdIds.add(docSnap.id);
    });
    const currentStdIds = new Set(data.standards.map((s: any) => String(s.id)));
    for (const id of existingStdIds) {
      if (!currentStdIds.has(id)) {
        await deleteDoc(doc(firestoreDb, "standards", id));
      }
    }
    for (const std of data.standards || []) {
      await setDoc(doc(firestoreDb, "standards", String(std.id)), std);
    }

    // 3. Sync signatures
    const sigCol = collection(firestoreDb, "signatures");
    const sigSnapshot = await getDocs(sigCol);
    const existingSigIds = new Set<string>();
    sigSnapshot.forEach(docSnap => {
      existingSigIds.add(docSnap.id);
    });
    const currentSigIds = new Set(data.signatures.map((s: any) => String(s.id)));
    for (const id of existingSigIds) {
      if (!currentSigIds.has(id)) {
        await deleteDoc(doc(firestoreDb, "signatures", id));
      }
    }
    for (const sig of data.signatures || []) {
      await setDoc(doc(firestoreDb, "signatures", String(sig.id)), sig);
    }

    // 4. Sync users
    const userCol = collection(firestoreDb, "users");
    const userSnapshot = await getDocs(userCol);
    const existingUserIds = new Set<string>();
    userSnapshot.forEach(docSnap => {
      existingUserIds.add(docSnap.id);
    });
    const currentUserIds = new Set(data.users.map((u: any) => String(u.username)));
    for (const id of existingUserIds) {
      if (!currentUserIds.has(id)) {
        await deleteDoc(doc(firestoreDb, "users", id));
      }
    }
    for (const u of data.users || []) {
      await setDoc(doc(firestoreDb, "users", String(u.username)), u);
    }
  } catch (err) {
    console.error("Firestore sync error:", err);
  }
}

function parseMetalsCsv() {
  const parsed: any[] = [];
  try {
    const filePath = path.join(process.cwd(), "metals.csv");
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        const headers = lines[0].split(",");
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",");
          if (cols.length < 4) continue;
          const astm = cols[0]; // source
          const productForm = cols[1];
          const metalType = cols[2];
          const grade = cols[3]; // name

          if (!grade) continue;

          const parameters: any[] = [];
          
          // Map composition parameters
          const compKeys = [
            { key: "C", minIdx: 4, maxIdx: 5, unit: "%" },
            { key: "Mn", minIdx: 6, maxIdx: 7, unit: "%" },
            { key: "Si", minIdx: 8, maxIdx: 9, unit: "%" },
            { key: "P", minIdx: 10, maxIdx: 11, unit: "%", d1000: true },
            { key: "S", minIdx: 12, maxIdx: 13, unit: "%", d1000: true },
            { key: "Cr", minIdx: 14, maxIdx: 15, unit: "%" },
            { key: "Ni", minIdx: 16, maxIdx: 17, unit: "%" },
            { key: "Mo", minIdx: 18, maxIdx: 19, unit: "%" },
            { key: "Cu", minIdx: 20, maxIdx: 21, unit: "%" },
            { key: "N", minIdx: 22, maxIdx: 23, unit: "%" },
            { key: "Ti", minIdx: 24, maxIdx: 25, unit: "%" },
            { key: "Nb", minIdx: 26, maxIdx: 27, unit: "%" },
            { key: "W", minIdx: 28, maxIdx: 29, unit: "%" },
            { key: "Al", minIdx: 30, maxIdx: 31, unit: "%" },
            { key: "B", minIdx: 32, maxIdx: 33, unit: "%" },
            { key: "Hardness Brinell (HB)", minIdx: 34, maxIdx: 35, unit: "HB" },
            { key: "Tensile Strength (TS)", minIdx: 36, maxIdx: 37, unit: "kgf/mm²" },
            { key: "Hardness Rockwell C (HRc)", minIdx: 38, maxIdx: 39, unit: "HRc" }
          ];

          for (const item of compKeys) {
            let minVal = cols[item.minIdx] ? cols[item.minIdx].trim() : "";
            let maxVal = cols[item.maxIdx] ? cols[item.maxIdx].trim() : "";
            
            // Handle divide-by-1000 logic for P and S whole numbers
            if (item.d1000) {
              if (minVal && !minVal.includes(".")) {
                const num = parseFloat(minVal);
                if (num > 1) minVal = (num / 1000).toFixed(3);
              }
              if (maxVal && !maxVal.includes(".")) {
                const num = parseFloat(maxVal);
                if (num > 1) maxVal = (num / 1000).toFixed(3);
              }
            }

            if (minVal || maxVal) {
              let spec = "";
              if (minVal && maxVal) {
                spec = `${minVal} - ${maxVal}`;
              } else if (minVal) {
                spec = `${minVal} min`;
              } else if (maxVal) {
                spec = `${maxVal} max`;
              }
              parameters.push({
                name: item.key,
                unit: item.unit,
                spec: spec
              });
            }
          }

          parsed.push({
            id: `csv-m-${i}-${grade.toLowerCase().replace(/\s+/g, "-")}`,
            category: "logam",
            name: grade,
            source: astm,
            description: `${metalType} (${productForm}) - ASTM ${astm}`,
            parameters: parameters
          });
        }
      }
    }
  } catch (err) {
    console.error("Error parsing metals.csv:", err);
  }
  return parsed;
}

function parseKarungCsv() {
  const parsed: any[] = [];
  try {
    const filePath = path.join(process.cwd(), "karung.csv");
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",");
          if (cols.length < 5) continue;
          const nama = cols[0]; // Grade name (e.g. PHONSKA SUB 50KG)
          if (!nama) continue;

          const parameters: any[] = [];

          // Column groups
          const paramDef = [
            { label: "Panjang Karung Luar", minIdx: 1, maxIdx: 2, unit: "cm" },
            { label: "Lebar Karung Luar", minIdx: 3, maxIdx: 4, unit: "cm" },
            { label: "Berat Karung Luar", minIdx: 5, maxIdx: 6, unit: "Gram" },
            { label: "Kuat Tarik Lusi Depan", minIdx: 7, maxIdx: 8, unit: "Kg" },
            { label: "Kuat Tarik Lusi Belakang", minIdx: 9, maxIdx: 10, unit: "Kg" },
            { label: "Kuat Tarik Pakan Depan", minIdx: 11, maxIdx: 12, unit: "Kg" },
            { label: "Kuat Tarik Pakan Belakang", minIdx: 13, maxIdx: 14, unit: "Kg" },
            { label: "Kuat Tarik Jahitan", minIdx: 15, maxIdx: 16, unit: "Kg" },
            { label: "Tetal Lusi / 10cm", minIdx: 17, maxIdx: 18, unit: "Helai" },
            { label: "Tetal Pakan / 10cm", minIdx: 19, maxIdx: 20, unit: "Helai" },
            { label: "Index Putih", minIdx: 21, maxIdx: 22, unit: "%" },
            { label: "Ekor Jahitan", minIdx: 23, maxIdx: 24, unit: "cm" },
            { label: "Jarak Jahitan", minIdx: 25, maxIdx: 26, unit: "cm" },
            { label: "Lebar Lipatan", minIdx: 27, maxIdx: 28, unit: "cm" },
            { label: "Setik / 10cm", minIdx: 29, maxIdx: 30, unit: "setik" },
            { label: "Panjang Karung Dalam", minIdx: 31, maxIdx: 32, unit: "cm" },
            { label: "Lebar Karung Dalam", minIdx: 33, maxIdx: 34, unit: "cm" },
            { label: "Berat Karung Dalam", minIdx: 35, maxIdx: 36, unit: "Gram" },
            { label: "Tebal Karung Dalam", minIdx: 37, maxIdx: 38, unit: "Mikron" },
            { label: "Kuat Tarik Lusi Dalam Depan", minIdx: 39, maxIdx: 40, unit: "Kg" },
            { label: "Kuat Tarik Lusi Dalam Belakang", minIdx: 41, maxIdx: 42, unit: "Kg" },
            { label: "Kuat Tarik Pakan Dalam Depan", minIdx: 43, maxIdx: 44, unit: "Kg" },
            { label: "Kuat Tarik Pakan Dalam Belakang", minIdx: 45, maxIdx: 46, unit: "Kg" },
            { label: "Kuat Tarik Lekat", minIdx: 47, maxIdx: 48, unit: "Kg" },
            { label: "Jarak Lekat", minIdx: 49, maxIdx: 50, unit: "cm" }
          ];

          for (const item of paramDef) {
            const minVal = cols[item.minIdx] ? cols[item.minIdx].trim() : "";
            const maxVal = cols[item.maxIdx] ? cols[item.maxIdx].trim() : "";
            if (minVal || maxVal) {
              let spec = "";
              if (minVal && maxVal) {
                spec = `${minVal} - ${maxVal}`;
              } else if (minVal) {
                spec = `${minVal} min`;
              } else if (maxVal) {
                spec = `${maxVal} max`;
              }
              parameters.push({
                name: item.label,
                unit: item.unit,
                spec: spec
              });
            }
          }

          parsed.push({
            id: `csv-k-${i}-${nama.toLowerCase().replace(/\s+/g, "-")}`,
            category: "karung",
            name: nama,
            source: "KSM INTERNAL",
            description: `Spesifikasi karung dan kantong pupuk standard PT Petrokimia Gresik`,
            parameters: parameters
          });
        }
      }
    }
  } catch (err) {
    console.error("Error parsing karung.csv:", err);
  }
  return parsed;
}

function loadDb() {
  let dbData: any;
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, "utf-8");
      dbData = JSON.parse(content);
    } else {
      dbData = {
        standards: DEFAULT_STANDARDS,
        signatures: DEFAULT_SIGNATURES,
        registrations: DEFAULT_REGISTRATIONS,
        users: [
          { username: "adm", password: "123", role: "SuperAdmin", name: "Administrator Utama", initials: "ADM" },
          { username: "uji", password: "123", role: "Tim Penguji", name: "Ragil Sulistiyo", initials: "RS" },
          { username: "rev", password: "123", role: "Tim Reviewer", name: "Budi Santoso", initials: "BS" }
        ]
      };
    }
  } catch (err) {
    console.error("Error reading database file, resetting:", err);
    dbData = {
      standards: DEFAULT_STANDARDS,
      signatures: DEFAULT_SIGNATURES,
      registrations: DEFAULT_REGISTRATIONS,
      users: [
        { username: "adm", password: "123", role: "SuperAdmin", name: "Administrator Utama", initials: "ADM" },
        { username: "uji", password: "123", role: "Tim Penguji", name: "Ragil Sulistiyo", initials: "RS" },
        { username: "rev", password: "123", role: "Tim Reviewer", name: "Budi Santoso", initials: "BS" }
      ]
    };
  }

  // Deduplicate and enrich with CSV standards
  const metalsFromCsv = parseMetalsCsv();
  const karungFromCsv = parseKarungCsv();
  const allCsvStds = [...metalsFromCsv, ...karungFromCsv];

  if (!dbData.standards) dbData.standards = [];

  for (const csvStd of allCsvStds) {
    const exists = dbData.standards.some((s: any) => s.category === csvStd.category && s.name.toLowerCase() === csvStd.name.toLowerCase());
    if (!exists) {
      dbData.standards.push(csvStd);
    }
  }

  // One-time automatic cleanup and re-indexing of registration numbers (Issue 10 & 11)
  if (dbData.registrations && !dbData.hasReindexed) {
    const sorted = [...dbData.registrations].sort((a: any, b: any) => {
      return (a.id || "").localeCompare(b.id || "");
    });

    const yearlyRegCounters: { [year: string]: number } = {};
    const yearlySuratCounters: { [year: string]: number } = {};

    sorted.forEach((r: any) => {
      let rYear = "";
      if (r.tanggalPPJ) {
        rYear = r.tanggalPPJ.split("-")[0];
      } else {
        rYear = new Date().getFullYear().toString();
      }

      if (!yearlyRegCounters[rYear]) {
        yearlyRegCounters[rYear] = 1;
      }
      const seqReg = yearlyRegCounters[rYear]++;
      r.noReg = String(seqReg).padStart(4, "0");

      if (r.status === "Terbit") {
        let sYear = "";
        if (r.tanggalTerbit) {
          sYear = r.tanggalTerbit.split("-")[0];
        } else {
          sYear = rYear;
        }

        if (!yearlySuratCounters[sYear]) {
          yearlySuratCounters[sYear] = 1;
        }
        const seqSurat = yearlySuratCounters[sYear]++;
        r.noSurat = `${String(seqSurat).padStart(4, "0")}/PR.00.02/90/MI/${sYear}`;
      } else {
        delete r.noSurat;
      }
    });

    dbData.registrations = sorted;
    dbData.hasReindexed = true;
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2));
    } catch (e) {
      console.error("Error writing migrated dbData in loadDb:", e);
    }
  }

  return dbData;
}

async function saveDb(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    if (firestoreDb) {
      await syncFirestoreData(data);
    }
  } catch (err) {
    console.error("Error saving database file:", err);
  }
}

// REST endpoints
app.get("/api/firebase/status", async (req, res) => {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  const configExists = fs.existsSync(firebaseConfigPath);
  let configContent = null;
  if (configExists) {
    try {
      configContent = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    } catch (e) {}
  }
  
  let initialized = !!firestoreDb;
  let connectionTest = "Untested";
  let errorMsg = null;
  let stats = { registrations: 0, standards: 0, signatures: 0, users: 0 };
  
  if (firestoreDb) {
    try {
      const colRef = collection(firestoreDb, "standards");
      const snapshot = await getDocs(colRef);
      connectionTest = "Success";
      stats.standards = snapshot.size;
      
      const regSnapshot = await getDocs(collection(firestoreDb, "registrations"));
      stats.registrations = regSnapshot.size;
      
      const sigSnapshot = await getDocs(collection(firestoreDb, "signatures"));
      stats.signatures = sigSnapshot.size;
      
      const userSnapshot = await getDocs(collection(firestoreDb, "users"));
      stats.users = userSnapshot.size;
    } catch (err: any) {
      connectionTest = "Failed";
      errorMsg = err.message || String(err);
    }
  }

  // Calculate local DB size to estimate Firestore document storage size
  let dbSizeBytes = 0;
  if (fs.existsSync(DB_PATH)) {
    try {
      const fileStats = fs.statSync(DB_PATH);
      dbSizeBytes = fileStats.size;
    } catch (e) {}
  }
  
  res.json({
    success: true,
    configExists,
    config: configContent ? {
      projectId: configContent.projectId,
      firestoreDatabaseId: configContent.firestoreDatabaseId
    } : null,
    initialized,
    connectionTest,
    errorMsg,
    stats,
    dbSizeBytes,
    limitBytes: 1073741824 // 1 GiB (Spark Plan)
  });
});

app.post("/api/firebase/force-sync", async (req, res) => {
  if (!firestoreDb) {
    return res.status(400).json({ success: false, message: "Firestore database is not initialized." });
  }
  try {
    const dbData = loadDb();
    console.log("Force seeding/syncing Firestore with local data...");
    
    let regCount = 0;
    for (const reg of dbData.registrations || []) {
      await setDoc(doc(firestoreDb, "registrations", String(reg.id)), reg);
      regCount++;
    }
    
    let stdCount = 0;
    for (const std of dbData.standards || []) {
      await setDoc(doc(firestoreDb, "standards", String(std.id)), std);
      stdCount++;
    }
    
    let sigCount = 0;
    for (const sig of dbData.signatures || []) {
      await setDoc(doc(firestoreDb, "signatures", String(sig.id)), sig);
      sigCount++;
    }
    
    let userCount = 0;
    for (const u of dbData.users || []) {
      await setDoc(doc(firestoreDb, "users", String(u.username)), u);
      userCount++;
    }
    
    res.json({
      success: true,
      message: "Sync completed successfully.",
      synced: {
        registrations: regCount,
        standards: stdCount,
        signatures: sigCount,
        users: userCount
      }
    });
  } catch (err: any) {
    console.error("Error in force-sync:", err);
    res.status(500).json({ success: false, message: "Sync failed: " + (err.message || String(err)) });
  }
});

app.get("/api/all-data", async (req, res) => {
  try {
    await syncDbFromFirestore();
  } catch (err) {
    console.error("Error syncing from Firestore on /api/all-data:", err);
  }
  const dbData = loadDb();
  res.json(dbData);
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const dbData = loadDb();
  const user = dbData.users.find(
    (u: any) => u.username === username && u.password === password
  );
  if (user) {
    res.json({ success: true, user: { username: user.username, role: user.role, name: user.name, initials: user.initials } });
  } else {
    res.status(401).json({ success: false, message: "Username atau Password salah." });
  }
});

app.post("/api/users/update", async (req, res) => {
  const { username, password, name, initials } = req.body;
  const dbData = loadDb();
  const userIdx = dbData.users.findIndex((u: any) => u.username === username);
  if (userIdx !== -1) {
    if (password) dbData.users[userIdx].password = password;
    if (name) dbData.users[userIdx].name = name;
    if (initials) dbData.users[userIdx].initials = initials;
    await saveDb(dbData);
    res.json({ success: true, user: dbData.users[userIdx] });
  } else {
    res.status(404).json({ success: false, message: "User tidak ditemukan." });
  }
});

app.post("/api/users/add", async (req, res) => {
  const { username, password, name, initials, role } = req.body;
  const dbData = loadDb();
  if (dbData.users.some((u: any) => u.username === username)) {
    return res.status(400).json({ success: false, message: "Username sudah terdaftar." });
  }
  const newUser = { username, password, name, initials, role };
  dbData.users.push(newUser);
  await saveDb(dbData);
  res.json({ success: true, user: newUser });
});

// Helper to get next sequential No Reg with leading zeros (0000 - 9999) that resets on year change
function getNextNoReg(dbData: any, targetYear: string): string {
  const yearRegs = dbData.registrations.filter((r: any) => {
    let rYear = "";
    if (r.tanggalPPJ) {
      rYear = r.tanggalPPJ.split("-")[0];
    } else {
      rYear = new Date().getFullYear().toString();
    }
    return rYear === targetYear;
  });

  if (yearRegs.length === 0) {
    return "0001";
  }

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
  return String(nextSeq).padStart(4, "0");
}

// Helper to get next sequential No Surat that resets on year change. Independent of No Reg. (Issue 11)
function getNextNoSurat(dbData: any, targetYear: string): string {
  const yearRegs = dbData.registrations.filter((r: any) => {
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
}

app.post("/api/registrations", async (req, res) => {
  const dbData = loadDb();
  const reg = req.body;
  
  // Format PPJ and Registration codes automatically
  const targetYearStr = (reg.tanggalPPJ || new Date().toISOString().split("T")[0]).split("-")[0];
  const ppjFour = reg.ppjCode.padStart(4, "0");
  const ppjFull = `${ppjFour}/LG.01.01/101/MI/${targetYearStr}`;
  
  // Create No Reg sequential if not input manually
  const noRegSeq = getNextNoReg(dbData, targetYearStr);
  const finalReg = {
    id: reg.id || `reg-${noRegSeq}`,
    noReg: reg.noReg || noRegSeq,
    ppjCode: ppjFour,
    ppjFull: ppjFull,
    prCode: reg.prCode,
    poCode: reg.poCode,
    vendor: reg.vendor.toUpperCase(),
    category: reg.category,
    standardName: reg.standardName,
    standardSource: reg.standardSource || "",
    itemName: reg.itemName.toUpperCase(),
    description: reg.description || "",
    quantity: reg.quantity || "1 Lot",
    points: parseInt(reg.points || "1", 10),
    status: reg.status || "Draft",
    tanggalPPJ: reg.tanggalPPJ || new Date().toISOString().split("T")[0],
    tanggalDiterima: reg.tanggalDiterima || new Date().toISOString().split("T")[0],
    results: reg.results || [],
    platNomor: reg.platNomor || "",
    isNewVendorFlag: reg.isNewVendorFlag || false,
    ballCount: reg.ballCount || "",
    sheetCount: reg.sheetCount || ""
  };
  
  dbData.registrations.push(finalReg);
  await saveDb(dbData);
  res.json({ success: true, registration: finalReg });
});

app.post("/api/registrations/edit", async (req, res) => {
  const { id, ppjCode, prCode, poCode, vendor, category, itemName, description, quantity, points, standardName, standardSource, tanggalPPJ, tanggalDiterima, platNomor, isNewVendorFlag, ballCount, sheetCount } = req.body;
  const dbData = loadDb();
  const idx = dbData.registrations.findIndex((r: any) => r.id === id);
  if (idx !== -1) {
    const reg = dbData.registrations[idx];
    if (reg.status === "Terbit") {
      return res.status(400).json({ success: false, message: "Registrasi yang sudah Terbit tidak dapat diubah." });
    }
    
    // Format PPJ automatically
    const year = new Date().getFullYear();
    const ppjFour = String(ppjCode || "0000").padStart(4, "0");
    const ppjFull = `${ppjFour}/LG.01.01/101/MI/${year}`;

    reg.ppjCode = ppjFour;
    reg.ppjFull = ppjFull;
    if (prCode !== undefined) reg.prCode = prCode;
    if (poCode !== undefined) reg.poCode = poCode;
    if (vendor !== undefined) reg.vendor = vendor.toUpperCase();
    if (category !== undefined) reg.category = category;
    if (itemName !== undefined) reg.itemName = itemName.toUpperCase();
    if (description !== undefined) reg.description = description;
    if (quantity !== undefined) reg.quantity = quantity;
    if (points !== undefined) reg.points = parseInt(points || "1", 10);
    if (standardName !== undefined) {
      if (standardName !== reg.standardName) {
        reg.standardName = standardName;
        reg.results = [];
      }
    }
    if (standardSource !== undefined) reg.standardSource = standardSource;
    if (tanggalPPJ !== undefined) reg.tanggalPPJ = tanggalPPJ;
    if (tanggalDiterima !== undefined) reg.tanggalDiterima = tanggalDiterima;
    if (platNomor !== undefined) reg.platNomor = platNomor;
    if (isNewVendorFlag !== undefined) reg.isNewVendorFlag = isNewVendorFlag;
    if (ballCount !== undefined) reg.ballCount = ballCount;
    if (sheetCount !== undefined) reg.sheetCount = sheetCount;

    await saveDb(dbData);
    res.json({ success: true, registration: reg });
  } else {
    res.status(404).json({ success: false, message: "Registrasi tidak ditemukan." });
  }
});

app.post("/api/registrations/delete", async (req, res) => {
  const { id } = req.body;
  const dbData = loadDb();
  const idx = dbData.registrations.findIndex((r: any) => r.id === id);
  if (idx !== -1) {
    const reg = dbData.registrations[idx];
    if (reg.status === "Terbit") {
      return res.status(400).json({ success: false, message: "Registrasi yang sudah Terbit tidak dapat dihapus." });
    }
    dbData.registrations.splice(idx, 1);
    await saveDb(dbData);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: "Registrasi tidak ditemukan." });
  }
});

// Batch registration (manual parsing lists or pasted Excel sheets)
app.post("/api/registrations/batch", async (req, res) => {
  const dbData = loadDb();
  const { items } = req.body;
  const inserted: any[] = [];

  for (const reg of items) {
    const targetYearStr = (reg.tanggalPPJ || new Date().toISOString().split("T")[0]).split("-")[0];
    const ppjFour = String(reg.ppjCode || "0000").padStart(4, "0");
    const ppjFull = `${ppjFour}/LG.01.01/101/MI/${targetYearStr}`;
    const noRegSeq = getNextNoReg(dbData, targetYearStr);
    
    const finalReg = {
      id: reg.id || `reg-${noRegSeq}`,
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
    dbData.registrations.push(finalReg);
    inserted.push(finalReg);
  }
  
  await saveDb(dbData);
  res.json({ success: true, count: inserted.length, items: inserted });
});

app.post("/api/registrations/update-results", (req, res) => {
  const { id, results, pengujiInitials, tanggalDiuji, customParams, selectedTools, notes, categoryOptions } = req.body;
  const dbData = loadDb();
  const idx = dbData.registrations.findIndex((r: any) => r.id === id);
  if (idx !== -1) {
    dbData.registrations[idx].results = results;
    dbData.registrations[idx].points = results.length;
    dbData.registrations[idx].pengujiInitials = pengujiInitials;
    dbData.registrations[idx].tanggalDiuji = tanggalDiuji || new Date().toISOString().split("T")[0];
    dbData.registrations[idx].status = "Uji"; // Go to Uji status after saving (represents awaiting review in this codebase)
    if (customParams) dbData.registrations[idx].customParams = customParams;
    if (selectedTools) dbData.registrations[idx].selectedTools = selectedTools;
    if (notes !== undefined) dbData.registrations[idx].notes = notes;
    if (categoryOptions !== undefined) dbData.registrations[idx].categoryOptions = categoryOptions;
    saveDb(dbData);
    res.json({ success: true, registration: dbData.registrations[idx] });
  } else {
    res.status(404).json({ success: false, message: "Registrasi tidak ditemukan." });
  }
});

app.post("/api/registrations/review", (req, res) => {
  const { id, approved, reviewerInitials, comments, useQrSignature } = req.body;
  const dbData = loadDb();
  const idx = dbData.registrations.findIndex((r: any) => r.id === id);
  if (idx !== -1) {
    const year = new Date().getFullYear();
    const reg = dbData.registrations[idx];
    if (approved) {
      reg.status = "Terbit";
      reg.reviewerInitials = reviewerInitials;
      reg.reviewerComments = comments || "Dokumen disetujui hasil uji sesuai.";
      reg.tanggalTerbit = new Date().toISOString().split("T")[0];
      const targetYearStr = reg.tanggalTerbit.split("-")[0];
      const nextSuratSeq = getNextNoSurat(dbData, targetYearStr);
      reg.noSurat = `${nextSuratSeq}/PR.00.02/90/MI/${targetYearStr}`;
      reg.trustCardId = `TC-${reg.noReg}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      reg.useQrSignature = useQrSignature !== undefined ? useQrSignature : true;
    } else {
      reg.status = "Draft"; // Reject back to edits
      reg.reviewerComments = comments || "Ditolak - Perlu pengujian/parameter ulang.";
    }
    saveDb(dbData);
    res.json({ success: true, registration: reg });
  } else {
    res.status(404).json({ success: false, message: "Registrasi tidak ditemukan." });
  }
});

// Master database endpoints
app.post("/api/master/standards", (req, res) => {
  const dbData = loadDb();
  const std = req.body;
  const newStd = {
    id: `std-${Date.now()}`,
    category: std.category,
    name: std.name,
    source: std.source,
    description: std.description || "",
    parameters: std.parameters || [],
    defaultNamaKarung: std.defaultNamaKarung || ""
  };
  dbData.standards.push(newStd);
  saveDb(dbData);
  res.json({ success: true, standard: newStd });
});

app.put("/api/master/standards/:id", (req, res) => {
  const { id } = req.params;
  const updatedStd = req.body;
  const dbData = loadDb();
  const idx = dbData.standards.findIndex((s: any) => s.id === id);
  if (idx !== -1) {
    dbData.standards[idx] = {
      ...dbData.standards[idx],
      category: updatedStd.category,
      name: updatedStd.name,
      source: updatedStd.source,
      description: updatedStd.description || "",
      parameters: updatedStd.parameters || [],
      defaultNamaKarung: updatedStd.defaultNamaKarung || ""
    };
    saveDb(dbData);
    res.json({ success: true, standard: dbData.standards[idx] });
  } else {
    res.status(404).json({ success: false, message: "Standard tidak ditemukan." });
  }
});

app.delete("/api/master/standards/:id", (req, res) => {
  const { id } = req.params;
  const dbData = loadDb();
  const initialLength = dbData.standards.length;
  dbData.standards = dbData.standards.filter((s: any) => s.id !== id);
  if (dbData.standards.length < initialLength) {
    saveDb(dbData);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: "Standard tidak ditemukan." });
  }
});

app.post("/api/master/standards/bulk", (req, res) => {
  const dbData = loadDb();
  const importedStds = req.body;
  if (!Array.isArray(importedStds)) {
    return res.status(400).json({ success: false, message: "Format data tidak valid." });
  }

  let addedCount = 0;
  let updatedCount = 0;

  for (const std of importedStds) {
    const existingIdx = dbData.standards.findIndex(
      (s: any) => s.category === std.category && s.name.toLowerCase() === std.name.toLowerCase()
    );

    if (existingIdx !== -1) {
      dbData.standards[existingIdx].source = std.source || dbData.standards[existingIdx].source;
      dbData.standards[existingIdx].description = std.description || dbData.standards[existingIdx].description || "";
      dbData.standards[existingIdx].parameters = std.parameters || dbData.standards[existingIdx].parameters;
      updatedCount++;
    } else {
      dbData.standards.push({
        id: `std-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        category: std.category,
        name: std.name,
        source: std.source || "KSM INTERNAL",
        description: std.description || "",
        parameters: std.parameters || []
      });
      addedCount++;
    }
  }

  saveDb(dbData);
  res.json({ success: true, addedCount, updatedCount });
});

app.post("/api/master/signatures", (req, res) => {
  const dbData = loadDb();
  const sig = req.body;
  const newSig = {
    id: `sig-${Date.now()}`,
    name: sig.name,
    position: sig.position,
    initials: sig.initials.toUpperCase(),
    active: false, // Default new signers to false, user will selectively activate them
    signatureType: sig.signatureType || "qrcode",
    signatureImage: sig.signatureImage || ""
  };
  dbData.signatures.push(newSig);
  saveDb(dbData);
  res.json({ success: true, signature: newSig });
});

app.put("/api/master/signatures/:id", (req, res) => {
  const { id } = req.params;
  const sig = req.body;
  const dbData = loadDb();
  const idx = dbData.signatures.findIndex((s: any) => s.id === id);
  if (idx !== -1) {
    dbData.signatures[idx] = {
      ...dbData.signatures[idx],
      name: sig.name || dbData.signatures[idx].name,
      position: sig.position || dbData.signatures[idx].position,
      initials: (sig.initials || dbData.signatures[idx].initials).toUpperCase(),
      signatureType: sig.signatureType || dbData.signatures[idx].signatureType || "qrcode",
      signatureImage: sig.signatureImage !== undefined ? sig.signatureImage : dbData.signatures[idx].signatureImage
    };
    saveDb(dbData);
    res.json({ success: true, signature: dbData.signatures[idx] });
  } else {
    res.status(404).json({ success: false, message: "Tanda tangan tidak ditemukan." });
  }
});

app.delete("/api/master/signatures/:id", (req, res) => {
  const { id } = req.params;
  const dbData = loadDb();
  const initialLength = dbData.signatures.length;
  const wasActive = dbData.signatures.find((s: any) => s.id === id)?.active;
  dbData.signatures = dbData.signatures.filter((s: any) => s.id !== id);
  if (wasActive && dbData.signatures.length > 0) {
    dbData.signatures[0].active = true;
  }
  if (dbData.signatures.length < initialLength) {
    saveDb(dbData);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: "Tanda tangan tidak ditemukan." });
  }
});

app.post("/api/master/signatures-toggle", (req, res) => {
  const { id } = req.body;
  const dbData = loadDb();
  let found = false;
  dbData.signatures = dbData.signatures.map((s: any) => {
    if (s.id === id) {
      found = true;
      return { ...s, active: true };
    }
    return { ...s, active: false };
  });
  if (found) {
    saveDb(dbData);
    res.json({ success: true, signatures: dbData.signatures });
  } else {
    res.status(404).json({ success: false, message: "Tanda tangan tidak ditemukan." });
  }
});

// Reusable helper to execute generateContent with dynamic model failover & retries to prevent 503/429/UNAVAILABLE errors
async function generateContentWithFallback(ai: any, params: {
  contents: any;
  config?: any;
}) {
  const models = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.5-pro",
    "gemini-1.5-pro"
  ];
  
  let lastError: any = null;
  for (const model of models) {
    try {
      console.log(`[Gemini API] Menghubungi model: ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config
      });
      console.log(`[Gemini API] Berhasil terhubung menggunakan model: ${model}`);
      return response;
    } catch (err: any) {
      console.warn(`[Gemini API] Model ${model} gagal atau sibuk:`, err.message || err);
      lastError = err;
      const errorMsg = String(err.message || "").toLowerCase();
      // Continue and try the next model regardless of the error type to achieve ultimate fault-tolerance!
      continue;
    }
  }
  throw lastError || new Error("Semua model Gemini sedang sibuk atau tidak tersedia saat ini. Silakan coba beberapa saat lagi.");
}

// Gemini AI Proxy OCR/File translation endpoint
app.post("/api/gemini/parse", async (req, res) => {
  const { promptText, base64Image, mimeType } = req.body;
  
  const dbData = loadDb();
  const registeredVendors = new Set<string>();
  if (dbData.registrations) {
    dbData.registrations.forEach((r: any) => {
      if (r.vendor) {
        registeredVendors.add(r.vendor.trim().toUpperCase());
      }
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    // If no API Key, return simulated parsing to let the user see how wonderfully it works
    console.log("No GEMINI_API_KEY environment variable found. Emulating parsing with support for both PPJ and Karung.");
    
    // We provide a rich simulated set that includes the 9 real rows of Sack/Benang acceptance list from user screenshot to delight the user!
    const mockList = [
      {
        ppjCode: "1756",
        prCode: "UNASSIGNED",
        poCode: "5000009134",
        vendor: "POLIPLAS MAKMUR SANTOSA",
        itemName: "NPK Sub 50kg",
        category: "karung",
        standardName: "PHONSKA SUB 50KG",
        quantity: "150,000 Lembar",
        description: "Ball: 300, Lembar: 150000, Nopol: H 8458 OC",
        ballCount: "300",
        sheetCount: "150,000",
        platNomor: "H 8458 OC"
      },
      {
        ppjCode: "1757",
        prCode: "UNASSIGNED",
        poCode: "5000009137",
        vendor: "POLIPLAS INDAH SEJAHTERA",
        itemName: "NPK Sub 50kg",
        category: "karung",
        standardName: "PHONSKA SUB 50KG",
        quantity: "100,000 Lembar",
        description: "Ball: 200, Lembar: 100000, Nopol: H 9781 OV",
        ballCount: "200",
        sheetCount: "100,000",
        platNomor: "H 9781 OV"
      },
      {
        ppjCode: "1758",
        prCode: "UNASSIGNED",
        poCode: "5000008932",
        vendor: "MURNI MAPAN MAKMUR",
        itemName: "NPK Sub 50kg",
        category: "karung",
        standardName: "PHONSKA SUB 50KG",
        quantity: "32,500 Lembar",
        description: "Ball: 65, Lembar: 32500, Nopol: N 9219 UT",
        ballCount: "65",
        sheetCount: "32,500",
        platNomor: "N 9219 UT"
      },
      {
        ppjCode: "1759",
        prCode: "UNASSIGNED",
        poCode: "5000008932",
        vendor: "MURNI MAPAN MAKMUR",
        itemName: "NPK Sub 50kg",
        category: "karung",
        standardName: "PHONSKA SUB 50KG",
        quantity: "32,500 Lembar",
        description: "Ball: 65, Lembar: 32500, Nopol: N 9327 UV",
        ballCount: "65",
        sheetCount: "32,500",
        platNomor: "N 9327 UV"
      },
      {
        ppjCode: "1760",
        prCode: "UNASSIGNED",
        poCode: "5000008926",
        vendor: "MURNI MAPAN MAKMUR",
        itemName: "Urea Sub 50kg",
        category: "karung",
        standardName: "UREA SUB 50KG",
        quantity: "40,000 Lembar",
        description: "Ball: 80, Lembar: 40000, Nopol: N 9224 UT",
        ballCount: "80",
        sheetCount: "40,000",
        platNomor: "N 9224 UT"
      },
      {
        ppjCode: "1761",
        prCode: "UNASSIGNED",
        poCode: "5000008929",
        vendor: "DUTAKEKAR PLASINDO",
        itemName: "NPK Sub 50kg",
        category: "karung",
        standardName: "PHONSKA SUB 50KG",
        quantity: "125,000 Lembar",
        description: "Ball: 250, Lembar: 125000, Nopol: AD 8048 HA",
        ballCount: "250",
        sheetCount: "125,000",
        platNomor: "AD 8048 HA"
      },
      {
        ppjCode: "1762",
        prCode: "UNASSIGNED",
        poCode: "5000008929",
        vendor: "DUTAKEKAR PLASINDO",
        itemName: "NPK Sub 50kg",
        category: "karung",
        standardName: "PHONSKA SUB 50KG",
        quantity: "125,000 Lembar",
        description: "Ball: 250, Lembar: 125000, Nopol: AD 8498 LA",
        ballCount: "250",
        sheetCount: "125,000",
        platNomor: "AD 8498 LA"
      },
      {
        ppjCode: "1764",
        prCode: "UNASSIGNED",
        poCode: "5100146629",
        vendor: "ADRIN SORIN SENTOSA",
        itemName: "Benang Putih",
        category: "benang",
        standardName: "Standard benang jahit karung PG",
        quantity: "1198.65 Kg",
        description: "Ball: 50 Box, Lembar: 1198.65 Kg, Nopol: L 9879 CL",
        ballCount: "50 Box",
        sheetCount: "1198.65 Kg",
        platNomor: "L 9879 CL"
      },
      {
        ppjCode: "1769",
        prCode: "UNASSIGNED",
        poCode: "5000008930",
        vendor: "GEMAH MAKMUR SEJAHTERA",
        itemName: "NPK Sub 50kg",
        category: "karung",
        standardName: "PHONSKA SUB 50KG",
        quantity: "150,050 Lembar",
        description: "Ball: 300, Lembar: 150000, Nopol: H 8074 OC",
        ballCount: "300",
        sheetCount: "150,050",
        platNomor: "H 8074 OC"
      }
    ];

    // Map new vendor / typo flag dynamically based on master lists
    const processedMockList = mockList.map((item: any) => {
      const standardVendor = item.vendor.trim().toUpperCase();
      const isExist = registeredVendors.has(standardVendor);
      
      // Let's enforce standard acuan matching & default name override for karung category
      if (item.category === "karung") {
        const karungStds = dbData.standards.filter((s: any) => s.category === "karung");
        const scannedName = (item.itemName || item.standardName || "").toLowerCase();
        let matchedStd = null;
        
        if (scannedName.includes("phonska") || scannedName.includes("npk")) {
          matchedStd = karungStds.find((s: any) => s.name.toLowerCase().includes("phonska"));
        } else if (scannedName.includes("urea")) {
          matchedStd = karungStds.find((s: any) => s.name.toLowerCase().includes("urea"));
        } else if (scannedName.includes("nitrea")) {
          matchedStd = karungStds.find((s: any) => s.name.toLowerCase().includes("nitrea"));
        } else if (scannedName.includes("za")) {
          matchedStd = karungStds.find((s: any) => s.name.toLowerCase().includes("za"));
        }
        
        if (!matchedStd) {
          let maxScore = 0;
          for (const std of karungStds) {
            const stdName = std.name.toLowerCase();
            const defaultName = (std.defaultNamaKarung || "").toLowerCase();
            let score = 0;
            if (scannedName.includes(stdName) || stdName.includes(scannedName)) score += 5;
            if (defaultName && (scannedName.includes(defaultName) || defaultName.includes(scannedName))) score += 5;
            if (score > maxScore) {
              maxScore = score;
              matchedStd = std;
            }
          }
        }
        
        if (!matchedStd && karungStds.length > 0) {
          matchedStd = karungStds[0];
        }
        
        if (matchedStd) {
          item.standardName = matchedStd.name;
          item.standardSource = matchedStd.source || "KSM INTERNAL";
          item.itemName = matchedStd.defaultNamaKarung || matchedStd.name;
        }
      }

      return {
        ...item,
        isNewVendorFlag: !isExist
      };
    });

    return res.json({
      success: true,
      message: "Menggunakan Engine Simulasi AI (Aktivasi API Key dapat dilakukan di Panel Secrets)",
      parsed: processedMockList
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    if (base64Image && mimeType) {
      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: base64Image
        }
      };
      
      const textPart = {
        text: `You are an OCR expert inspecting document sheets for Indonesian testing center PT PETROKIMIA GRESIK (Departemen ITRK).
Please analyze the image containing a table or sheet of parts requested for testing (PPJ sheet) OR a Sack Testing delivery receipt list / "BERITA ACARA KEBERTERIMAAN KARUNG DAN BENANG" (which has columns like Pemasok/Vendor, PO, Jenis Karung/Benang, Ball/Box, Lembar/Kg, Nopol, PPJ).

Extract the rows of data from the sheet.
If it is a sack delivery or yarn acceptance table:
- Map 'Pemasok' to 'vendor' (clean any parenthesized abbreviation codes like '(PMS)', '(MMM)', etc at the end, and uppercase it. E.g. "Poliplas Makmur Santosa (PMS)" -> "POLIPLAS MAKMUR SANTOSA").
- Map 'PO' to 'poCode' (10 digit starting with 50 or 51).
- Map 'Jenis Karung' / 'Jenis Benang' to 'itemName' (e.g. "NPK Sub 50kg" or "Benang Putih").
- StandardName should resolve to standard names depending on what Jenis is:
   * If it contains 'NPK' or 'Phonska' -> 'PHONSKA SUB 50KG'
   * If it contains 'Urea' -> 'UREA SUB 50KG'
   * If it contains 'Nitrea' -> 'NITREA 50KG'
   * If it contains 'ZA' -> 'ZA SUB 50KG'
   * If it's 'Benang' -> 'Standard benang jahit karung PG'
- Map 'Ball' or 'Box' column to 'ballCount'.
- Map 'Lembar' or 'Kg' column to 'sheetCount'.
- Map 'Nopol' to 'platNomor'.
- Map 'PPJ' to 'ppjCode'.
- Set 'category' to 'karung' (or 'benang' if it's jahit/benang material).
- 'quantity' should be the combined string of Lembar or Kg count, e.g. "150,000 Lembar" or "1198.65 Kg".
- 'description' should hold details like "Ball: 300, Lembar: 150000, Nopol: H 8458 OC" or any special cell details.

Output structured JSON list matching the schema under Type.ARRAY.`
      };
      
      const response = await generateContentWithFallback(ai, {
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ppjCode: { type: Type.STRING },
                prCode: { type: Type.STRING },
                poCode: { type: Type.STRING },
                vendor: { type: Type.STRING },
                itemName: { type: Type.STRING },
                category: { type: Type.STRING },
                standardName: { type: Type.STRING },
                quantity: { type: Type.STRING },
                description: { type: Type.STRING },
                ballCount: { type: Type.STRING },
                sheetCount: { type: Type.STRING },
                platNomor: { type: Type.STRING }
              }
            }
          }
        }
      });
      
      const parsedList = JSON.parse(response.text || "[]");
      
      const enrichParsedItem = (item: any) => {
        if (item.vendor) {
          const upperVendor = item.vendor.trim().toUpperCase();
          const isExist = registeredVendors.has(upperVendor);
          item.isNewVendorFlag = !isExist;
        } else {
          item.isNewVendorFlag = false;
        }

        if (item.category === "karung") {
          const karungStds = dbData.standards.filter((s: any) => s.category === "karung");
          const scannedName = (item.itemName || item.standardName || "").toLowerCase();
          let matchedStd = null;
          
          if (scannedName.includes("phonska") || scannedName.includes("npk")) {
            matchedStd = karungStds.find((s: any) => s.name.toLowerCase().includes("phonska"));
          } else if (scannedName.includes("urea")) {
            matchedStd = karungStds.find((s: any) => s.name.toLowerCase().includes("urea"));
          } else if (scannedName.includes("nitrea")) {
            matchedStd = karungStds.find((s: any) => s.name.toLowerCase().includes("nitrea"));
          } else if (scannedName.includes("za")) {
            matchedStd = karungStds.find((s: any) => s.name.toLowerCase().includes("za"));
          }
          
          if (!matchedStd) {
            let maxScore = 0;
            for (const std of karungStds) {
              const stdName = std.name.toLowerCase();
              const defaultName = (std.defaultNamaKarung || "").toLowerCase();
              let score = 0;
              if (scannedName.includes(stdName) || stdName.includes(scannedName)) score += 5;
              if (defaultName && (scannedName.includes(defaultName) || defaultName.includes(scannedName))) score += 5;
              if (score > maxScore) {
                maxScore = score;
                matchedStd = std;
              }
            }
          }
          
          if (!matchedStd && karungStds.length > 0) {
            matchedStd = karungStds[0];
          }
          
          if (matchedStd) {
            item.standardName = matchedStd.name;
            item.standardSource = matchedStd.source || "KSM INTERNAL";
            item.itemName = matchedStd.defaultNamaKarung || matchedStd.name;
          }
        }

        return item;
      };

      const enrichedList = parsedList.map(enrichParsedItem);
      return res.json({ success: true, parsed: enrichedList });
    } else {
      // Text prompt analysis
      const response = await generateContentWithFallback(ai, {
        contents: promptText || "Extract items from text",
        config: {
          systemInstruction: "Extract PT Petrokimia gresik inspection details. Return a JSON array matching the keys ppjCode, prCode, poCode, vendor, itemName, category, standardName, quantity, description.",
          responseMimeType: "application/json"
        }
      });
      const parsedList = JSON.parse(response.text || "[]");
      
      const enrichParsedItem = (item: any) => {
        if (item.vendor) {
          const upperVendor = item.vendor.trim().toUpperCase();
          const isExist = registeredVendors.has(upperVendor);
          item.isNewVendorFlag = !isExist;
        } else {
          item.isNewVendorFlag = false;
        }

        if (item.category === "karung") {
          const karungStds = dbData.standards.filter((s: any) => s.category === "karung");
          const scannedName = (item.itemName || item.standardName || "").toLowerCase();
          let matchedStd = null;
          
          if (scannedName.includes("phonska") || scannedName.includes("npk")) {
            matchedStd = karungStds.find((s: any) => s.name.toLowerCase().includes("phonska"));
          } else if (scannedName.includes("urea")) {
            matchedStd = karungStds.find((s: any) => s.name.toLowerCase().includes("urea"));
          } else if (scannedName.includes("nitrea")) {
            matchedStd = karungStds.find((s: any) => s.name.toLowerCase().includes("nitrea"));
          } else if (scannedName.includes("za")) {
            matchedStd = karungStds.find((s: any) => s.name.toLowerCase().includes("za"));
          }
          
          if (!matchedStd) {
            let maxScore = 0;
            for (const std of karungStds) {
              const stdName = std.name.toLowerCase();
              const defaultName = (std.defaultNamaKarung || "").toLowerCase();
              let score = 0;
              if (scannedName.includes(stdName) || stdName.includes(scannedName)) score += 5;
              if (defaultName && (scannedName.includes(defaultName) || defaultName.includes(scannedName))) score += 5;
              if (score > maxScore) {
                maxScore = score;
                matchedStd = std;
              }
            }
          }
          
          if (!matchedStd && karungStds.length > 0) {
            matchedStd = karungStds[0];
          }
          
          if (matchedStd) {
            item.standardName = matchedStd.name;
            item.standardSource = matchedStd.source || "KSM INTERNAL";
            item.itemName = matchedStd.defaultNamaKarung || matchedStd.name;
          }
        }

        return item;
      };

      const enrichedList = parsedList.map(enrichParsedItem);
      return res.json({ success: true, parsed: enrichedList });
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Gemini AI Nameplate OCR Analyzer
app.post("/api/gemini/analyze-nameplate", async (req, res) => {
  const base64Image = req.body.base64Image || req.body.imageBase64;
  const mimeType = req.body.mimeType || "image/jpeg";
  
  if (!process.env.GEMINI_API_KEY) {
    console.log("No GEMINI_API_KEY found. Emulating motor nameplate parsing.");
    return res.json({
      success: true,
      message: "Menggunakan Engine Simulasi AI (Aktivasi API Key dapat dilakukan di Panel Secrets)",
      detectedType: "motor_listrik",
      parsed: {
        merk: "SIEMENS",
        type: "1LA7083-4AA10",
        rpm: "1410",
        voltage: "380-415 V",
        hz_kw_ampere: "50 Hz / 0.75 kW / 1.83 A",
        ins_class_ip: "Class F / IP55",
        duty_pf: "S1 / PF 0.81",
        no_seri: "UD 1007/1234567-001"
      }
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    if (base64Image) {
      // Strip any data:image/*;base64, prefix if present
      let rawBase64 = base64Image;
      if (base64Image.includes(",")) {
        rawBase64 = base64Image.split(",")[1];
      }
      
      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: rawBase64
        }
      };
      const textPart = {
        text: `You are a professional industrial engineering nameplate analyst.
Inspect this nameplate image. Extract technical specifications and return them in a structured JSON.
Return keys:
- detectedType: can be "motor_listrik", "vibrator", or "gearcase_motor" depending on what kind of nameplate/machine this is.
- parsed: an object containing:
  - merk: manufacturer brand
  - type: exact model type/code
  - rpm: rating RPM
  - voltage: voltage range or value (e.g. 380V/415V or 220/380)
  - hz_kw_ampere: continuous power kW / hp details, frequency Hz, and current A
  - ins_class_ip: insulation class (e.g. Class F) and protection rating (e.g. IP55 Or IP65)
  - duty_pf: power factor cos phi and duty cycle (S1, etc)
  - no_seri: serial number string
  - gear_merk: brand of gearbox (for gearcase_motor only, otherwise empty)
  - gear_type: gearbox model/type (for gearcase_motor only, otherwise empty)
  - gear_rpm_input_output: gear speed ratio or output speed (for gearcase_motor only, otherwise empty)
  - gear_output_shaft: gearbox shaft dimensions if shown (for gearcase_motor only, otherwise empty)
  - gear_no_seri: gearbox serial number if shown (for gearcase_motor only, otherwise empty)

Ensure any fields that are not visible or unrecognizable are filled with a hyphen "-" instead of being empty. Output ONLY valid JSON, do not wrap in markdown quotes.`
      };

      const response = await generateContentWithFallback(ai, {
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedType: { type: Type.STRING },
              parsed: {
                type: Type.OBJECT,
                properties: {
                  merk: { type: Type.STRING },
                  type: { type: Type.STRING },
                  rpm: { type: Type.STRING },
                  voltage: { type: Type.STRING },
                  hz_kw_ampere: { type: Type.STRING },
                  ins_class_ip: { type: Type.STRING },
                  duty_pf: { type: Type.STRING },
                  no_seri: { type: Type.STRING },
                  gear_merk: { type: Type.STRING },
                  gear_type: { type: Type.STRING },
                  gear_rpm_input_output: { type: Type.STRING },
                  gear_output_shaft: { type: Type.STRING },
                  gear_no_seri: { type: Type.STRING }
                }
              }
            }
          }
        }
      });

      const resultObj = JSON.parse(response.text || "{}");
      return res.json({ success: true, ...resultObj });
    } else {
      return res.status(400).json({ success: false, message: "No image attached" });
    }
  } catch (error: any) {
    console.error("Gemini Nameplate OCR Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

async function startServer() {
  // Sync memory cache from active Google Cloud Firestore database on startup
  await syncDbFromFirestore();

  // Self-healing database validation and deduplication
  try {
    const dbData = loadDb();
    let dbChanged = false;

    if (dbData && Array.isArray(dbData.registrations)) {
      // 1. Check for specific anomalies (e.g., noReg "0011" having duplicate ID "reg-0033")
      dbData.registrations.forEach((r: any) => {
        if (r.noReg === "0011" && r.id === "reg-0033") {
          r.id = "reg-0011";
          dbChanged = true;
          console.log("Database repair: fixed reg-0011 with duplicate reg-0033 ID");
        }
      });

      // 2. Generic duplicate ID safety check to prevent React key duplications
      const seenIds = new Set<string>();
      dbData.registrations.forEach((r: any) => {
        if (!r.id || seenIds.has(r.id)) {
          const fallbackId = `reg-${r.noReg || Math.random().toString(36).substr(2, 6)}`;
          console.warn(`Database repair: Reassigned duplicate ID "${r.id}" to unique ID "${fallbackId}"`);
          r.id = fallbackId;
          dbChanged = true;
        }
        seenIds.add(r.id);
      });

      if (dbChanged) {
        console.log("Saving repaired database content locally and syncing to Firestore...");
        saveDb(dbData);
      }
    }
  } catch (err) {
    console.error("Failed to run self-healing database validation:", err);
  }

  // Vite setup for development mode, otherwise serve build
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`IRIS full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
