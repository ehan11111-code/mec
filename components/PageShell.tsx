import { AuthGate } from './AuthGate'
import { SidebarNav } from './SidebarNav'
import { TopBar } from './TopBar'
import { JarvisPanel } from './JarvisPanel'
import { PermissionGate } from './PermissionGate'
import type { Permission } from '@/lib/auth/users'
export function PageShell({ breadcrumbs, requires, children }: { breadcrumbs: { label: string; href?: string }[]; requires?: Permission; children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="flex min-h-screen bg-bg">
        <SidebarNav />
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar breadcrumbs={breadcrumbs} />
          <main className="flex-1 px-4 md:px-6 lg:px-8 py-6 md:py-8 scrollbar-soft">
            {requires ? <PermissionGate requires={requires}>{children}</PermissionGate> : children}
          </main>
        </div>
        <JarvisPanel />
      </div>
    </AuthGate>
  )
}
