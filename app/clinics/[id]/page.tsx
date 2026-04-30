import ClinicDetail from "../../../components/ClinicDetail";
import PageHeader from "../../../components/PageHeader";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <PageHeader kicker="Detail" title="Clinic Details" />
      <ClinicDetail id={id} />
    </>
  );
}
