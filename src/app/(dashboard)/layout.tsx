import { AppSidebar, AppTopbar, SidebarProvider } from "@/components/dashboard/app-sidebar";
import { AppBackground } from "@/components/dashboard/app-background";
import { AiChat } from "@/components/dashboard/ai-chat";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppBackground />
      <div className="relative z-10 flex h-screen flex-col overflow-hidden">
        <AppTopbar />
        <div className="flex min-h-0 flex-1">
          <AppSidebar />
          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl p-4 sm:p-6">{children}</div>
          </main>
        </div>
      </div>
      <AiChat />
    </SidebarProvider>
  );
}
