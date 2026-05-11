import PageHeader from "@/components/PageHeader";
import ReportList from "@/components/ReportList";

export default function Page() {
  return (
    <>
      <PageHeader
        kicker="Workspace"
        title="Reports"
        description="User reports from the mobile app. Filter by status and take action."
      />
      <ReportList />
    </>
  );
}
