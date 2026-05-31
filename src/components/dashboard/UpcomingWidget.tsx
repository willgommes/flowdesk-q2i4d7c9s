import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarIcon, Clock, GripVertical } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export function UpcomingWidget({ cards, loading }: { cards: any[]; loading: boolean }) {
  const upcomingTasks = cards
    .filter((c) => c.due_date && !c.completed && !c.is_recurring)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .filter((c) => {
      const due = new Date(c.due_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const next7 = new Date(today)
      next7.setDate(today.getDate() + 7)
      return due <= next7
    })
    .slice(0, 5)

  return (
    <Card className="flex flex-col h-full group/widget">
      <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0 cursor-grab active:cursor-grabbing">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-500" />
            Próximos Prazos
          </CardTitle>
          <CardDescription className="text-xs">Tarefas para os próximos 7 dias</CardDescription>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover/widget:text-foreground transition-colors" />
      </CardHeader>
      <CardContent className="flex-1 p-0 px-6 pb-6">
        {loading ? (
          <div className="space-y-3 mt-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : upcomingTasks.length > 0 ? (
          <div className="space-y-2.5 mt-4">
            {upcomingTasks.map((task) => {
              const due = new Date(task.due_date)
              const hasTime = !(
                due.getHours() === 23 &&
                due.getMinutes() === 59 &&
                due.getSeconds() === 59
              )
              const isOverdue = isPast(due)
              return (
                <Link key={task.id} to={`/boards/${task.board_id}/cards/${task.id}`}>
                  <div className="flex flex-col p-4 rounded-lg border border-white/[0.03] bg-white/[0.08] hover:bg-white/[0.12] hover:border-emerald-500/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)] backdrop-blur-md transition-all duration-300 group">
                    <div className="flex justify-between items-start gap-2 mb-1 w-full">
                      <span className="font-medium text-sm text-gray-100 truncate group-hover:text-emerald-400 transition-colors">
                        {task.title}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] uppercase tracking-wider whitespace-nowrap px-2 py-0.5 rounded font-semibold border',
                          isOverdue
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : isToday(due)
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-white/10 text-gray-300 border-white/20',
                        )}
                      >
                        {hasTime && isToday(due)
                          ? format(due, "'Hoje', HH:mm", { locale: ptBR })
                          : isToday(due)
                            ? 'Hoje'
                            : format(due, hasTime ? 'dd/MM, HH:mm' : 'dd/MM', { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2 truncate w-full">
                      <span className="font-semibold text-[10px] uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-gray-300 shrink-0 max-w-[100px] truncate shadow-sm">
                        {task.expand?.board_id?.expand?.client_id?.name ||
                          task.expand?.board_id?.client_name ||
                          'Interno'}
                      </span>
                      <span className="truncate">{task.expand?.board_id?.name || 'Quadro'}</span>
                    </div>
                  </div>{' '}
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-gray-400 mt-4 border border-dashed border-white/10 rounded-lg bg-white/[0.02] backdrop-blur-md">
            <Clock className="w-8 h-8 mb-2 text-muted-foreground/30" />
            <p className="text-sm font-medium">Nenhum prazo próximo</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
