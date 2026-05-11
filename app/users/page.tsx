import PageHeader from "../../components/PageHeader";
import UserList from "../../components/UserList";

export default function Page() {
  return (
    <>
      <PageHeader
        kicker="Workspace"
        title="Users"
        description="All registered users from Firestore. Real-time subscription."
      />
      <UserList />
    </>
  );
}
