import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/hooks/use-auth'

import Layout from './components/Layout'
import { NotificationProvider } from './components/NotificationProvider'
import Index from './pages/Index'
import BoardsPage from './pages/boards/BoardsPage'
import RoutinesPage from './pages/routines/RoutinesPage'
import SazonaisPage from './pages/sazonais/SazonaisPage'
import BoardPage from './pages/boards/BoardPage'
import { CardModalRoute } from './pages/boards/CardModalRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import RecoverPassword from './pages/RecoverPassword'
import Profile from './pages/Profile'
import Users from './pages/Users'
import NotFound from './pages/NotFound'
import CalendarPage from './pages/Calendar'
import ClientsPage from './pages/clients/ClientsPage'
import PunctualityPage from './pages/reports/PunctualityPage'
import HistoryPage from './pages/HistoryPage'
import RoutinePerformancePage from './pages/reports/RoutinePerformancePage'
import IntegrationsPage from './pages/IntegrationsPage'
import GoogleCallback from './pages/GoogleCallback'

const ProtectedRoute = ({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode
  adminOnly?: boolean
}) => {
  const { user, isLoading } = useAuth()
  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth()
  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <NotificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route element={<Layout />}>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rotinas"
                element={
                  <ProtectedRoute>
                    <RoutinesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sazonais"
                element={
                  <ProtectedRoute>
                    <SazonaisPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/boards"
                element={
                  <ProtectedRoute>
                    <BoardsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/boards/:id"
                element={
                  <ProtectedRoute>
                    <BoardPage />
                  </ProtectedRoute>
                }
              >
                <Route path="cards/:cardId" element={<CardModalRoute />} />
              </Route>
              <Route
                path="/calendario"
                element={
                  <ProtectedRoute>
                    <CalendarPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/historico"
                element={
                  <ProtectedRoute>
                    <HistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clientes"
                element={
                  <ProtectedRoute>
                    <ClientsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/perfil"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/usuarios"
                element={
                  <ProtectedRoute adminOnly>
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pontualidade"
                element={
                  <ProtectedRoute adminOnly>
                    <PunctualityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/relatorios/rotinas"
                element={
                  <ProtectedRoute adminOnly>
                    <RoutinePerformancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/integracoes"
                element={
                  <ProtectedRoute adminOnly>
                    <IntegrationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/integracoes/google/callback"
                element={
                  <ProtectedRoute adminOnly>
                    <GoogleCallback />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicRoute>
                    <Signup />
                  </PublicRoute>
                }
              />
              <Route
                path="/recuperar-senha"
                element={
                  <PublicRoute>
                    <RecoverPassword />
                  </PublicRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </NotificationProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
