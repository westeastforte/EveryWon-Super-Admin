import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-[960px] mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
