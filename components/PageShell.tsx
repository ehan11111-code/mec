import { AuthGate } from './AuthGate'
import { SidebarNav } from './SidebarNav'
import { TopBar } from './TopBar'
export function PageShell({ breadcrumbs, children }: { breadcrumbs: { label: string; href?: string }[]; children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="flex min-h-screen bg-bg">
        <SidebarNav />
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar breadcrumbs={breadcrumbs} />
          <main className="flex-1 px-4 md:px-6 lg:px-8 py-6 md:py-8 scrollbar-soft">{children}</main>
        </div>
      </div>
    </AuthGate>
  )
}
