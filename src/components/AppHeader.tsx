import { useLocation } from 'react-router-dom'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export function AppHeader({ rightAction }: { rightAction?: React.ReactNode }) {
  const location = useLocation()

  let title = 'Dashboard'
  if (location.pathname.startsWith('/usuarios')) title = 'Gerenciamento de Usuários'
  if (location.pathname.startsWith('/perfil')) title = 'Meu Perfil'

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-background z-10 sticky top-0">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
        <Separator orientation="vertical" className="h-4" />
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      <div>{rightAction}</div>
    </header>
  )
}
