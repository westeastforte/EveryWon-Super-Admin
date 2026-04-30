"use client";

import { ChangeEvent, useMemo, useState } from "react";
import Link from "next/link";
import { createClinicsBulk } from "../lib/clinics";
import { parseCsv } from "../lib/csv";
import { looksLikeHira, mapCsvRows } from "../lib/hira";
import type { ClinicFormInput } from "../types";
import { IconArrowRight, IconUpload } from "./Icons";
import { btnPrimaryCls, btnSecondaryCls } from "./ClinicForm";

interface ParsedFile {
  filename: string;
  header: string[];
  inputs: ClinicFormInput[];
  rejected: { reason: string; raw: Record<string, string> }[];
}

type ImportPhase =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "parsed" }
  | { kind: "translating"; done: number; total: number }
  | { kind: "writing"; done: number; total: number }
  | { kind: "done"; written: number; failed: number; errors: string[] }
  | { kind: "error"; message: string };

const REGION_FILTERS = [
  "All",
  "서울특별시",
  "경기도",
  "인천광역시",
  "부산광역시",
  "대구광역시",
  "대전광역시",
  "광주광역시",
  "울산광역시",
  "세종특별자치시",
  "강원특별자치도",
  "충청북도",
  "충청남도",
  "전북특별자치도",
  "전라남도",
  "경상북도",
  "경상남도",
  "제주특별자치도",
];

