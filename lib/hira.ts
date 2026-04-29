import { inferCategory } from "./categoryMap";
import type { ClinicFormInput } from "../types";

// HIRA "병의원 및 약국 현황" columns vary by year/edition. We accept a
// few synonyms for each conceptual field so the same mapper works on
// the most common exports without per-file tweaking.
const NAME_KEYS = ["요양기관명", "병원명", "기관명", "name", "Name"];
const TYPE_KEYS = ["종별코드명", "종별명", "type"];
const REGION_KEYS = ["시도코드명", "시도", "sido", "region"];
const DISTRICT_KEYS = ["시군구코드명", "시군구", "sigungu", "district"];
const ADDRESS_KEYS = ["주소", "도로명주소", "address", "Address"];
const PHONE_KEYS = ["전화번호", "대표전화", "phone", "Phone"];
const HOMEPAGE_KEYS = ["병원홈페이지", "홈페이지", "url", "website"];
// HIRA exports lat/lng under several names. Coordinates are typically
// WGS84 in modern (post-2018) exports — older files used EPSG:5174 (TM
// Central). We trust the values; if your import looks "shifted ~700m"
// the file is in EPSG:5174 and needs reprojecting before upload.
const LAT_KEYS = ["좌표(Y)", "y좌표", "Y", "lat", "latitude", "위도"];
const LNG_KEYS = ["좌표(X)", "x좌표", "X", "lng", "longitude", "경도"];

const pick = (
  row: Record<string, string>,
  keys: string[],
): string | undefined => {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v.trim() !== "") return v.trim();
  }
  return undefined;
};

const toNum = (s: string | undefined): number | undefined => {
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};

export interface MappedRow {
  ok: boolean;
  reason?: string;
  input?: ClinicFormInput;
}

export const mapHiraRow = (row: Record<string, string>): MappedRow => {
  const name = pick(row, NAME_KEYS);
  const address = pick(row, ADDRESS_KEYS);
  if (!name) return { ok: false, reason: "missing name" };
  if (!address) return { ok: false, reason: "missing address" };

  const lat = toNum(pick(row, LAT_KEYS));
  const lng = toNum(pick(row, LNG_KEYS));
  const hasGeo =
    lat !== undefined &&
    lng !== undefined &&
    lat > 30 && lat < 45 && // Korea is ~33–39°N
    lng > 120 && lng < 135;

  const region = pick(row, REGION_KEYS);
  const district = pick(row, DISTRICT_KEYS);
  const phone = pick(row, PHONE_KEYS);
  const type = pick(row, TYPE_KEYS);

  return {
    ok: true,
    input: {
      nameKr: name,
      address,
      region,
      district,
      geo: hasGeo ? { lat: lat!, lng: lng! } : undefined,
      category: inferCategory(type, name),
      phone,
      englishAvailable: false,
    },
  };
};

export const mapCsvRows = (
  header: string[],
  rows: string[][],
): {
  inputs: ClinicFormInput[];
  rejected: { reason: string; raw: Record<string, string> }[];
} => {
  const inputs: ClinicFormInput[] = [];
  const rejected: { reason: string; raw: Record<string, string> }[] = [];
  for (const r of rows) {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = r[i] ?? "";
    });
    const mapped = mapHiraRow(obj);
    if (mapped.ok && mapped.input) {
      inputs.push(mapped.input);
    } else {
      rejected.push({ reason: mapped.reason || "unknown", raw: obj });
    }
  }
  return { inputs, rejected };
};

// Guess whether a header row looks like HIRA (or at least a Korean
// clinic dataset) — used to surface a hint in the UI.
export const looksLikeHira = (header: string[]): boolean => {
  const set = new Set(header);
  return (
    NAME_KEYS.some((k) => set.has(k)) && ADDRESS_KEYS.some((k) => set.has(k))
  );
};
