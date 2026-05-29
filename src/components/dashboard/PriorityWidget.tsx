import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircleIcon, CheckCircle2, GripVertical, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRealtime } from '@/hooks/use-realtime'
import { getDashboardData } from '@/services/dashboard'
import pb from '@/lib/pocketbase/client'

export function PriorityWidget({
  priorityCards: initialCards,
  loading: initialLoading,
}: {
  priorityCards: any[]
  loading: boolean
}) {
  const [priorityCards, setPriorityCards] = useState(initialCards)
  const [loading, setLoading] = useState(initialLoading)

  useEffect(() => {
    setPriorityCards(initialCards)
    setLoading(initialLoading)
  }, [initialCards, initialLoading])

  // Reload data on label changes or card changes
  const reloadData = async () => {
    try {
      const user = pb.authStore.record
      if (!user) return

      let boardIds: string[] = []
      if (user.role === 'admin') {
        const boards = await pb.collection('boards').getFullList({ filter: 'archived = false' })
        boardIds = boards.map((b) => b.id)
      } else {
        const boards = await pb
          .collection('boards')
          .getFullList({ filter: `archived = false && members ~ '${user.id}'` })
        boardIds = boards.map((b) => b.id)
      }

      const data = await getDashboardData(boardIds, user.id)
      setPriorityCards(data.priorityCards)
    } catch (err) {
      console.error(err)
    }
  }

  useRealtime('card_labels', reloadData)
  useRealtime('cards', reloadData)

  const priorityTasks = priorityCards.filter((c) => !c.completed).slice(0, 5)

  return (
    <Card className="flex flex-col h-full group/widget">
      <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0 cursor-grab active:cursor-grabbing">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircleIcon className="w-4 h-4 text-red-500" />
            Alta Prioridade
          </CardTitle>
          <CardDescription className="text-xs">Tarefas urgentes em aberto</CardDescription>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover/widget:text-foreground transition-colors" />
      </CardHeader>
      <CardContent className="flex-1 p-0 px-6 pb-6">
        {loading ? (
          <div className="space-y-3 mt-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : priorityTasks.length > 0 ? (
          <div className="space-y-2.5 mt-4">
            {priorityTasks.map((task) => {
              const isUrgent = task.label?.name === 'Urgente'
              const isHigh = task.label?.name === 'Alta Prioridade'

              return (
                <Link key={task.id} to={`/boards/${task.board_id}/cards/${task.id}`}>
                  <div
                    className={cn(
                      'flex flex-col p-2.5 rounded-md border backdrop-blur-sm transition-colors group',
                      isUrgent
                        ? 'border-red-500/40 bg-red-50/30 dark:bg-red-950/10'
                        : isHigh
                          ? 'border-amber-500/40 bg-amber-50/30 dark:bg-amber-950/10'
                          : 'border-white/10 bg-white/10 hover:bg-white/15',
                    )}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {task.title}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] uppercase tracking-wider whitespace-nowrap px-2 py-0.5 rounded-full font-semibold',
                          isUrgent
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : isHigh
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {task.label?.name || 'Prioridade'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <div className="flex items-center gap-1.5 truncate pr-2">
                        <span className="font-semibold text-[10px] uppercase tracking-wider bg-muted/50 px-1.5 py-0.5 rounded border border-border/50 shrink-0 max-w-[100px] truncate">
                          {task.expand?.board_id?.expand?.client_id?.name ||
                            task.expand?.board_id?.client_name ||
                            'Interno'}
                        </span>
                        <span className="truncate">{task.expand?.board_id?.name || 'Quadro'}</span>
                      </div>
                      {task.due_date && (
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(task.due_date).toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-muted-foreground mt-4 border border-dashed border-white/20 rounded-lg bg-white/5 backdrop-blur-sm">
            <CheckCircle2 className="w-8 h-8 mb-2 text-muted-foreground/30" />
            <p className="text-sm font-medium">Nenhuma tarefa urgente</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
