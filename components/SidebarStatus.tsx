"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { hasFirebaseConfig } from "../lib/firebase";
import { getKakaoKey } from "../lib/kakao";

export default function SidebarStatus() {
  const [hasKakao, setHasKakao] = useState(false);
  const [hasFb, setHasFb] = useState(true);

  useEffect(() => {
    setHasKakao(Boolean(getKakaoKey()));
    setHasFb(hasFirebaseConfig());
    const id = window.setInterval(() => {
      setHasKakao(Boolean(getKakaoKey()));
    }, 1500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className="m-3 rounded-lg p-3 flex flex-col gap-2"
      style={{ background: "var(--color-rail-2)" }}
    >
      <Row label="Firebase" ok={hasFb} okText="connected" badText="missing" />
      <Row label="Kakao Maps" ok={hasKakao} okText="ready" badText="no key" />
      <Link
        href="/settings"
        className="text-[11px] underline mt-1 self-start"
        style={{ color: "var(--color-rail-ink-muted)" }}
      >
        Configure →
      </Link>
    </div>
  );
}

function Row({
  label,
  ok,
  okText,
  badText,
}: {
  label: string;
  ok: boolean;
  okText: string;
  badText: string;
}) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span style={{ color: "var(--color-rail-ink-muted)" }}>{label}</span>
      <span
        className="inline-flex items-center gap-1.5 font-medium"
        style={{ color: ok ? "#9be8c4" : "#f0bf7d" }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: ok ? "#5fdfa8" : "#f0bf7d" }}
        />
        {ok ? okText : badText}
      </span>
    </div>
  );
}
