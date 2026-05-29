import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Repeat, GripVertical, Clock, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export function DailyRoutineWidget({
  recurringCards: initialCards,
  loading,
}: {
  recurringCards: any[]
  loading: boolean
}) {
  const { toast } = useToast()

  const [recurringCards, setRecurringCards] = useState(initialCards || [])

  useEffect(() => {
    setRecurringCards(initialCards || [])
  }, [initialCards])

  const todayDay = new Date().getDay()

  const todaysTasks = (recurringCards || []).filter((c) => {
    if (c.is_paused) return false
    if (!c.recurrence_days || c.recurrence_days.length === 0) return true
    return c.recurrence_days.includes(todayDay)
  })

  const toggleComplete = async (task: any, completed: boolean) => {
    try {
      setRecurringCards((prev) => prev.map((c) => (c.id === task.id ? { ...c, completed } : c)))
      await pb.collection('cards').update(task.id, { completed })
      toast({ title: completed ? 'Rotina concluída' : 'Rotina reaberta' })
    } catch (err) {
      toast({ title: 'Erro ao atualizar tarefa', variant: 'destructive' })
      setRecurringCards(initialCards)
    }
  }

  const checkIsOverdue = (task: any) => {
    if (task.completed) return false
    if (!task.recurrence_time) return false
    const [hours, minutes] = task.recurrence_time.split(':').map(Number)
    const now = new Date()
    const taskTime = new Date()
    taskTime.setHours(hours, minutes, 0, 0)
    return now > taskTime
  }

  const openTasks = todaysTasks
    .filter((t) => !t.completed)
    .sort((a, b) => (a.recurrence_time || '23:59').localeCompare(b.recurrence_time || '23:59'))
  const completedTasks = todaysTasks.filter((t) => t.completed)

  return (
    <Card className="flex flex-col h-full group/widget min-h-[350px]">
      <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0 cursor-grab active:cursor-grabbing shrink-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Repeat className="w-4 h-4 text-indigo-500" />
            Rotina Diária
          </CardTitle>
          <CardDescription className="text-xs">Tarefas recorrentes de hoje</CardDescription>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover/widget:text-foreground transition-colors" />
      </CardHeader>
      <CardContent className="flex-1 p-0 px-6 pb-6 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 mt-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : todaysTasks.length > 0 ? (
          <div className="space-y-4 mt-4">
            {openTasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Em Aberto
                </h4>
                {openTasks.map((task) => {
                  const isOverdue = checkIsOverdue(task)
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-center gap-3 p-2.5 rounded-md border transition-colors',
                        isOverdue
                          ? 'border-red-500/40 bg-red-50/30 dark:bg-red-950/10'
                          : 'border-border/20 bg-white/5 hover:bg-white/10',
                      )}
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={(val) => toggleComplete(task, !!val)}
                        className={cn(
                          'w-5 h-5 rounded-full shrink-0',
                          isOverdue ? 'border-red-500 data-[state=checked]:bg-red-500' : '',
                        )}
                      />
                      <Link
                        to={`/boards/${task.board_id}/cards/${task.id}`}
                        className="flex-1 min-w-0 flex flex-col"
                      >
                        <span
                          className={cn(
                            'font-medium text-sm truncate transition-colors hover:text-primary',
                            isOverdue && 'text-red-700 dark:text-red-400',
                          )}
                        >
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {task.recurrence_time && (
                            <span className="flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3" />
                              {task.recurrence_time}
                            </span>
                          )}
                          <span className="truncate opacity-75 bg-background/50 px-1.5 py-0.5 rounded border shadow-sm">
                            {task.expand?.board_id?.expand?.client_id?.name ||
                              task.expand?.board_id?.client_name ||
                              'Interno'}{' '}
                            - {task.expand?.board_id?.name}
                          </span>
                        </div>
                      </Link>
                      {isOverdue && (
                        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full shrink-0">
                          <AlertCircle className="w-3 h-3" />
                          Atrasada
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {completedTasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Concluídas
                </h4>
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2.5 rounded-md border border-border/20 bg-white/5 opacity-70 transition-opacity hover:opacity-100 hover:bg-white/10"
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={(val) => toggleComplete(task, !!val)}
                      className="w-5 h-5 rounded-full shrink-0"
                    />
                    <Link
                      to={`/boards/${task.board_id}/cards/${task.id}`}
                      className="flex-1 min-w-0 flex flex-col"
                    >
                      <span className="font-medium text-sm truncate line-through text-muted-foreground transition-colors hover:text-primary">
                        {task.title}
                      </span>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        {task.recurrence_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.recurrence_time}
                          </span>
                        )}
                        <span className="truncate opacity-75">{task.expand?.board_id?.name}</span>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-muted-foreground mt-4 border border-dashed border-border/20 rounded-lg bg-white/5">
            <Repeat className="w-8 h-8 mb-2 text-muted-foreground/30" />
            <p className="text-sm font-medium">Nenhuma rotina para hoje</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
