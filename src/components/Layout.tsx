import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import { AppHeader } from '@/components/AppHeader'

export default function Layout() {
  const { user, isLoading } = useAuth()
  const location = useLocation()
  const isAuthRoute = ['/login', '/signup', '/recuperar-senha'].includes(location.pathname)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse w-8 h-8 rounded-full bg-primary" />
      </div>
    )
  }

  if (!user && !isAuthRoute) {
    return <Navigate to="/login" replace />
  }

  if (user && isAuthRoute) {
    return <Navigate to="/" replace />
  }

  if (isAuthRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 font-display font-bold text-2xl tracking-tight text-foreground">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-white" />
              </div>
              FlowDesk
            </div>
          </div>
          <Outlet />
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  )
}
