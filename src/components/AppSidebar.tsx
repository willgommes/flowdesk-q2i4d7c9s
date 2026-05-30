import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Users,
  LayoutList,
  Moon,
  Sun,
  Briefcase,
  TrendingUp,
  Repeat,
  Activity,
  Blocks,
  History,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function AppSidebar() {
  const { user, logout, updateTheme } = useAuth()
  const location = useLocation()
  const { state } = useSidebar()

  if (!user) return null

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Rotinas', href: '/rotinas', icon: Repeat },
    { name: 'Sazonais', href: '/sazonais', icon: CalendarDays },
    { name: 'Quadros', href: '/boards', icon: LayoutList },
    { name: 'Calendário', href: '/calendario', icon: Calendar },
  ]

  navigation.push({ name: 'Clientes', href: '/clientes', icon: Briefcase })
  navigation.push({ name: 'Histórico', href: '/historico', icon: History })

  if (user.role === 'admin') {
    navigation.push({ name: 'Usuários', href: '/usuarios', icon: Users })
    navigation.push({ name: 'Pontualidade', href: '/pontualidade', icon: TrendingUp })
    navigation.push({ name: 'Performance de Rotinas', href: '/relatorios/rotinas', icon: Activity })
    navigation.push({ name: 'Integrações', href: '/integracoes', icon: Blocks })
  }

  const avatarUrl = user.avatar ? pb.files.getURL(user as any, user.avatar) : ''

  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
      className="border-r border-white/[0.03] !bg-white/[0.04] backdrop-blur-xl"
    >
      <SidebarHeader className="p-4 flex h-16 items-center flex-row border-b border-white/[0.03]">
        <div className="flex items-center gap-2 font-display font-bold text-xl tracking-tight text-gray-100">
          <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#0b0f17]" />
          </div>
          {state === 'expanded' && <span>FlowDesk</span>}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <SidebarMenuItem key={item.name}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.name}
                  className={
                    isActive
                      ? 'relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-8 before:bg-emerald-500 before:rounded-r-md bg-white/[0.08] text-emerald-400 hover:bg-white/[0.12]'
                      : 'text-gray-400 hover:bg-white/[0.12] hover:text-gray-200'
                  }
                >
                  <Link to={item.href} className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-white/[0.03]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="w-full data-[state=open]:bg-white/[0.08] data-[state=open]:text-white hover:bg-white/[0.12]"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={avatarUrl} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-emerald-500/20 text-emerald-400">
                  {user.name?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold text-gray-100">{user.name}</span>
                <span className="truncate text-xs text-gray-400">{user.email}</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl border border-white/[0.03] bg-white/[0.04] backdrop-blur-xl text-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
            align="end"
            side="right"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={avatarUrl} alt={user.name} />
                  <AvatarFallback className="rounded-lg bg-emerald-500/20 text-emerald-400">
                    {user.name?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-gray-100">{user.name}</span>
                  <span className="truncate text-xs text-gray-400">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.03]" />
            <DropdownMenuItem
              asChild
              className="cursor-pointer hover:bg-white/[0.12] focus:bg-white/[0.12]"
            >
              <Link to="/perfil">Meu Perfil</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                const newTheme = user.theme === 'dark' ? 'light' : 'dark'
                updateTheme(newTheme)
              }}
              className="cursor-pointer flex items-center justify-between hover:bg-white/[0.12] focus:bg-white/[0.12]"
            >
              <span>Modo Escuro</span>
              {user.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={logout}
              className="cursor-pointer text-red-400 focus:text-red-300 hover:bg-white/[0.12] focus:bg-white/[0.12]"
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
