"use client";

import { FormEvent, useState } from "react";
import { createClinic } from "../lib/clinics";
import {
  type DaumPostcodeData,
  geocodeAddress,
  getKakaoKey,
  openPostcode,
} from "../lib/kakao";
import type { ClinicFormInput } from "../types";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "general", label: "General · 일반" },
  { value: "dermatology", label: "Dermatology · 피부과" },
  { value: "dentistry", label: "Dentistry · 치과" },
  { value: "ent", label: "ENT · 이비인후과" },
  { value: "gynecology", label: "Gynecology · 산부인과" },
  { value: "orthopedics", label: "Orthopedics · 정형외과" },
  { value: "pediatrics", label: "Pediatrics · 소아과" },
  { value: "ophthalmology", label: "Ophthalmology · 안과" },
  { value: "internal", label: "Internal Medicine · 내과" },
  { value: "family", label: "Family Medicine · 가정의학과" },
  { value: "psychiatry", label: "Psychiatry · 정신건강의학과" },
  { value: "oriental", label: "Oriental Medicine · 한의원" },
];

interface AddressState {
  address: string;
  region?: string;
  district?: string;
  geo?: { lat: number; lng: number };
  geoStatus: "idle" | "geocoding" | "ok" | "missing-key" | "not-found" | "error";
}

const emptyAddress: AddressState = { address: "", geoStatus: "idle" };

export default function ClinicForm() {
  const [nameKr, setNameKr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [category, setCategory] = useState("general");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState("");
  const [englishAvailable, setEnglishAvailable] = useState(false);

  const [addr, setAddr] = useState<AddressState>(emptyAddress);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] =
    useState<{ kind: "success" | "error"; text: string } | null>(null);

  const reset = () => {
    setNameKr("");
    setNameEn("");
    setAddressDetail("");
    setCategory("general");
    setPhone("");
    setHours("");
    setEnglishAvailable(false);
    setAddr(emptyAddress);
    setMessage(null);
  };

  const onPickAddress = async () => {
    try {
      await openPostcode(async (data: DaumPostcodeData) => {
        const chosen = data.roadAddress || data.address || data.jibunAddress;
        const next: AddressState = {
          address: chosen,
          region: data.sido,
          district: data.sigungu,
          geoStatus: "geocoding",
        };
        setAddr(next);

        const key = getKakaoKey();
        if (!key) {
          setAddr({ ...next, geoStatus: "missing-key" });
          return;
        }
        try {
          const geo = await geocodeAddress(chosen, key);
          if (geo) {
            setAddr({ ...next, geo, geoStatus: "ok" });
          } else {
            setAddr({ ...next, geoStatus: "not-found" });
          }
        } catch (err) {
          console.error(err);
          setAddr({ ...next, geoStatus: "error" });
        }
      });
    } catch (err) {
      console.error(err);
      setMessage({
        kind: "error",
        text: "주소 검색을 열 수 없습니다. 인터넷 연결을 확인해 주세요.",
      });
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nameKr.trim()) {
      setMessage({ kind: "error", text: "병원 이름을 입력해 주세요." });
      return;
    }
    if (!addr.address) {
      setMessage({ kind: "error", text: "주소를 검색해서 선택해 주세요." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const input: ClinicFormInput = {
        nameKr: nameKr.trim(),
        nameEn: nameEn.trim() || undefined,
        address: addr.address,
        addressDetail: addressDetail.trim() || undefined,
        region: addr.region,
        district: addr.district,
        geo: addr.geo,
        category,
        phone: phone.trim() || undefined,
        hours: hours.trim() || undefined,
        englishAvailable,
      };
      const id = await createClinic(input);
      setMessage({
        kind: "success",
        text: `등록 완료! (${id.slice(0, 6)}…) 환자 앱에서 바로 보입니다.`,
      });
      reset();
    } catch (err) {
      console.error(err);
      const text =
        err instanceof Error ? err.message : "등록 중 오류가 발생했습니다.";
      setMessage({ kind: "error", text });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-white border rounded-xl p-6" style={{ borderColor: "var(--color-rule)" }}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" autoComplete="off">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="병원 이름" required>
            <input
              type="text"
              value={nameKr}
              onChange={(e) => setNameKr(e.target.value)}
              placeholder="예: 강남이비인후과"
              required
              className={inputCls}
            />
          </Field>
          <Field label="English Name">
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Gangnam ENT Clinic"
              className={inputCls}
            />
          </Field>
        </div>

        <div
          className="flex flex-col gap-3 p-4 rounded-lg border border-dashed"
          style={{
            background: "var(--color-subtle)",
            borderColor: "var(--color-rule-strong)",
          }}
        >
          <Field label="주소 (한국어)" required>
            <div className="flex gap-2">
              <input
                type="text"
                value={addr.address}
                placeholder="주소 검색 버튼을 눌러 주세요"
                readOnly
                required
                className={`${inputCls} flex-1 cursor-pointer`}
                onClick={onPickAddress}
              />
              <button
                type="button"
                onClick={onPickAddress}
                className={btnPrimaryCls}
              >
                주소 검색
              </button>
            </div>
          </Field>
          <Field label="상세 주소 (선택)">
            <input
              type="text"
              value={addressDetail}
              onChange={(e) => setAddressDetail(e.target.value)}
              placeholder="예: 3층 301호"
              className={inputCls}
            />
          </Field>
          <GeoIndicator state={addr} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="카테고리">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputCls}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="전화번호 (선택)">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="02-1234-5678"
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <Field label="운영시간 (선택)">
            <input
              type="text"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="09:00 - 18:00"
              className={inputCls}
            />
          </Field>
          <label className="flex items-center gap-2.5 h-[42px] text-sm font-medium select-none">
            <input
              type="checkbox"
              checked={englishAvailable}
              onChange={(e) => setEnglishAvailable(e.target.checked)}
              className="w-4 h-4"
            />
            <span>English available</span>
          </label>
        </div>

        <div
          className="flex justify-end gap-2 pt-2 mt-1 border-t"
          style={{ borderColor: "var(--color-rule)" }}
        >
          <button
            type="button"
            onClick={reset}
            className={btnSecondaryCls + " h-11 px-5"}
            disabled={submitting}
          >
            초기화
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={btnPrimaryCls + " h-11 px-6"}
          >
            {submitting ? "등록 중…" : "등록 · Register"}
          </button>
        </div>

        {message && (
          <div
            className="text-[13px] rounded-md px-3.5 py-3 border"
            style={{
              background:
                message.kind === "success"
                  ? "var(--color-success-soft)"
                  : "var(--color-danger-soft)",
              color:
                message.kind === "success"
                  ? "var(--color-success)"
                  : "var(--color-danger)",
              borderColor:
                message.kind === "success"
                  ? "var(--color-success)"
                  : "var(--color-danger)",
            }}
          >
            {message.text}
          </div>
        )}
      </form>
    </section>
  );
}

export const inputCls =
  "h-[42px] px-3 rounded-md border bg-white text-[14px] outline-none transition-colors focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-rule-strong)]";

export const btnPrimaryCls =
  "inline-flex items-center justify-center gap-1.5 h-[42px] px-4 rounded-md font-semibold text-[13.5px] bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] disabled:bg-[var(--color-ink-3)] disabled:cursor-not-allowed transition-colors";

export const btnSecondaryCls =
  "inline-flex items-center justify-center gap-1.5 h-[42px] px-4 rounded-md font-semibold text-[13.5px] bg-white border hover:bg-[var(--color-subtle)] disabled:opacity-50 transition-colors";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-[10.5px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--color-ink-2)" }}
      >
        {label}
        {required && (
          <span className="ml-1" style={{ color: "var(--color-danger)" }}>
            *
          </span>
        )}
      </span>
      <div>{children}</div>
    </label>
  );
}

