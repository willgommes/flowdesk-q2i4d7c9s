import { Link } from 'react-router-dom'
import { Calendar, CheckSquare, MessageSquare, Paperclip } from 'lucide-react'
import { format, isToday, addDays, startOfDay, isBefore } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export function CardItem({ card, boardId, onDragStart, onDropCard }: any) {
  const isCompleted = card.completed
  const labels = card.expand?.card_labels_via_card_id?.map((cl: any) => cl.expand?.label_id) || []
  const members = card.expand?.card_members_via_card_id?.map((cm: any) => cm.expand?.user_id) || []

  let dateBadgeClass = 'bg-muted text-muted-foreground'
  let dateText = 'Sem data'

  if (card.due_date) {
    const date = new Date(card.due_date)
    const today = startOfDay(new Date())
    const cardDate = startOfDay(date)

    dateText = format(date, "d 'de' MMM", { locale: ptBR })

    if (isCompleted) {
      dateBadgeClass = 'bg-green-500/10 text-green-600 dark:text-green-400'
    } else if (isBefore(cardDate, today)) {
      dateBadgeClass = 'bg-destructive/10 text-destructive'
    } else if (isToday(cardDate)) {
      dateBadgeClass = 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
    } else if (cardDate <= addDays(today, 7)) {
      dateBadgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
    } else {
      dateBadgeClass = 'bg-secondary text-secondary-foreground'
    }
  } else {
    dateBadgeClass = 'bg-muted/50 text-muted-foreground border border-dashed border-border'
  }

  const checklistCount = card.expand?.checklist_items_via_card_id?.length || 0
  const checklistCompleted =
    card.expand?.checklist_items_via_card_id?.filter((i: any) => i.completed)?.length || 0

  return (
    <Link
      to={`/boards/${boardId}/cards/${card.id}`}
      className={`block w-full overflow-hidden bg-background p-3 rounded-lg border border-border shadow-sm hover:border-primary/50 transition-colors ${isCompleted ? 'opacity-60' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, card)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        if (onDropCard) {
          e.stopPropagation()
          onDropCard(e, card)
        }
      }}
    >
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {labels.map(
            (l: any) =>
              l && (
                <div
                  key={l.id}
                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white leading-none truncate max-w-full shadow-sm"
                  style={{ backgroundColor: l.color }}
                  title={l.name}
                >
                  {l.name}
                </div>
              ),
          )}
        </div>
      )}
      <div className="flex items-start gap-2 mb-2 w-full">
        <div
          className={cn(
            'w-2 h-2 rounded-full shrink-0 mt-1.5',
            isCompleted ? 'bg-green-500' : 'bg-yellow-500',
          )}
          aria-hidden="true"
        />
        <h4
          className={cn(
            'text-sm font-medium break-words whitespace-normal leading-snug flex-1 min-w-0',
            isCompleted ? 'line-through text-muted-foreground' : '',
          )}
        >
          {card.title}
        </h4>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground mt-3 w-full">
        <div className="flex flex-wrap items-center gap-3">
          <div
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
              dateBadgeClass,
            )}
          >
            <Calendar className="w-3 h-3" />
            <span>{dateText}</span>
          </div>
          {checklistCount > 0 && (
            <div className="flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>
                {checklistCompleted}/{checklistCount}
              </span>
            </div>
          )}
          {card.expand?.comments_via_card_id && (
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{card.expand.comments_via_card_id.length}</span>
            </div>
          )}
          {card.expand?.attachments_via_card_id && (
            <div className="flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" />
              <span>{card.expand.attachments_via_card_id.length}</span>
            </div>
          )}
        </div>
        <div className="flex -space-x-1.5">
          {members.map(
            (m: any) =>
              m && (
                <div
                  key={m.id}
                  className="w-6 h-6 rounded-full bg-primary/20 border border-background flex items-center justify-center text-[10px] font-bold text-primary"
                  title={m.name}
                >
                  {m.name?.[0]?.toUpperCase() || 'U'}
                </div>
              ),
          )}
        </div>
      </div>
    </Link>
  )
}
