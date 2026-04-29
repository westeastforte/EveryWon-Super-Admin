"use client";

import { useEffect, useState } from "react";
import { subscribeClinics } from "../lib/clinics";
import type { ClinicDoc } from "../types";

export default function OverviewStats() {
  const [clinics, setClinics] = useState<ClinicDoc[] | null>(null);

  useEffect(() => {
    const unsub = subscribeClinics(
      (cs) => setClinics(cs),
      () => setClinics([]),
    );
    return () => unsub();
  }, []);

  const total = clinics?.length ?? null;
  const withGeo = clinics?.filter((c) => c.geo).length ?? null;
  const withoutGeo =
    total !== null && withGeo !== null ? total - withGeo : null;
  const verified = clinics?.filter((c) => c.isVerified).length ?? null;

  const geoPct =
    total && withGeo !== null && total > 0
      ? Math.round((withGeo / total) * 100)
      : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl bg-white border overflow-hidden">
      <Stat label="Total clinics" kr="총 병원" value={total} />
      <Stat
        label="Has coordinates"
        kr="좌표 있음"
        value={withGeo}
        suffix={geoPct !== null ? `${geoPct}%` : undefined}
      />
      <Stat
        label="Missing coords"
        kr="좌표 없음"
        value={withoutGeo}
        tone={withoutGeo && withoutGeo > 0 ? "warn" : "muted"}
      />
      <Stat label="Verified" kr="검증됨" value={verified} />
    </div>
  );
}

function Stat({
  label,
  kr,
  value,
  suffix,
  tone = "muted",
}: {
  label: string;
  kr: string;
  value: number | null;
  suffix?: string;
  tone?: "muted" | "warn";
}) {
  return (
    <div
      className="px-5 py-4 border-r last:border-r-0"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div
        className="text-[10.5px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--color-ink-3)" }}
      >
        {label}
      </div>
      <div
        className="text-[10px] mt-0.5 mb-1"
        style={{ color: "var(--color-ink-3)" }}
      >
        {kr}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="text-[28px] font-bold tracking-tight tabular leading-none"
          style={{
            color:
              tone === "warn" ? "var(--color-warn)" : "var(--color-ink)",
          }}
        >
          {value === null ? "—" : value.toLocaleString()}
        </span>
        {suffix && (
          <span
            className="text-[12px] font-semibold tabular"
            style={{ color: "var(--color-ink-3)" }}
          >
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
