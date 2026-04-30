import ClinicEdit from "../../../../components/ClinicEdit";
import PageHeader from "../../../../components/PageHeader";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <PageHeader
        kicker="Edit"
        title="Edit Clinic"
        description="모든 필드를 자유롭게 수정할 수 있습니다. 저장하면 환자 앱에 즉시 반영됩니다."
      />
      <ClinicEdit id={id} />
    </>
  );
}
