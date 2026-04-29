import PageHeader from "../../components/PageHeader";
import ClinicList from "../../components/ClinicList";

export default function Page() {
  return (
    <>
      <PageHeader
        kicker="Workspace"
        title="Clinics"
        description="Live list from Firestore. Patient app subscribes to changes instantly."
      />
      <ClinicList />
    </>
  );
}
