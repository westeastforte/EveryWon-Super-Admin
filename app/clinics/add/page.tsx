import PageHeader from "../../../components/PageHeader";
import ClinicForm from "../../../components/ClinicForm";

export default function Page() {
  return (
    <>
      <PageHeader
        kicker="Manual"
        title="Add by Address"
        description="한국 주소만 있으면 됩니다. Daum Postcode로 주소를 선택하면 좌표는 자동으로 채워집니다."
      />
      <ClinicForm />
    </>
  );
}
