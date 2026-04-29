"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClinic } from "../lib/clinics";
import { getKakaoKey, type KakaoPlace, searchPlaces } from "../lib/kakao";
import { inferCategory } from "../lib/categoryMap";
import type { ClinicFormInput } from "../types";
import { IconCheck, IconSearch } from "./Icons";
import { btnPrimaryCls } from "./ClinicForm";

type Status = "idle" | "searching" | "ok" | "empty" | "error" | "no-key";

export default function KakaoPlaceSearch() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const onSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    if (!q) return;
    const key = getKakaoKey();
    if (!key) {
      setStatus("no-key");
      return;
    }
    setStatus("searching");
    setErrorMsg("");
    try {
      const { results } = await searchPlaces(q, key);
      setResults(results);
      setStatus(results.length === 0 ? "empty" : "ok");
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  const onSave = async (place: KakaoPlace) => {
    setSavingId(place.id);
    try {
      const input: ClinicFormInput = {
        nameKr: place.place_name,
        nameEn: undefined,
        address: place.road_address_name || place.address_name,
        category: inferCategory(place.category_name),
        phone: place.phone || undefined,
        geo: { lat: Number(place.y), lng: Number(place.x) },
        englishAvailable: false,
      };
      await createClinic(input);
      setSavedIds((prev) => new Set(prev).add(place.id));
    } catch (err) {
      console.error(err);
      window.alert(
        "등록 실패: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section
        className="bg-white border rounded-xl p-5"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <form onSubmit={onSearch} className="flex gap-2">
          <div
            className="flex items-center gap-2 flex-1 px-3.5 h-12 rounded-md border bg-white focus-within:border-[var(--color-ink)] focus-within:ring-2 focus-within:ring-[var(--color-rule-strong)] transition-colors"
            style={{ borderColor: "var(--color-rule)" }}
          >
            <IconSearch
              className="shrink-0"
              width={18}
              height={18}
              color="var(--color-ink-3)"
            />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="예: 강남이비인후과 / 압구정 피부과"
              className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--color-ink-3)]"
            />
          </div>
          <button
            type="submit"
            disabled={status === "searching"}
            className={btnPrimaryCls + " h-12 px-6"}
          >
            {status === "searching" ? "검색 중…" : "검색"}
          </button>
        </form>

        {status === "no-key" && (
          <Banner tone="warn">
            Kakao API 키가 필요합니다.{" "}
            <Link href="/settings" className="underline font-semibold">
              Settings
            </Link>
            에서 키를 입력해 주세요.
          </Banner>
        )}
        {status === "error" && (
          <Banner tone="danger">검색 실패: {errorMsg}</Banner>
        )}
      </section>

      {status === "empty" && (
        <div
          className="px-6 py-10 text-center text-[13px] rounded-xl bg-white border border-dashed"
          style={{
            borderColor: "var(--color-rule-strong)",
            color: "var(--color-ink-3)",
          }}
        >
          결과가 없습니다. 키워드를 더 구체적으로 입력해 보세요.
          <span
            className="block text-[11.5px] mt-1"
            style={{ color: "var(--color-ink-3)" }}
          >
            (예: 지역명 + 병원명)
          </span>
        </div>
      )}

      {results.length > 0 && (
        <section
          className="bg-white border rounded-xl overflow-hidden"
          style={{ borderColor: "var(--color-rule)" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--color-rule)" }}
          >
            <h2
              className="text-[12px] font-semibold uppercase tracking-[0.14em] m-0"
              style={{ color: "var(--color-ink-2)" }}
            >
              검색 결과
            </h2>
            <span
              className="text-[11px] font-semibold tabular px-2 py-0.5 rounded-md border"
              style={{
                color: "var(--color-ink-2)",
                borderColor: "var(--color-rule)",
                background: "var(--color-subtle)",
              }}
            >
              {results.length}곳
            </span>
          </div>
          <ul
            className="list-none p-0 m-0 divide-y"
            style={{ borderColor: "var(--color-rule)" }}
          >
            {results.map((p) => {
              const saved = savedIds.has(p.id);
              const inferred = inferCategory(p.category_name);
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex flex-col min-w-0 gap-0.5">
                    <span
                      className="text-[14px] font-semibold truncate"
                      style={{ color: "var(--color-ink)" }}
                    >
                      {p.place_name}
                    </span>
                    <span
                      className="text-[12px] truncate"
                      style={{ color: "var(--color-ink-2)" }}
                    >
                      {p.road_address_name || p.address_name}
                    </span>
                    <span
                      className="text-[10.5px] truncate"
                      style={{ color: "var(--color-ink-3)" }}
                    >
                      {p.category_name.replace(/^의료,건강 > /, "")}
                      {p.phone ? ` · ${p.phone}` : ""}
                    </span>
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
                      {inferred}
                    </span>
                    {saved ? (
                      <span
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold border"
                        style={{
                          color: "var(--color-success)",
                          background: "var(--color-success-soft)",
                          borderColor: "var(--color-success)",
                        }}
                      >
                        <IconCheck width={13} height={13} />
                        등록됨
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSave(p)}
                        disabled={savingId === p.id}
                        className="inline-flex items-center justify-center h-8 px-3 rounded-md text-[12px] font-semibold bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 transition-colors"
                      >
                        {savingId === p.id ? "…" : "+ 등록"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Banner({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "warn" | "danger";
}) {
  const bg =
    tone === "warn" ? "var(--color-warn-soft)" : "var(--color-danger-soft)";
  const fg = tone === "warn" ? "var(--color-warn)" : "var(--color-danger)";
  return (
    <div
      className="text-[13px] rounded-md px-3.5 py-3 border mt-4"
      style={{ background: bg, color: fg, borderColor: fg }}
    >
      {children}
    </div>
  );
}
