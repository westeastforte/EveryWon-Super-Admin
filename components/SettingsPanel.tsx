"use client";

import { useEffect, useState } from "react";
import { hasFirebaseConfig } from "../lib/firebase";
import { getKakaoKey, setKakaoKey } from "../lib/kakao";
import { btnPrimaryCls } from "./ClinicForm";
import { IconCheck, IconExternal, IconX } from "./Icons";

export default function SettingsPanel() {
  const [kakaoKey, setKakaoKeyState] = useState("");
  const [saved, setSaved] = useState(false);
  const [fb, setFb] = useState({
    configured: true,
    projectId: "",
  });

  useEffect(() => {
    setKakaoKeyState(getKakaoKey());
    setFb({
      configured: hasFirebaseConfig(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    });
  }, []);

  const onSave = () => {
    setKakaoKey(kakaoKey);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const fromEnv = Boolean(process.env.NEXT_PUBLIC_KAKAO_MAP_KEY);

  return (
    <div className="flex flex-col gap-4">
      <Card
        title="Kakao Maps API"
        caption="외부 키"
        statusOk={Boolean(getKakaoKey())}
        statusOkText="ready"
        statusBadText="missing"
      >
        <p
          className="text-[13.5px] m-0 mb-4"
          style={{ color: "var(--color-ink-2)" }}
        >
          주소 좌표 변환과 Place Search에 사용합니다.{" "}
          <a
            href="https://developers.kakao.com/console/app"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 underline font-semibold"
            style={{ color: "var(--color-ink)" }}
          >
            developers.kakao.com
            <IconExternal width={12} height={12} />
          </a>
          에서 무료로 발급받을 수 있고, Web 플랫폼 도메인에{" "}
          <code
            className="px-1.5 py-0.5 rounded text-[11.5px] font-mono"
            style={{
              background: "var(--color-subtle)",
              color: "var(--color-ink)",
            }}
          >
            http://localhost:3000
          </code>
          을 추가하세요.
        </p>

        {fromEnv ? (
          <Banner tone="success">
            <code
              className="px-1.5 py-0.5 rounded text-[11.5px] font-mono"
              style={{ background: "rgba(255,255,255,0.5)" }}
            >
              NEXT_PUBLIC_KAKAO_MAP_KEY
            </code>{" "}
            환경 변수에서 읽고 있습니다. (변경하려면{" "}
            <code
              className="px-1.5 py-0.5 rounded text-[11.5px] font-mono"
              style={{ background: "rgba(255,255,255,0.5)" }}
            >
              .env.local
            </code>{" "}
            을 수정하고 dev 서버를 재시작하세요.)
          </Banner>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-col gap-1.5 flex-1">
              <span
                className="text-[10.5px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "var(--color-ink-2)" }}
              >
                JavaScript 키
              </span>
              <input
                type="text"
                value={kakaoKey}
                onChange={(e) => setKakaoKeyState(e.target.value)}
                placeholder="0123456789abcdef..."
                className="h-10 px-3 rounded-md border bg-white outline-none text-[14px] font-mono focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-rule-strong)] transition-colors"
                style={{ borderColor: "var(--color-rule)" }}
              />
            </label>
            <button
              type="button"
              onClick={onSave}
              className={btnPrimaryCls + " h-10 px-5"}
            >
              {saved ? "저장됨 ✓" : "저장"}
            </button>
          </div>
        )}
      </Card>

      <Card
        title="Firebase"
        caption="프로젝트"
        statusOk={fb.configured}
        statusOkText="connected"
        statusBadText="not configured"
      >
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[10.5px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "var(--color-ink-2)" }}
          >
            Project
          </span>
          <code
            className="px-1.5 py-0.5 rounded text-[11.5px] font-mono"
            style={{
              background: "var(--color-subtle)",
              color: "var(--color-ink)",
            }}
          >
            {fb.projectId || "—"}
          </code>
        </div>
        {fb.configured ? (
          <Banner tone="success">
            연결되었습니다. 환자 앱과 같은 프로젝트로 쓰입니다.
          </Banner>
        ) : (
          <Banner tone="danger">
            <code
              className="px-1.5 py-0.5 rounded text-[11.5px] font-mono"
              style={{ background: "rgba(255,255,255,0.5)" }}
            >
              .env.local
            </code>{" "}
            의 NEXT_PUBLIC_FIREBASE_* 값이 비어 있습니다. 환자 앱의{" "}
            <code
              className="px-1.5 py-0.5 rounded text-[11.5px] font-mono"
              style={{ background: "rgba(255,255,255,0.5)" }}
            >
              .env
            </code>{" "}
            에서 복사해 주세요.
          </Banner>
        )}
      </Card>
    </div>
  );
}

function Card({
  title,
  caption,
  children,
  statusOk,
  statusOkText,
  statusBadText,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
  statusOk: boolean;
  statusOkText: string;
  statusBadText: string;
}) {
  return (
    <section
      className="bg-white border rounded-xl p-5"
      style={{ borderColor: "var(--color-rule)" }}
    >
      <div className="flex items-start justify-between mb-3">
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
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md border"
          style={
            statusOk
              ? {
                  color: "var(--color-success)",
                  background: "var(--color-success-soft)",
                  borderColor: "var(--color-success)",
                }
              : {
                  color: "var(--color-warn)",
                  background: "var(--color-warn-soft)",
                  borderColor: "var(--color-warn)",
                }
          }
        >
          {statusOk ? <IconCheck width={12} height={12} /> : <IconX width={12} height={12} />}
          {statusOk ? statusOkText : statusBadText}
        </span>
      </div>
      {children}
    </section>
  );
}

function Banner({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "success" | "danger";
}) {
  const bg =
    tone === "success" ? "var(--color-success-soft)" : "var(--color-danger-soft)";
  const fg =
    tone === "success" ? "var(--color-success)" : "var(--color-danger)";
  return (
    <div
      className="text-[13px] rounded-md px-3.5 py-3 border"
      style={{ background: bg, color: fg, borderColor: fg }}
    >
      {children}
    </div>
  );
}
