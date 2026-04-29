import Link from "next/link";
import PageHeader from "../components/PageHeader";
import OverviewStats from "../components/OverviewStats";
import {
  IconArrowRight,
  IconPin,
  IconSearch,
  IconUpload,
} from "../components/Icons";

export default function Page() {
  return (
    <>
      <PageHeader
        kicker="Workspace"
        title="Onboard clinics"
        description="Three ways to add Korean clinics into Firestore. Pick the flow that matches the volume."
      />

      <OverviewStats />

      <section className="mt-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[15px] font-semibold tracking-tight m-0">
            Add a clinic
          </h2>
          <span
            className="text-[11px]"
            style={{ color: "var(--color-ink-3)" }}
          >
            Choose by volume
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ActionCard
            href="/clinics/search"
            label="Fastest"
            title="Search & Add"
            kr="이름으로 검색"
            body="Type a clinic name. Kakao returns address, phone, coordinates, category — saved with one click."
            time="~3s / clinic"
            Icon={IconSearch}
          />
          <ActionCard
            href="/clinics/add"
            label="Manual"
            title="Add by Address"
            kr="주소로 등록"
            body="Daum Postcode picker plus Kakao geocoding. Best for one-off corrections and edge cases."
            time="~30s / clinic"
            Icon={IconPin}
          />
          <ActionCard
            href="/clinics/import"
            label="Bulk"
            title="CSV Import"
            kr="일괄등록"
            body="Drop a HIRA / data.go.kr CSV. Filter by region, preview, write thousands at once."
            time="batched"
            Icon={IconUpload}
          />
        </div>
      </section>
    </>
  );
}

function ActionCard({
  href,
  label,
  title,
  kr,
  body,
  time,
  Icon,
}: {
  href: string;
  label: string;
  title: string;
  kr: string;
  body: string;
  time: string;
  Icon: (p: { className?: string }) => React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-3 p-5 rounded-xl bg-white border transition-all hover:border-[var(--color-rule-strong)] hover:-translate-y-px"
    >
      <div className="flex items-start justify-between">
        <div
          className="grid place-items-center w-9 h-9 rounded-lg border"
          style={{
            borderColor: "var(--color-rule)",
            background: "var(--color-subtle)",
            color: "var(--color-ink)",
          }}
        >
          <Icon />
        </div>
        <span
          className="text-[10px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded-md border"
          style={{
            color: "var(--color-ink-2)",
            borderColor: "var(--color-rule)",
            background: "var(--color-subtle)",
          }}
        >
          {label}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <h3
          className="text-[15.5px] font-bold tracking-tight m-0"
          style={{ color: "var(--color-ink)" }}
        >
          {title}
        </h3>
        <span
          className="text-[11.5px]"
          style={{ color: "var(--color-ink-3)" }}
        >
          {kr}
        </span>
      </div>
      <p
        className="text-[13px] leading-snug m-0"
        style={{ color: "var(--color-ink-2)" }}
      >
        {body}
      </p>
      <div
        className="mt-1 flex items-center justify-between pt-3 border-t"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <span
          className="text-[11px] tabular"
          style={{ color: "var(--color-ink-3)" }}
        >
          {time}
        </span>
        <span
          className="inline-flex items-center gap-1 text-[12px] font-semibold transition-transform group-hover:translate-x-0.5"
          style={{ color: "var(--color-ink)" }}
        >
          Open <IconArrowRight width={14} height={14} />
        </span>
      </div>
    </Link>
  );
}
