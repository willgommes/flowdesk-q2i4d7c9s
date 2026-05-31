import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { AppHeader } from '@/components/AppHeader'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import pb from '@/lib/pocketbase/client'
import { Activity, CheckCircle2, ListPlus } from 'lucide-react'

export default function RoutinePerformancePage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [performanceData, setPerformanceData] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const uRes = await pb.collection('users').getFullList({ sort: 'name' })

        // Fetch active recurring cards
        const rRes = await pb.collection('cards').getFullList({
          filter:
            "is_recurring = true && archived = false && (approval_status = 'active' || approval_status = '')",
          expand: 'card_members_via_card_id',
        })

        const data = uRes.map((u) => {
          // Total routines created by user
          const created = rRes.filter((r) => r.created_by === u.id).length

          // Assigned routines
          const assigned = rRes.filter((r) => {
            const members = r.expand?.card_members_via_card_id || []
            return members.some((m: any) => m.user_id === u.id)
          })

          // Completed currently
          const completed = assigned.filter((r) => r.completed).length

          const completionRate =
            assigned.length > 0 ? Math.round((completed / assigned.length) * 100) : 0

          return {
            user: u,
            created,
            assigned: assigned.length,
            completed,
            completionRate,
          }
        })

        setUsers(uRes)
        setPerformanceData(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Acesso restrito a administradores.
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <div className="p-8 max-w-5xl mx-auto w-full animate-fade-in space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            Performance de Rotinas
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o engajamento e a conclusão de rotinas ativas por membro.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-sm overflow-hidden transition-all duration-300 hover:bg-white/10 focus-within:shadow-lg">
          <Table>
            <TableHeader className="bg-white/5 border-b border-white/10">
              <TableRow>
                <TableHead>Membro</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <ListPlus className="w-4 h-4 text-blue-400" />
                    Rotinas Criadas
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Conclusão Atual
                  </div>
                </TableHead>
                <TableHead className="text-right">Taxa de Conclusão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </TableCell>
                </TableRow>
              ) : performanceData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-gray-400">
                    Nenhum dado encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                performanceData.map((row) => (
                  <TableRow key={row.user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage
                            src={row.user.avatar ? pb.files.getURL(row.user, row.user.avatar) : ''}
                          />
                          <AvatarFallback>{row.user.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{row.user.name}</div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {row.user.role}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium text-gray-100">
                      {row.created}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-emerald-400">{row.completed}</span>
                      <span className="text-gray-500 text-xs mx-1">de</span>
                      <span className="font-medium text-gray-100">{row.assigned}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${row.completionRate}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold w-10 text-right">
                          {row.completionRate}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
