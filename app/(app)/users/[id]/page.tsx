import PageHeader from "@/components/PageHeader";
import UserDetail from "@/components/UserDetail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      <PageHeader kicker="Users" title="User Details" />
      <UserDetail id={id} />
    </>
  );
}
