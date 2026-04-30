import { Link } from 'react-router-dom'
import { Calendar, CheckSquare, MessageSquare, Paperclip } from 'lucide-react'
import { format, isPast, isToday, addDays } from 'date-fns'

export function CardItem({ card, boardId, onDragStart }: any) {
  const isCompleted = card.completed
  const labels = card.expand?.card_labels_via_card_id?.map((cl: any) => cl.expand?.label_id) || []
  const members = card.expand?.card_members_via_card_id?.map((cm: any) => cm.expand?.user_id) || []

  let dateColor = 'text-muted-foreground'
  if (card.due_date && !isCompleted) {
    const date = new Date(card.due_date)
    if (isPast(date) || isToday(date)) dateColor = 'text-[#AA1677] font-bold'
    else if (date <= addDays(new Date(), 2)) dateColor = 'text-[#FFC300] font-bold'
  }

  const checklistCount = card.expand?.checklist_items_via_card_id?.length || 0
  const checklistCompleted =
    card.expand?.checklist_items_via_card_id?.filter((i: any) => i.completed)?.length || 0

  return (
    <Link
      to={`/boards/${boardId}/cards/${card.id}`}
      className={`block bg-background p-3 rounded-lg border border-border shadow-sm hover:border-primary/50 transition-colors ${isCompleted ? 'opacity-60' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, card)}
    >
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {labels.map(
            (l: any) =>
              l && (
                <div
                  key={l.id}
                  className="w-8 h-2 rounded-full"
                  style={{ backgroundColor: l.color }}
                  title={l.name}
                />
              ),
          )}
        </div>
      )}
      <h4
        className={`text-sm font-medium mb-2 ${isCompleted ? 'line-through text-muted-foreground' : ''}`}
      >
        {card.title}
      </h4>

      <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
        <div className="flex items-center gap-3">
          {card.due_date && (
            <div className={`flex items-center gap-1 ${dateColor}`}>
              <Calendar className="w-3.5 h-3.5" />
              <span>{format(new Date(card.due_date), 'MMM d')}</span>
            </div>
          )}
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
