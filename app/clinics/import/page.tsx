import PageHeader from "../../../components/PageHeader";
import BulkImport from "../../../components/BulkImport";

export default function Page() {
  return (
    <>
      <PageHeader
        kicker="Bulk"
        title="CSV Import"
        description="HIRA / data.go.kr 의 '병의원 및 약국 현황' CSV를 업로드하면 한 번에 수천 곳을 등록합니다."
      />
      <BulkImport />
    </>
  );
}
