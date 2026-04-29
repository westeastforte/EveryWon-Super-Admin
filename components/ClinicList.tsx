"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteClinic, subscribeClinics } from "../lib/clinics";
import type { ClinicDoc } from "../types";
import { IconSearch, IconTrash } from "./Icons";

export default function ClinicList() {
  const [clinics, setClinics] = useState<ClinicDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const unsub = subscribeClinics(
      (cs) => {
        setClinics(cs);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setClinics([]);
      },
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (!clinics) return null;
    const q = filter.trim().toLowerCase();
    if (!q) return clinics;
    return clinics.filter((c) =>
      [c.nameKr, c.nameEn, c.name, c.address, c.region, c.district]
        .filter(Boolean)
        .some((s) => (s as string).toLowerCase().includes(q)),
    );
  }, [clinics, filter]);

  const onDelete = async (c: ClinicDoc) => {
    const label = c.nameKr || c.nameEn || c.name;
    if (!window.confirm(`"${label}" 병원을 삭제할까요?`)) return;
    setBusyId(c.id);
    try {
      await deleteClinic(c.id);
    } catch (err) {
      console.error(err);
      window.alert(
        "삭제 실패 — Firestore 규칙에서 이 사용자에게 삭제 권한이 있는지 확인하세요.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      className="bg-white border rounded-xl overflow-hidden"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <div className="flex items-center gap-2 flex-1">
          <IconSearch
            className="shrink-0"
            width={16}
            height={16}
            color="var(--color-ink-3)"
          />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="병원명 / 주소 / 지역 검색"
            className="flex-1 bg-transparent outline-none text-[13.5px] placeholder:text-[var(--color-ink-3)]"
          />
        </div>
        <span
          className="text-[11px] font-semibold tabular px-2 py-0.5 rounded-md border"
          style={{
            color: "var(--color-ink-2)",
            borderColor: "var(--color-rule)",
            background: "var(--color-subtle)",
          }}
        >
          {filtered?.length ?? "—"}
          {filter && clinics ? ` / ${clinics.length}` : ""}
        </span>
      </div>

      {error && (
        <div
          className="text-[13px] px-4 py-3 border-b"
          style={{
            background: "var(--color-danger-soft)",
            color: "var(--color-danger)",
            borderColor: "var(--color-rule)",
          }}
        >
          {error}
        </div>
      )}

      {filtered === null && <EmptyRow text="불러오는 중…" />}
      {filtered && filtered.length === 0 && !error && (
        <EmptyRow
          text={
            filter
              ? "검색 결과가 없습니다."
              : "아직 등록된 병원이 없습니다."
          }
        />
      )}

      {filtered && filtered.length > 0 && (
        <ul className="list-none p-0 m-0 divide-y" style={{ borderColor: "var(--color-rule)" }}>
          {filtered.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
              style={{ borderColor: "var(--color-rule)" }}
            >
              <div className="flex flex-col min-w-0 gap-0.5">
                <span
                  className="text-[14px] font-semibold truncate"
                  style={{ color: "var(--color-ink)" }}
                >
                  {c.nameKr || c.nameEn || c.name}
                </span>
                <span
                  className="text-[12px] truncate"
                  style={{ color: "var(--color-ink-2)" }}
                >
                  {c.address}
                </span>
                {c.geo && (
                  <span
                    className="text-[10.5px] font-mono tabular"
                    style={{ color: "var(--color-ink-3)" }}
                  >
                    {c.geo.lat.toFixed(4)}, {c.geo.lng.toFixed(4)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="text-[10.5px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-md border"
                  style={{
                    color: "var(--color-ink-2)",
                    borderColor: "var(--color-rule)",
                    background: "var(--color-subtle)",
                  }}
                >
                  {c.category}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(c)}
                  disabled={busyId === c.id}
                  className="grid place-items-center w-8 h-8 rounded-md border transition-colors hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] disabled:opacity-50"
                  style={{
                    color: "var(--color-ink-2)",
                    borderColor: "var(--color-rule)",
                  }}
                  aria-label="Delete clinic"
                >
                  {busyId === c.id ? (
                    <span className="text-[11px]">…</span>
                  ) : (
                    <IconTrash width={14} height={14} />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div
      className="px-4 py-10 text-center text-[13px]"
      style={{ color: "var(--color-ink-3)" }}
    >
      {text}
    </div>
  );
}
