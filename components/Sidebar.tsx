"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconClinics,
  IconOverview,
  IconPin,
  IconSearch,
  IconSettings,
  IconUpload,
} from "./Icons";
import SidebarStatus from "./SidebarStatus";

interface NavItem {
  href: string;
  label: string;
  sub?: string;
  Icon: (p: { className?: string }) => React.ReactNode;
}

const NAV: NavItem[] = [
  { href: "/", label: "Overview", sub: "현황", Icon: IconOverview },
  { href: "/clinics", label: "Clinics", sub: "등록된 병원", Icon: IconClinics },
];

const ADD_NAV: NavItem[] = [
  { href: "/clinics/search", label: "Search & Add", sub: "이름으로 검색", Icon: IconSearch },
  { href: "/clinics/add", label: "Add by Address", sub: "주소로 등록", Icon: IconPin },
  { href: "/clinics/import", label: "Bulk Import", sub: "CSV 일괄등록", Icon: IconUpload },
];

const SYS_NAV: NavItem[] = [
  { href: "/settings", label: "Settings", sub: "설정", Icon: IconSettings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className="w-[252px] shrink-0 sticky top-0 h-screen flex flex-col"
      style={{ background: "var(--color-rail)", color: "var(--color-rail-ink)" }}
    >
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="grid place-items-center w-7 h-7 rounded-md text-[13px] font-bold tabular"
            style={{ background: "var(--color-rail-ink)", color: "var(--color-rail)" }}
          >
            E
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[14px] font-semibold tracking-tight">
              Everywon
            </span>
            <span
              className="text-[10px] uppercase tracking-[0.14em]"
              style={{ color: "var(--color-rail-ink-muted)" }}
            >
              Admin Console
            </span>
          </span>
        </Link>
      </div>

      <div
        className="h-px mx-4"
        style={{ background: "var(--color-rail-rule)" }}
      />

      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-5">
        <NavGroup label="Workspace" items={NAV} active={isActive} />
        <NavGroup label="Add clinics" items={ADD_NAV} active={isActive} />
        <NavGroup label="System" items={SYS_NAV} active={isActive} />
      </nav>

      <SidebarStatus />
    </aside>
  );
}

function NavGroup({
  label,
  items,
  active,
}: {
  label: string;
  items: NavItem[];
  active: (href: string) => boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div
        className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: "var(--color-rail-ink-muted)" }}
      >
        {label}
      </div>
      {items.map((item) => {
        const isOn = active(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              "group flex items-center gap-3 px-2.5 py-2 rounded-md transition-colors " +
              (isOn ? "" : "hover:bg-white/5")
            }
            style={
              isOn
                ? {
                    background: "var(--color-rail-ink)",
                    color: "var(--color-rail)",
                  }
                : { color: "var(--color-rail-ink)" }
            }
          >
            <item.Icon
              className={
                "shrink-0 " +
                (isOn ? "" : "opacity-70 group-hover:opacity-100")
              }
            />
            <span className="flex flex-col leading-tight min-w-0">
              <span className="text-[13px] font-semibold truncate">
                {item.label}
              </span>
              {item.sub && (
                <span
                  className="text-[10.5px] truncate"
                  style={
                    isOn
                      ? { color: "var(--color-rail-2)" }
                      : { color: "var(--color-rail-ink-muted)" }
                  }
                >
                  {item.sub}
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
