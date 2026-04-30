import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AppHeader } from '@/components/AppHeader'
import { getBoards } from '@/services/boards'
import { getRecentActivities } from '@/services/activity_logs'
import { getDashboardData } from '@/services/dashboard'
import { useRealtime } from '@/hooks/use-realtime'
import { formatDistanceToNow, format, isPast, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  CalendarIcon,
  AlertCircleIcon,
  CheckCircle2,
  Clock,
  ActivityIcon,
  FolderKanbanIcon,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'

const actionTexts: Record<string, string> = {
  creation: 'criou o cartão',
  move: 'moveu o cartão',
  edit_title: 'editou o título do cartão',
  edit_desc: 'editou a descrição do cartão',
  label_add: 'adicionou uma etiqueta ao cartão',
  label_remove: 'removeu uma etiqueta do cartão',
  assignment_add: 'atribuiu o cartão',
  assignment_remove: 'removeu a atribuição do cartão',
  attachment_add: 'adicionou um anexo ao cartão',
  comment_add: 'comentou no cartão',
  date_change: 'alterou a data do cartão',
  completion: 'marcou o cartão como concluído',
}

export default function Index() {
  const { user } = useAuth()
  const [boards, setBoards] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [cardsData, setCardsData] = useState<{ cards: any[]; priorityCards: any[] }>({
    cards: [],
    priorityCards: [],
  })
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const boardsData = await getBoards()
      setBoards(boardsData)

      const explicitBoardIds = boardsData.map((b: any) => b.id)
      const boardIds = user?.role === 'admin' ? undefined : explicitBoardIds

      const activitiesData = await getRecentActivities(boardIds)
      setActivities(activitiesData.items)

      const dData = await getDashboardData(explicitBoardIds)
      setCardsData(dData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  useRealtime('boards', () => loadData())
  useRealtime('activity_logs', () => loadData())
  useRealtime('cards', () => loadData())
  useRealtime('card_labels', () => loadData())
  useRealtime('labels', () => loadData())

  const totalCards = cardsData.cards.length
  const completedCards = cardsData.cards.filter((c) => c.completed).length
  const progressPercentage = totalCards === 0 ? 0 : Math.round((completedCards / totalCards) * 100)

  const upcomingTasks = cardsData.cards
    .filter((c) => c.due_date && !c.completed)
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

  const priorityTasks = cardsData.priorityCards.filter((c) => !c.completed).slice(0, 5)

  return (
    <>
      <AppHeader />
      <div className="p-8 max-w-6xl mx-auto w-full animate-fade-in pb-20">
        <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground mb-8">
          Bem-vindo, {user?.name?.split(' ')[0] || 'Usuário'}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="border-border/60 shadow-subtle flex flex-col h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Progresso Global
              </CardTitle>
              <CardDescription className="text-xs">Taxa de conclusão de tarefas</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <div className="text-4xl font-display font-bold tracking-tight text-primary">
                      {progressPercentage}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{completedCards}</span> de{' '}
                      <span className="font-medium text-foreground">{totalCards}</span> tarefas
                      concluídas
                    </div>
                  </div>
                  <Progress value={progressPercentage} className="h-2.5" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-subtle flex flex-col h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-500" />
                Próximos Prazos
              </CardTitle>
              <CardDescription className="text-xs">Tarefas para os próximos 7 dias</CardDescription>
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
                    const isOverdue = isPast(due) && !isToday(due)
                    return (
                      <Link key={task.id} to={`/boards/${task.board_id}/cards/${task.id}`}>
                        <div className="flex flex-col p-2.5 rounded-md border border-border/40 bg-card hover:bg-accent/50 transition-colors group cursor-pointer">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                              {task.title}
                            </span>
                            <span
                              className={cn(
                                'text-[10px] uppercase tracking-wider whitespace-nowrap px-2 py-0.5 rounded-full font-semibold',
                                isOverdue
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : isToday(due)
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                              )}
                            >
                              {isToday(due) ? 'Hoje' : format(due, 'dd/MM', { locale: ptBR })}
                            </span>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <span className="truncate">
                              {task.expand?.board_id?.name || 'Quadro'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-muted-foreground mt-4 border border-dashed border-border/50 rounded-lg bg-muted/10">
                  <Clock className="w-8 h-8 mb-2 text-muted-foreground/30" />
                  <p className="text-sm font-medium">Nenhum prazo próximo</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-subtle flex flex-col h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircleIcon className="w-4 h-4 text-red-500" />
                Alta Prioridade
              </CardTitle>
              <CardDescription className="text-xs">Tarefas urgentes em aberto</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 px-6 pb-6">
              {loading ? (
                <div className="space-y-3 mt-4">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : priorityTasks.length > 0 ? (
                <div className="space-y-2.5 mt-4">
                  {priorityTasks.map((task) => (
                    <Link key={task.id} to={`/boards/${task.board_id}/cards/${task.id}`}>
                      <div className="flex flex-col p-2.5 rounded-md border border-border/40 bg-card hover:bg-accent/50 transition-colors group cursor-pointer">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                            {task.title}
                          </span>
                          <span
                            className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: task.label?.color || '#ef4444' }}
                          />
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <span className="truncate">
                            {task.expand?.board_id?.name || 'Quadro'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-muted-foreground mt-4 border border-dashed border-border/50 rounded-lg bg-muted/10">
                  <CheckCircle2 className="w-8 h-8 mb-2 text-muted-foreground/30" />
                  <p className="text-sm font-medium">Nenhuma tarefa urgente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border/60 shadow-subtle flex flex-col h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderKanbanIcon className="w-4 h-4 text-muted-foreground" />
                Meus Quadros
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {loading ? (
                <div className="h-32 flex items-center justify-center border-t border-border/30 bg-muted/5">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : boards.length > 0 ? (
                <div className="grid grid-cols-1 divide-y divide-border/30 border-t border-border/30">
                  {boards.map((board) => (
                    <Link key={board.id} to={`/boards/${board.id}`}>
                      <div className="flex items-center gap-4 p-4 hover:bg-accent/30 transition-colors group">
                        <div
                          className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 shadow-sm"
                          style={{ backgroundColor: board.color || '#e2e8f0' }}
                        >
                          <span className="text-lg">{board.icon || '📁'}</span>
                        </div>
                        <div className="overflow-hidden flex-1">
                          <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                            {board.name}
                          </h4>
                          {board.client_name && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {board.client_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center border-t border-border/30 bg-muted/5">
                  <p className="text-muted-foreground text-sm font-medium">
                    Os quadros aparecerão aqui em breve.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-subtle flex flex-col h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <ActivityIcon className="w-4 h-4 text-muted-foreground" />
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              {loading ? (
                <div className="h-32 flex items-center justify-center border-t border-border/30 bg-muted/5">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : activities.length > 0 ? (
                <div className="divide-y divide-border/30 border-t border-border/30">
                  {activities.map((activity) => {
                    const activityUser = activity.expand?.user_id
                    const card = activity.expand?.card_id
                    if (!activityUser || !card) return null
                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-4 hover:bg-accent/10 transition-colors"
                      >
                        <Avatar className="h-8 w-8 shrink-0 border border-border/50">
                          <AvatarImage
                            src={
                              activityUser.avatar
                                ? pb.files.getURL(activityUser, activityUser.avatar)
                                : ''
                            }
                          />
                          <AvatarFallback className="text-xs">
                            {activityUser.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1 overflow-hidden">
                          <p className="text-sm leading-snug">
                            <span className="font-semibold text-foreground">
                              {activityUser.name}
                            </span>{' '}
                            <span className="text-muted-foreground">
                              {actionTexts[activity.action_type] || 'atualizou o cartão'}
                            </span>{' '}
                            <Link
                              to={`/boards/${card.board_id}/cards/${card.id}`}
                              className="font-medium text-foreground hover:text-primary transition-colors truncate"
                            >
                              "{card.title}"
                            </Link>
                          </p>
                          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                            {formatDistanceToNow(new Date(activity.created), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center border-t border-border/30 bg-muted/5">
                  <p className="text-muted-foreground text-sm font-medium">
                    Nenhuma atividade pendente.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
