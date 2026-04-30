"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getClinic, updateClinic } from "../lib/clinics";
import type { ClinicDoc, ClinicFormInput } from "../types";
import ClinicForm from "./ClinicForm";

export default function ClinicEdit({ id }: { id: string }) {
  const [clinic, setClinic] = useState<ClinicDoc | null | "loading">("loading");

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

  // Hand the form a custom submit that updates the doc instead of
  // creating a new one. We keep nameKr authoritative — the form already
  // requires it — and fall back to it for the display `name` field so
  // the patient app's list doesn't show stale "Unnamed clinic" defaults.
  const onSubmit = async (input: ClinicFormInput): Promise<string> => {
    await updateClinic(clinic.id, {
      name: input.nameKr || input.nameEn || "Unnamed clinic",
      nameKr: input.nameKr,
      nameEn: input.nameEn,
      address: input.address,
      addressText: input.address,
      addressDetail: input.addressDetail,
      region: input.region,
      district: input.district,
      geo: input.geo,
      category: input.category,
      phone: input.phone,
      hours: input.hours?.trim() || "—",
      englishAvailable: input.englishAvailable,
    });
    return clinic.id;
  };

  return (
    <div className="flex flex-col gap-4">
      <ClinicForm initial={clinic} onSubmit={onSubmit} />
      <div className="flex items-center justify-between">
        <Link
          href={`/clinics/${clinic.id}`}
          className="text-[13px] font-semibold"
          style={{ color: "var(--color-ink-2)" }}
        >
          ← 상세로
        </Link>
        <Link
          href="/clinics"
          className="text-[13px] font-semibold"
          style={{ color: "var(--color-ink-2)" }}
        >
          목록으로 →
        </Link>
      </div>
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
