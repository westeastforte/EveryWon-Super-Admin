import PageHeader from "../../../components/PageHeader";
import PlaceSearch from "../../../components/PlaceSearch";

export default function Page() {
  return (
    <>
      <PageHeader
        kicker="Fastest"
        title="Search & Add"
        description="병원 이름으로 Kakao 또는 Naver를 검색하면 주소·전화·좌표가 자동으로 채워집니다. 가장 빠른 단건 등록 방법."
      />
      <PlaceSearch />
    </>
  );
}
