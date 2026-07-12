export const DEFAULT_STANDARDS = [
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
    name: "Standard Pengujian Valve",
    source: "KSM INTERNAL",
    description: "Standar pengujian hydrostatic & pneumatic valve",
    parameters: [
      { name: "Nilai Pressure", unit: "Psi", spec: "Sesuai PO" },
      { name: "Item yang di uji", unit: "Text", spec: "Sesuai PO" },
      { name: "sample di uji", unit: "Text", spec: "Sesuai PO" },
      { name: "Jumlah Sample", unit: "Pcs", spec: "Sesuai PO" },
      { name: "Jumlah Pass", unit: "Pcs", spec: "Sesuai PO" },
      { name: "Jumlah Gagal", unit: "Pcs", spec: "0" },
      { name: "Shell Hydrostatic Test", unit: "Status", spec: "LULUS / MEMENUHI SYARAT" },
      { name: "Seat Pneumatic Test", unit: "Status", spec: "LULUS / MEMENUHI SYARAT" }
    ]
  },
  {
    id: "std-8",
    category: "filter cloth",
    name: "Standard Filter Cloth",
    source: "KSM INTERNAL",
    description: "Standar pengujian filter cloth air permeability",
    parameters: [
      { name: "Air Permeability", unit: "cc/cm2/s", spec: "125 - 175" }
    ]
  },
  {
    id: "std-9",
    category: "rubber",
    name: "Standard Rubber",
    source: "KSM INTERNAL",
    description: "Standar pengujian fisik rubber (Shore A, Shore D, Panas)",
    parameters: [
      { name: "Shore A", unit: "Shore A", spec: "60 - 80" },
      { name: "Shore D", unit: "Shore D", spec: "60 - 80" },
      { name: "Ketahanan Panas", unit: "Status", spec: "Tahan/Tidak Rusak" }
    ]
  }
];

export const DEFAULT_SIGNATURES = [
  { id: "sig-1", name: "Ragil Sulistiyo", position: "ITRK Bengkel & Uji Material", initials: "RS", active: true },
  { id: "sig-2", name: "Budi Santoso", position: "Kepala Departemen ITRK", initials: "BS", active: true },
  { id: "sig-3", name: "Imron Rosyadi", position: "Senior Inspector ITRK", initials: "IR", active: true }
];

export const DEFAULT_USERS = [
  { username: "adm", password: "123", role: "SuperAdmin", name: "Administrator Utama", initials: "ADM" },
  { username: "uji", password: "123", role: "Tim Penguji", name: "Ragil Sulistiyo", initials: "RS" },
  { username: "rev", password: "123", role: "Tim Reviewer", name: "Budi Santoso", initials: "BS" }
];

export const DEFAULT_REGISTRATIONS = [
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
    standardName: "Standard PO Vs Nameplate",
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
  }
];
