import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ActivityIcon, GripVertical } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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

export function ActivitiesWidget({ activities, loading }: { activities: any[]; loading: boolean }) {
  return (
    <Card className="flex flex-col h-full group/widget">
      <CardHeader className="pb-4 flex flex-row items-start justify-between space-y-0 cursor-grab active:cursor-grabbing">
        <CardTitle className="text-base flex items-center gap-2">
          <ActivityIcon className="w-4 h-4 text-muted-foreground" />
          Atividades Recentes
        </CardTitle>
        <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover/widget:text-foreground transition-colors" />
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {loading ? (
          <div className="h-32 flex items-center justify-center border-t border-border/20 bg-muted/5">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : activities.length > 0 ? (
          <div className="divide-y divide-border/20 border-t border-border/20">
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
                      <span className="font-semibold text-foreground">{activityUser.name}</span>{' '}
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
          <div className="h-32 flex items-center justify-center border-t border-border/20 bg-muted/5">
            <p className="text-muted-foreground text-sm font-medium">Nenhuma atividade pendente.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
