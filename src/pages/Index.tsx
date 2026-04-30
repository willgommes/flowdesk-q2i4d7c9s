import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AppHeader } from '@/components/AppHeader'
import { getBoards } from '@/services/boards'
import { getRecentActivities } from '@/services/activity_logs'
import { useRealtime } from '@/hooks/use-realtime'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import pb from '@/lib/pocketbase/client'

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
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const boardsData = await getBoards()
      setBoards(boardsData)

      const boardIds = user?.role === 'admin' ? undefined : boardsData.map((b: any) => b.id)
      const activitiesData = await getRecentActivities(boardIds)
      setActivities(activitiesData.items)
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

  return (
    <>
      <AppHeader />
      <div className="p-8 max-w-5xl mx-auto w-full animate-fade-in">
        <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground mb-8">
          Bem-vindo, {user?.name?.split(' ')[0] || 'Usuário'}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border/60 shadow-subtle flex flex-col h-full">
            <CardHeader>
              <CardTitle className="text-lg">Quadros</CardTitle>
              <CardDescription>Seus quadros de processos e campanhas.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {loading ? (
                <div className="h-32 flex items-center justify-center border-t border-dashed bg-muted/20 rounded-b-lg">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : boards.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {boards.map((board) => (
                    <Link key={board.id} to={`/boards/${board.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors hover-scale">
                        <div
                          className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
                          style={{ backgroundColor: board.color || '#e2e8f0' }}
                        >
                          <span className="text-lg">{board.icon || '📁'}</span>
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-medium text-sm truncate">{board.name}</h4>
                          {board.client_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {board.client_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center border-t border-dashed bg-muted/20 rounded-b-lg">
                  <p className="text-muted-foreground text-sm font-medium">
                    Os quadros aparecerão aqui em breve.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-subtle flex flex-col h-full">
            <CardHeader>
              <CardTitle className="text-lg">Atividades Recentes</CardTitle>
              <CardDescription>O que precisa da sua atenção hoje.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {loading ? (
                <div className="h-32 flex items-center justify-center border-t border-dashed bg-muted/20 rounded-b-lg">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const activityUser = activity.expand?.user_id
                    const card = activity.expand?.card_id
                    if (!activityUser || !card) return null
                    return (
                      <div key={activity.id} className="flex items-start gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage
                            src={
                              activityUser.avatar
                                ? pb.files.getURL(activityUser, activityUser.avatar)
                                : ''
                            }
                          />
                          <AvatarFallback>{activityUser.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1 overflow-hidden">
                          <p className="text-sm leading-snug">
                            <span className="font-medium">{activityUser.name}</span>{' '}
                            <span className="text-muted-foreground">
                              {actionTexts[activity.action_type] || 'atualizou o cartão'}
                            </span>{' '}
                            <span className="font-medium truncate">"{card.title}"</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
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
                <div className="h-32 flex items-center justify-center border-t border-dashed bg-muted/20 rounded-b-lg">
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
