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
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f17]">
        <div className="animate-pulse w-8 h-8 rounded-full bg-emerald-500" />
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
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f17] p-4 relative overflow-hidden text-gray-100">
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 bg-emerald-400/20 blur-3xl z-0" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 bg-cyan-400/20 blur-3xl z-0" />
        <div className="w-full max-w-md animate-fade-in z-10 relative">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 font-display font-bold text-2xl tracking-tight text-gray-100">
              <div className="w-8 h-8 rounded-md bg-emerald-500 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-[#0b0f17]" />
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
      <div className="flex min-h-screen w-full bg-[#0b0f17] overflow-hidden relative text-gray-100">
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 bg-emerald-400/20 blur-3xl z-0" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 bg-cyan-400/20 blur-3xl z-0" />

        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 z-10 relative">
          <Outlet />
          <footer className="mt-auto px-4 py-4 sm:px-6 lg:px-8 border-t border-white/10 bg-white/5 backdrop-blur-md">
            <div className="text-xs text-gray-400 flex items-center justify-between">
              <span>© {new Date().getFullYear()} FlowDesk</span>
              <span>Premium Management</span>
            </div>
          </footer>
        </main>
      </div>
    </SidebarProvider>
  )
}
