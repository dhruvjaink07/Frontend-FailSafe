import { AppSidebar } from "@/components/app-sidebar"
import { BackendHealthBanner } from "@/components/core/backend-health-banner"
import { CommandBar } from "@/components/core/command-bar"
import { ErrorBoundary } from "@/components/core/error-boundary"
import { MobileSidebar } from "@/components/mobile-sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <CommandBar />
      {/* Mobile Sidebar */}
      <MobileSidebar />
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>
      
      {/* Main Content */}
      <div className="min-h-screen lg:pl-64">
        <BackendHealthBanner />
        <main className="pt-14 lg:pt-0">
          <ErrorBoundary fallbackTitle="Dashboard section crashed">
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
