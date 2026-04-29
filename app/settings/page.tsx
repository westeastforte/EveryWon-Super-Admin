import PageHeader from "../../components/PageHeader";
import SettingsPanel from "../../components/SettingsPanel";

export default function Page() {
  return (
    <>
      <PageHeader
        kicker="System"
        title="Settings"
        description="API keys and project status."
      />
      <SettingsPanel />
    </>
  );
}
