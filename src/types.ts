export interface Parameter {
  name: string;
  unit: string;
  spec: string; // Specification limit, e.g. "0.08 max" or "18.00 - 20.00"
}

export interface Standard {
  id: string;
  category: "karung" | "logam" | "filter cloth" | "kelistrikan" | "Valve" | "benang" | "rubber";
  name: string;
  source: string; // e.g. "ASTM A240" or "KSM-K10"
  description?: string;
  parameters: Parameter[];
  defaultNamaKarung?: string;
}

export interface Signature {
  id: string;
  name: string;
  position: string;
  initials: string;
  active: boolean;
  signatureImage?: string;
  signatureType?: "digital" | "qrcode";
}

export interface PointResult {
  pointIndex: number;
  pointName: string;
  values: { [paramName: string]: string }; // Map parameter name -> user inputted result value
  keteranganUji?: string;
  overrideStandardId?: string;
  overrideStandardName?: string;
  overrideStandardSource?: string;
}

export type TestingStatus = "Draft" | "Uji" | "Review" | "Terbit";

export interface Registration {
  id: string;
  noReg: string; // 4 sequential digits (matches sequential counter or letter sequence)
  noSurat?: string; // (4 angka)/PR.00.02/90/MI/(tahun) set at publication
  ppjCode: string; // e.g. "1023" (4-digits)
  ppjFull: string; // e.g. "1023/LG.01.01/101/MI/2026" (generated text)
  prCode: string;
  poCode: string;
  vendor: string;
  category: "karung" | "logam" | "filter cloth" | "kelistrikan" | "Valve" | "benang" | "rubber";
  standardName: string;
  standardSource?: string;
  itemName: string;
  description: string;
  quantity: string;
  points: number; // Jml Titik Uji
  status: TestingStatus;
  tanggalPPJ: string;
  tanggalDiterima: string;
  tanggalDiuji?: string;
  tanggalTerbit?: string;
  pengujiInitials?: string;
  reviewerInitials?: string;
  trustCardId?: string; // Digital Trust Verification code
  useQrSignature?: boolean;
  results: PointResult[];
  reviewerComments?: string;
  customParams?: Parameter[];
  selectedTools?: string[];
  notes?: string;
  categoryOptions?: any;
  platNomor?: string;
  isNewVendorFlag?: boolean;
  ballCount?: string;
  sheetCount?: string;
}

export interface User {
  username: string;
  role: "SuperAdmin" | "Tim Penguji" | "Tim Reviewer";
  name: string;
  initials: string;
}

/**
 * Checks whether a given measurement value is out of specification
 * based on the target specification definition.
 */
export function checkIsOffSpec(val: string | undefined, spec: string | undefined): boolean {
  if (!val) return false;
  
  const cleanVal = val.trim();
  if (!cleanVal || cleanVal === "-" || cleanVal === "") return false;

  // Manual warning trigger via trailing asterisk
  if (cleanVal.endsWith("*")) return true;

  if (!spec) return false;
  const cleanSpec = spec.trim();
  if (cleanSpec === "-" || cleanSpec === "" || cleanSpec.toLowerCase() === "text") return false;

  // Helper helper to extract numeric content from strings
  const extractNumbers = (str: string): number[] => {
    // Strip % and common units to prevent parsing problems, e.g. "1.5%" -> "1.5"
    const cleaned = str.replace(/%/g, "").replace(/\([^\)]*\)/g, "").trim();
    const matches = cleaned.match(/-?\d+(?:\.\d+)?/g);
    return matches ? matches.map(Number) : [];
  };

  // Convert spec and val to normalize spaces
  const normalizedSpec = cleanSpec.replace(/\s+/g, " ");
  const normalizedVal = cleanVal.replace(/\s+/g, " ");

  // 1. Try to check if spec is a range (e.g., "1 - 2 %", "1-2%", "18.00-20.00")
  // Let's strip spaces around '-' to make it easy to parse
  const collapsedSpec = normalizedSpec.replace(/\s*[-–—]\s*/g, "-");
  const rangeMatch = collapsedSpec.match(/^(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)(.*)$/);

  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    const valNums = extractNumbers(normalizedVal);
    if (valNums.length > 0) {
      const v = valNums[0];
      if (v < min || v > max) {
        return true; // Outside bounds
      }
      return false; // Within bounds
    }
  }

  // 2. Try minimum bound if keyword exists (e.g. ">= 18.0", "min 18", "18 min")
  if (/(?:>=|>|min)/i.test(normalizedSpec)) {
    const specNums = extractNumbers(normalizedSpec);
    const valNums = extractNumbers(normalizedVal);
    if (specNums.length > 0 && valNums.length > 0) {
      return valNums[0] < specNums[0];
    }
  }

  // 3. Try maximum bound if keyword exists (e.g. "<=|<|max|maks")
  if (/(?:<=|<|max|maks)/i.test(normalizedSpec)) {
    const specNums = extractNumbers(normalizedSpec);
    const valNums = extractNumbers(normalizedVal);
    if (specNums.length > 0 && valNums.length > 0) {
      return valNums[0] > specNums[0];
    }
  }

  // 4. Try single exact numeric target (e.g., "380", "1430")
  const specNums = extractNumbers(normalizedSpec);
  const valNums = extractNumbers(normalizedVal);
  if (specNums.length === 1 && valNums.length === 1) {
    // Within 2% tolerance for electric or mechanical ratings if not specified, otherwise exact
    const specNum = specNums[0];
    const valNum = valNums[0];
    if (specNum > 100) { // e.g. Voltages or RPMs, allow 10% deviation tolerance
      const tolerance = specNum * 0.10;
      return Math.abs(valNum - specNum) > tolerance;
    }
    return valNum !== specNum;
  }

  // 5. Plain text comparison
  const normalizeText = (str: string) => {
    return str
      .toLowerCase()
      .replace(/\(ok\)/i, "")
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");
  };

  const normSpec = normalizeText(normalizedSpec);
  const normVal = normalizeText(normalizedVal);

  if (normSpec && normVal) {
    const lowerVal = normalizedVal.toLowerCase();
    if (lowerVal.includes("tidak") || lowerVal.includes("off") || lowerVal.includes("fail") || lowerVal.includes("deviasi")) {
      return true; // Explicitly fail/off-spec words
    }
    // If spec text does not contain val text, and vice versa
    if (!normVal.includes(normSpec) && !normSpec.includes(normVal)) {
      return true;
    }
  }

  return false;
}