function GeoIndicator({ state }: { state: AddressState }) {
  let label: string;
  let tone: "muted" | "ok" | "warn" | "err" = "muted";
  switch (state.geoStatus) {
    case "idle":
      label = "주소를 선택하면 자동으로 채워집니다";
      break;
    case "geocoding":
      label = "좌표 변환 중…";
      break;
    case "ok":
      label = state.geo
        ? `${state.geo.lat.toFixed(5)}, ${state.geo.lng.toFixed(5)}`
        : "—";
      tone = "ok";
      break;
    case "missing-key":
      label = "Kakao 키가 없어 좌표를 저장하지 않습니다 (지도에 서울 기본 위치로 표시)";
      tone = "warn";
      break;
    case "not-found":
      label = "Kakao에서 좌표를 찾지 못했습니다";
      tone = "warn";
      break;
    case "error":
      label = "Kakao 좌표 변환 실패 — 키가 올바른지 확인하세요";
      tone = "err";
      break;
  }
  const dotColor = {
    muted: "var(--color-ink-3)",
    ok: "var(--color-success)",
    warn: "var(--color-warn)",
    err: "var(--color-danger)",
  } as const;
  const inkColor = {
    muted: "var(--color-ink-3)",
    ok: "var(--color-success)",
    warn: "var(--color-warn)",
    err: "var(--color-danger)",
  } as const;
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: dotColor[tone] }}
      />
      <span
        className="font-semibold uppercase tracking-[0.1em] text-[10.5px]"
        style={{ color: "var(--color-ink-3)" }}
      >
        Geo
      </span>
      <span className="font-mono tabular" style={{ color: inkColor[tone] }}>
        {label}
      </span>
    </div>
  );
}
