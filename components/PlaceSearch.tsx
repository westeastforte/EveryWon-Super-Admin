"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClinic } from "../lib/clinics";
import { getKakaoKey, type KakaoPlace, searchPlaces } from "../lib/kakao";
import { type NaverPlace, searchNaverPlaces } from "../lib/naver";
import { inferCategory } from "../lib/categoryMap";
import type { ClinicFormInput } from "../types";
import { IconCheck, IconSearch } from "./Icons";
import { btnPrimaryCls } from "./ClinicForm";

type Provider = "kakao" | "naver";
type Status = "idle" | "searching" | "ok" | "empty" | "error" | "no-key";

// Normalised shape so the result list doesn't have to know which API
// produced each row. Kept local — no other component needs it.
interface UnifiedPlace {
  id: string;
  name: string;
  address: string;
  rawCategory: string;
  phone: string;
  geo?: { lat: number; lng: number };
}

const fromKakao = (p: KakaoPlace): UnifiedPlace => ({
  id: `kakao:${p.id}`,
  name: p.place_name,
  address: p.road_address_name || p.address_name,
  rawCategory: p.category_name,
  phone: p.phone || "",
  geo: { lat: Number(p.y), lng: Number(p.x) },
});

const fromNaver = (p: NaverPlace): UnifiedPlace => ({
  id: p.id,
  name: p.title,
  address: p.roadAddress || p.address,
  rawCategory: p.category,
  phone: p.telephone || "",
  geo: p.geo,
});

export default function PlaceSearch() {
  const [provider, setProvider] = useState<Provider>("kakao");
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<UnifiedPlace[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const onProviderChange = (next: Provider) => {
    if (next === provider) return;
    setProvider(next);
    setResults([]);
    setStatus("idle");
    setErrorMsg("");
    setSavedIds(new Set());
  };

  const onSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = keyword.trim();
    if (!q) return;

    setErrorMsg("");
    setStatus("searching");

    try {
      let unified: UnifiedPlace[];
      if (provider === "kakao") {
        const key = getKakaoKey();
        if (!key) {
          setStatus("no-key");
          return;
        }
        const { results: kakaoResults } = await searchPlaces(q, key);
        unified = kakaoResults.map(fromKakao);
      } else {
        const { results: naverResults } = await searchNaverPlaces(q, {
          display: 5,
        });
        unified = naverResults.map(fromNaver);
      }
      setResults(unified);
      setStatus(unified.length === 0 ? "empty" : "ok");
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      // Naver server signals missing creds via a 503 → surface the same
      // "no-key" hint we use for Kakao.
      if (provider === "naver" && /credentials missing/i.test(msg)) {
        setStatus("no-key");
        return;
      }
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  const onSave = async (place: UnifiedPlace) => {
    setSavingId(place.id);
    try {
      const input: ClinicFormInput = {
        nameKr: place.name,
        nameEn: undefined,
        address: place.address,
        category: inferCategory(place.rawCategory),
        phone: place.phone || undefined,
        geo: place.geo,
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

  const placeholder =
    provider === "kakao"
      ? "예: 강남이비인후과 / 압구정 피부과"
      : "예: 강남 이비인후과";

  return (
    <div className="flex flex-col gap-4">
      <section
        className="bg-white border rounded-xl p-5"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <ProviderTabs provider={provider} onChange={onProviderChange} />

        <form onSubmit={onSearch} className="flex gap-2 mt-4">
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
              placeholder={placeholder}
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

        {status === "no-key" && provider === "kakao" && (
          <Banner tone="warn">
            Kakao API 키가 필요합니다.{" "}
            <Link href="/settings" className="underline font-semibold">
              Settings
            </Link>
            에서 키를 입력해 주세요.
          </Banner>
        )}
        {status === "no-key" && provider === "naver" && (
          <Banner tone="warn">
            Naver Open API 자격증명이 서버에 설정되어 있지 않습니다.{" "}
            <Link href="/settings" className="underline font-semibold">
              Settings
            </Link>
            의 안내를 따라{" "}
            <code
              className="px-1 py-0.5 rounded text-[11.5px] font-mono"
              style={{ background: "rgba(255,255,255,0.5)" }}
            >
              NAVER_CLIENT_ID
            </code>
            ·
            <code
              className="px-1 py-0.5 rounded text-[11.5px] font-mono ml-1"
              style={{ background: "rgba(255,255,255,0.5)" }}
            >
              NAVER_CLIENT_SECRET
            </code>
            를 추가하고 dev 서버를 재시작하세요.
          </Banner>
        )}
        {status === "error" && (
          <Banner tone="danger">검색 실패: {errorMsg}</Banner>
        )}

        {provider === "naver" && status !== "error" && status !== "no-key" && (
          <p
            className="text-[11px] mt-3 mb-0"
            style={{ color: "var(--color-ink-3)" }}
          >
            * Naver Local Search는 한 번에 최대 5건까지만 반환합니다.
          </p>
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
              검색 결과 · {provider === "kakao" ? "Kakao" : "Naver"}
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
              const inferred = inferCategory(p.rawCategory);
              const categoryLabel = p.rawCategory
                .replace(/^의료,건강\s*>\s*/, "")
                .replace(/>/g, " > ");
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
                      {p.name}
                    </span>
                    <span
                      className="text-[12px] truncate"
                      style={{ color: "var(--color-ink-2)" }}
                    >
                      {p.address || "주소 정보 없음"}
                    </span>
                    <span
                      className="text-[10.5px] truncate"
                      style={{ color: "var(--color-ink-3)" }}
                    >
                      {categoryLabel}
                      {p.phone ? ` · ${p.phone}` : ""}
                      {!p.geo ? " · 좌표 없음" : ""}
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

function ProviderTabs({
  provider,
  onChange,
}: {
  provider: Provider;
  onChange: (p: Provider) => void;
}) {
  const tab = (id: Provider, label: string, sub: string) => {
    const active = provider === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => onChange(id)}
        aria-pressed={active}
        className="flex flex-col items-start gap-0.5 px-3.5 py-2 rounded-md border text-left transition-colors"
        style={
          active
            ? {
                background: "var(--color-ink)",
                color: "var(--color-bg, #fff)",
                borderColor: "var(--color-ink)",
              }
            : {
                background: "white",
                color: "var(--color-ink-2)",
                borderColor: "var(--color-rule)",
              }
        }
      >
        <span className="text-[12.5px] font-semibold leading-none">
          {label}
        </span>
        <span
          className="text-[10.5px] leading-none"
          style={{
            color: active
              ? "var(--color-rail-ink-muted, rgba(255,255,255,0.7))"
              : "var(--color-ink-3)",
          }}
        >
          {sub}
        </span>
      </button>
    );
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.14em] mr-1"
        style={{ color: "var(--color-ink-3)" }}
      >
        Source
      </span>
      {tab("kakao", "Kakao", "카카오 장소")}
      {tab("naver", "Naver", "네이버 지역검색")}
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
