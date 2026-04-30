"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getClinic, translateClinicNow } from "../lib/clinics";
import type { ClinicDoc } from "../types";
import { btnPrimaryCls, btnSecondaryCls } from "./ClinicForm";
import { IconArrowRight } from "./Icons";

export default function ClinicDetail({ id }: { id: string }) {
  const [clinic, setClinic] = useState<ClinicDoc | null | "loading">("loading");
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getClinic(id)
      .then((c) => {
        if (!cancelled) setClinic(c);
      })
      .catch(() => {
        if (!cancelled) setClinic(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onTranslate = async () => {
    if (!clinic || clinic === "loading" || !clinic.nameKr) return;
    setTranslating(true);
    setTranslateError(null);
    try {
      const en = await translateClinicNow(clinic.id, clinic.nameKr, clinic.address);
      if (!en) {
        setTranslateError(
          "번역 실패 — GEMINI_API_KEY가 설정되어 있는지 확인하세요.",
        );
      } else {
        setClinic({ ...clinic, nameEn: en });
      }
    } finally {
      setTranslating(false);
    }
  };

  if (clinic === "loading") {
    return <Card>불러오는 중…</Card>;
  }
  if (!clinic) {
    return (
      <Card>
        해당 ID의 병원을 찾지 못했습니다.{" "}
        <Link href="/clinics" className="underline font-semibold">
          목록으로
        </Link>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section
        className="bg-white border rounded-xl p-6"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex flex-col gap-1 min-w-0">
            <h2
              className="text-[20px] font-bold m-0 truncate"
              style={{ color: "var(--color-ink)" }}
            >
              {clinic.nameKr || clinic.nameEn || clinic.name}
            </h2>
            {clinic.nameEn && clinic.nameKr && (
              <span
                className="text-[14px] truncate"
                style={{ color: "var(--color-ink-2)" }}
              >
                {clinic.nameEn}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {clinic.nameKr && (
              <button
                type="button"
                onClick={onTranslate}
                disabled={translating}
                className={btnSecondaryCls + " h-9 px-3 text-[12px]"}
              >
                {translating
                  ? "번역 중…"
                  : clinic.nameEn
                    ? "다시 번역"
                    : "AI 번역"}
              </button>
            )}
            <Link
              href={`/clinics/${clinic.id}/edit`}
              className={btnPrimaryCls + " h-9 px-3 text-[12px]"}
            >
              Edit
              <IconArrowRight width={12} height={12} />
            </Link>
          </div>
        </div>

        {translateError && (
          <div
            className="text-[12px] rounded-md px-3 py-2 border mb-4"
            style={{
              background: "var(--color-danger-soft)",
              color: "var(--color-danger)",
              borderColor: "var(--color-danger)",
            }}
          >
            {translateError}
          </div>
        )}

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-[13.5px]">
          <Row label="Korean Name" value={clinic.nameKr} />
          <Row label="English Name" value={clinic.nameEn} mono={false} />
          <Row label="Category" value={clinic.category} />
          <Row label="Phone" value={clinic.phone} mono />
          <Row label="Region" value={clinic.region} />
          <Row label="District" value={clinic.district} />
          <Row label="Address" value={clinic.address} wide />
          <Row label="Address Detail" value={clinic.addressDetail} wide />
          <Row label="Hours" value={clinic.hours} />
          <Row
            label="English Available"
            value={clinic.englishAvailable ? "Yes" : "No"}
          />
          <Row
            label="Coordinates"
            value={
              clinic.geo
                ? `${clinic.geo.lat.toFixed(5)}, ${clinic.geo.lng.toFixed(5)}`
                : undefined
            }
            mono
          />
          <Row label="Active" value={clinic.isActive ? "Yes" : "No"} />
          <Row label="Verified" value={clinic.isVerified ? "Yes" : "No"} />
          <Row label="Created" value={fmtDate(clinic.createdAt)} mono />
          <Row label="Updated" value={fmtDate(clinic.updatedAt)} mono />
        </dl>
      </section>

      <Link
        href="/clinics"
        className="text-[13px] font-semibold self-start"
        style={{ color: "var(--color-ink-2)" }}
      >
        ← 목록으로
      </Link>
    </div>
  );
}

const fmtDate = (iso: string | undefined): string | undefined => {
  if (!iso) return undefined;
  try {
    return new Date(iso).toLocaleString("ko-KR");
  } catch {
    return iso;
  }
};

function Row({
  label,
  value,
  mono,
  wide,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  wide?: boolean;
}) {
  const v = value && String(value).trim() ? String(value) : "—";
  return (
    <div className={`flex flex-col gap-0.5 ${wide ? "sm:col-span-2" : ""}`}>
      <dt
        className="text-[10.5px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--color-ink-3)" }}
      >
        {label}
      </dt>
      <dd
        className={`m-0 break-words ${mono ? "font-mono tabular text-[12.5px]" : ""}`}
        style={{ color: v === "—" ? "var(--color-ink-3)" : "var(--color-ink)" }}
      >
        {v}
      </dd>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="bg-white border rounded-xl px-5 py-6 text-[13.5px]"
      style={{ borderColor: "var(--color-rule)", color: "var(--color-ink-2)" }}
    >
      {children}
    </section>
  );
}