export default function BulkImport() {
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [phase, setPhase] = useState<ImportPhase>({ kind: "idle" });
  const [region, setRegion] = useState<string>("All");
  const [requireGeo, setRequireGeo] = useState(false);
  const [limit, setLimit] = useState<number>(0);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhase({ kind: "uploading" });
    try {
      const text = await file.text();
      const { header, rows } = parseCsv(text);
      const { inputs, rejected } = mapCsvRows(header, rows);
      setParsed({ filename: file.name, header, inputs, rejected });
      setPhase({ kind: "parsed" });
    } catch (err) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
    e.target.value = "";
  };

  const filteredInputs = useMemo(() => {
    if (!parsed) return [];
    let out = parsed.inputs;
    if (region !== "All") out = out.filter((i) => i.region === region);
    if (requireGeo) out = out.filter((i) => Boolean(i.geo));
    if (limit > 0) out = out.slice(0, limit);
    return out;
  }, [parsed, region, requireGeo, limit]);

  const onImport = async () => {
    if (filteredInputs.length === 0) return;
    if (
      !window.confirm(
        `${filteredInputs.length.toLocaleString()}개의 병원을 Firestore에 추가합니다. 계속할까요?`,
      )
    )
      return;
    setPhase({ kind: "writing", done: 0, total: filteredInputs.length });
    try {
      const result = await createClinicsBulk(
        filteredInputs,
        (done, total, phase) => {
          setPhase({ kind: phase, done, total });
        },
      );
      setPhase({
        kind: "done",
        written: result.written,
        failed: result.failed,
        errors: result.errors,
      });
    } catch (err) {
      setPhase({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const onReset = () => {
    setParsed(null);
    setPhase({ kind: "idle" });
    setRegion("All");
    setRequireGeo(false);
    setLimit(0);
  };

  const totalGeo = parsed?.inputs.filter((i) => i.geo).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <Step number={1} title="CSV 업로드" caption="Upload">
        <p
          className="text-[13.5px] m-0 mb-4"
          style={{ color: "var(--color-ink-2)" }}
        >
          <a
            href="https://www.data.go.kr/data/15095099/fileData.do"
            target="_blank"
            rel="noopener"
            className="underline font-semibold"
            style={{ color: "var(--color-ink)" }}
          >
            data.go.kr
          </a>
          {" "}에서{" "}
          <span style={{ color: "var(--color-ink)" }}>
            건강보험심사평가원_병의원 및 약국 현황
          </span>
          {" "}CSV를 받아 그대로 올리면 됩니다.
        </p>

        <label
          className="block cursor-pointer rounded-lg border border-dashed transition-colors hover:border-[var(--color-ink)] hover:bg-[var(--color-subtle)]"
          style={{
            borderColor: "var(--color-rule-strong)",
            background: "var(--color-subtle)",
          }}
        >
          <div className="flex items-center gap-4 px-5 py-5">
            <div
              className="grid place-items-center w-10 h-10 rounded-md border bg-white"
              style={{ borderColor: "var(--color-rule)" }}
            >
              <IconUpload color="var(--color-ink)" />
            </div>
            <div className="flex flex-col min-w-0">
              <span
                className="text-[13.5px] font-semibold"
                style={{ color: "var(--color-ink)" }}
              >
                {parsed
                  ? parsed.filename
                  : "Drop a CSV here or click to browse"}
              </span>
              <span
                className="text-[11.5px]"
                style={{ color: "var(--color-ink-3)" }}
              >
                .csv · UTF-8 · 한글 컬럼명 자동 매핑
              </span>
            </div>
          </div>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={onFile}
            className="hidden"
            disabled={
              phase.kind === "writing" ||
              phase.kind === "uploading" ||
              phase.kind === "translating"
            }
          />
        </label>

        {phase.kind === "uploading" && (
          <div
            className="text-[13px] mt-3"
            style={{ color: "var(--color-ink-3)" }}
          >
            파일을 읽고 있습니다…
          </div>
        )}
        {phase.kind === "error" && (
          <div
            className="text-[13px] rounded-md px-3.5 py-3 border mt-4"
            style={{
              background: "var(--color-danger-soft)",
              color: "var(--color-danger)",
              borderColor: "var(--color-danger)",
            }}
          >
            {phase.message}
          </div>
        )}
      </Step>

      {parsed && (
        <>
          <Step number={2} title="미리보기" caption="Preview">
            {looksLikeHira(parsed.header) && (
              <div
                className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-md border mb-3"
                style={{
                  color: "var(--color-success)",
                  background: "var(--color-success-soft)",
                  borderColor: "var(--color-success)",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--color-success)" }}
                />
                HIRA detected
              </div>
            )}

            <div
              className="grid grid-cols-2 sm:grid-cols-4 rounded-xl border overflow-hidden mb-4"
              style={{ borderColor: "var(--color-rule)" }}
            >
              <PreviewStat
                label="총 행"
                value={parsed.inputs.length + parsed.rejected.length}
              />
              <PreviewStat label="유효" value={parsed.inputs.length} />
              <PreviewStat
                label="좌표 있음"
                value={totalGeo}
                hint={
                  parsed.inputs.length > 0
                    ? `${Math.round((totalGeo / parsed.inputs.length) * 100)}%`
                    : undefined
                }
              />
              <PreviewStat
                label="제외"
                value={parsed.rejected.length}
                tone={parsed.rejected.length > 0 ? "warn" : "muted"}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <FilterField label="지역">
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className={selectCls}
                >
                  {REGION_FILTERS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="최대 개수 (0 = 전체)">
                <input
                  type="number"
                  min={0}
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value) || 0)}
                  className={selectCls}
                />
              </FilterField>
              <label className="flex items-end h-full">
                <span
                  className="inline-flex items-center gap-2.5 h-10 px-3.5 rounded-md border cursor-pointer select-none text-[13px] font-medium hover:bg-[var(--color-subtle)]"
                  style={{ borderColor: "var(--color-rule)" }}
                >
                  <input
                    type="checkbox"
                    checked={requireGeo}
                    onChange={(e) => setRequireGeo(e.target.checked)}
                    className="w-4 h-4 accent-[var(--color-accent)]"
                  />
                  좌표 있는 행만
                </span>
              </label>
            </div>

            <PreviewTable rows={filteredInputs.slice(0, 8)} />
            <div
              className="text-[12px] mt-2"
              style={{ color: "var(--color-ink-3)" }}
            >
              위는 처음 8개 행 미리보기. 실제 등록 대상:{" "}
              <span
                className="font-semibold tabular"
                style={{ color: "var(--color-ink)" }}
              >
                {filteredInputs.length.toLocaleString()}곳
              </span>
            </div>
          </Step>

          <Step number={3} title="Firestore 등록" caption="Import">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onImport}
                disabled={
                  filteredInputs.length === 0 ||
                  phase.kind === "writing" ||
                  phase.kind === "translating"
                }
                className={btnPrimaryCls + " h-11 px-6"}
              >
                {phase.kind === "translating"
                  ? `영문명 번역 중… ${phase.done.toLocaleString()} / ${phase.total.toLocaleString()}`
                  : phase.kind === "writing"
                    ? `등록 중… ${phase.done.toLocaleString()} / ${phase.total.toLocaleString()}`
                    : `${filteredInputs.length.toLocaleString()}곳 등록하기`}
              </button>
              <button
                type="button"
                onClick={onReset}
                className={btnSecondaryCls + " h-11 px-5"}
                disabled={
                  phase.kind === "writing" || phase.kind === "translating"
                }
              >
                초기화
              </button>
              <Link
                href="/clinics"
                className="ml-auto inline-flex items-center gap-1 text-[13px] font-semibold"
                style={{ color: "var(--color-ink)" }}
              >
                등록된 병원 보기
                <IconArrowRight width={14} height={14} />
              </Link>
            </div>

            {(phase.kind === "writing" || phase.kind === "translating") && (
              <div className="mt-4">
                <div
                  className="h-1.5 w-full rounded-full overflow-hidden"
                  style={{ background: "var(--color-subtle)" }}
                >
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${(phase.done / Math.max(1, phase.total)) * 100}%`,
                      background: "var(--color-accent)",
                    }}
                  />
                </div>
                {phase.kind === "translating" && (
                  <div
                    className="text-[11.5px] mt-1.5"
                    style={{ color: "var(--color-ink-3)" }}
                  >
                    Gemini로 영문명 채우는 중…
                  </div>
                )}
              </div>
            )}

            {phase.kind === "done" && (
              <div
                className="text-[13px] rounded-md px-3.5 py-3 border mt-4"
                style={
                  phase.failed === 0
                    ? {
                        background: "var(--color-success-soft)",
                        color: "var(--color-success)",
                        borderColor: "var(--color-success)",
                      }
                    : {
                        background: "var(--color-warn-soft)",
                        color: "var(--color-warn)",
                        borderColor: "var(--color-warn)",
                      }
                }
              >
                완료. 등록 {phase.written.toLocaleString()}곳
                {phase.failed > 0 &&
                  ` · 실패 ${phase.failed.toLocaleString()}곳`}
                {phase.errors.length > 0 && (
                  <details className="mt-2 text-[11.5px]">
                    <summary className="cursor-pointer">에러 보기</summary>
                    <ul className="mt-1 ml-4 list-disc">
                      {phase.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </Step>
        </>
      )}
    </div>
  );
}

function Step({
  number,
  title,
  caption,
  children,
}: {
  number: number;
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="bg-white border rounded-xl p-5"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="flex items-center gap-3 mb-3">
        <span
          className="grid place-items-center w-7 h-7 rounded-md text-[12px] font-bold tabular"
          style={{
            background: "var(--color-accent)",
            color: "var(--color-accent-fg)",
          }}
        >
          {number}
        </span>
        <div className="flex flex-col leading-tight">
          <span
            className="text-[10.5px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--color-ink-3)" }}
          >
            {caption}
          </span>
          <h2
            className="text-[15px] font-bold tracking-tight m-0"
            style={{ color: "var(--color-ink)" }}
          >
            {title}
          </h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function PreviewStat({
  label,
  value,
  hint,
  tone = "muted",
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "muted" | "warn";
}) {
  return (
    <div
      className="px-4 py-3 border-r last:border-r-0"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div
        className="text-[10px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: "var(--color-ink-3)" }}
      >
        {label}
      </div>
      <div
        className="text-[20px] font-bold tabular leading-tight mt-0.5"
        style={{
          color: tone === "warn" ? "var(--color-warn)" : "var(--color-ink)",
        }}
      >
        {value.toLocaleString()}
      </div>
      {hint && (
        <div
          className="text-[10.5px] tabular"
          style={{ color: "var(--color-ink-3)" }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        className="text-[10.5px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--color-ink-2)" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function PreviewTable({ rows }: { rows: ClinicFormInput[] }) {
  if (rows.length === 0) {
    return (
      <div
        className="text-[13px] px-4 py-8 rounded-md text-center border border-dashed"
        style={{
          color: "var(--color-ink-3)",
          background: "var(--color-subtle)",
          borderColor: "var(--color-rule-strong)",
        }}
      >
        필터 조건에 맞는 행이 없습니다.
      </div>
    );
  }
  return (
    <div
      className="overflow-x-auto rounded-md border"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <table className="w-full text-[13px]">
        <thead style={{ background: "var(--color-subtle)" }}>
          <tr
            className="text-[10.5px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "var(--color-ink-2)" }}
          >
            <th className="text-left px-3 py-2">이름</th>
            <th className="text-left px-3 py-2">주소</th>
            <th className="text-left px-3 py-2">시도/시군구</th>
            <th className="text-left px-3 py-2">카테고리</th>
            <th className="text-left px-3 py-2">좌표</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-t"
              style={{ borderColor: "var(--color-rule)" }}
            >
              <td
                className="px-3 py-2 font-semibold truncate max-w-[14ch]"
                style={{ color: "var(--color-ink)" }}
              >
                {r.nameKr}
              </td>
              <td
                className="px-3 py-2 truncate max-w-[28ch]"
                style={{ color: "var(--color-ink-2)" }}
              >
                {r.address}
              </td>
              <td
                className="px-3 py-2 whitespace-nowrap"
                style={{ color: "var(--color-ink-3)" }}
              >
                {r.region || "—"} · {r.district || "—"}
              </td>
              <td className="px-3 py-2" style={{ color: "var(--color-ink-3)" }}>
                {r.category}
              </td>
              <td
                className="px-3 py-2 font-mono tabular text-[11.5px]"
                style={{ color: "var(--color-ink-3)" }}
              >
                {r.geo
                  ? `${r.geo.lat.toFixed(3)}, ${r.geo.lng.toFixed(3)}`
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const selectCls =
  "h-10 px-3 rounded-md border bg-white text-[13.5px] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-rule-strong)] transition-colors";
