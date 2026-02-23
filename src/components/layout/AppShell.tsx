import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col ml-[220px]">
        <TopBar />
        <div className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
