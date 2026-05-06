import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Play,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { format, isToday, addDays, startOfDay, isBefore, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'

export function CardItem({ card, boardId, columnName, onDragStart, onDropCard, onQuickMove }: any) {
  const [isTimePopoverOpen, setTimePopoverOpen] = useState(false)
  const isCompleted = card.completed
  const isColumnDone = columnName?.toUpperCase() === 'CONCLUÍDO'
  const isColumnInProgress = columnName?.toUpperCase() === 'EM ANDAMENTO'
  const isEffectivelyCompleted = isCompleted || isColumnDone
  const labels = card.expand?.card_labels_via_card_id?.map((cl: any) => cl.expand?.label_id) || []
  const members = card.expand?.card_members_via_card_id?.map((cm: any) => cm.expand?.user_id) || []

  let dateBadgeClass = 'bg-muted text-muted-foreground'
  let dateText = 'Sem data'
  let hasTime = false

  if (card.due_date) {
    const date = new Date(card.due_date)
    const now = new Date()
    const today = startOfDay(now)
    const cardDate = startOfDay(date)
    hasTime = !(date.getHours() === 23 && date.getMinutes() === 59 && date.getSeconds() === 59)

    dateText = format(date, hasTime ? "d 'de' MMM, HH:mm" : "d 'de' MMM", { locale: ptBR })

    const isOverdue = date < now

    if (isCompleted) {
      dateBadgeClass = 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20'
    } else if (isOverdue) {
      dateBadgeClass = 'bg-destructive/10 text-destructive hover:bg-destructive/20'
    } else if (isToday(cardDate)) {
      dateBadgeClass =
        'bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20'
    } else if (cardDate <= addDays(today, 7)) {
      dateBadgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
    } else {
      dateBadgeClass = 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
    }
  } else {
    dateBadgeClass = 'bg-muted/50 text-muted-foreground border border-dashed border-border'
  }

  const [tempTime, setTempTime] = useState(
    card.due_date && hasTime ? format(new Date(card.due_date), 'HH:mm') : '',
  )

  const handleTimeSave = async () => {
    if (!card.due_date) return
    const d = new Date(card.due_date)
    if (tempTime) {
      const [h, m] = tempTime.split(':').map(Number)
      d.setHours(h, m, 0, 0)
    } else {
      d.setHours(23, 59, 59, 999)
    }
    try {
      await pb.collection('cards').update(card.id, { due_date: d.toISOString() })
    } catch (err) {
      console.error('Failed to update time', err)
    }
    setTimePopoverOpen(false)
  }

  const checklistCount = card.expand?.checklist_items_via_card_id?.length || 0
  const checklistCompleted =
    card.expand?.checklist_items_via_card_id?.filter((i: any) => i.completed)?.length || 0
  const progressPercentage =
    checklistCount > 0 ? Math.round((checklistCompleted / checklistCount) * 100) : 0

  return (
    <Link
      to={`/boards/${boardId}/cards/${card.id}`}
      className={cn(
        'group block w-full overflow-hidden p-3 rounded-lg border shadow-sm hover:border-primary/50 transition-all duration-300 relative',
        isEffectivelyCompleted
          ? 'bg-secondary/50 opacity-70 border-transparent'
          : 'bg-background border-border',
      )}
      draggable
      onDragStart={(e) => {
        e.stopPropagation()
        onDragStart(e, card)
      }}
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
        {isEffectivelyCompleted ? (
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-yellow-500 shrink-0 mt-1.5" aria-hidden="true" />
        )}
        <h4
          className={cn(
            'text-sm font-medium break-words whitespace-normal leading-snug flex-1 min-w-0 pr-12 transition-all duration-300',
            isEffectivelyCompleted ? 'line-through text-muted-foreground' : '',
          )}
        >
          {card.title}
        </h4>
      </div>

      <div
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10"
        onClick={(e) => e.preventDefault()}
      >
        {!isEffectivelyCompleted && !isColumnInProgress && (
          <div
            role="button"
            className="flex items-center justify-center h-6 w-6 rounded bg-background border border-border shadow-sm hover:bg-muted cursor-pointer transition-colors"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onQuickMove?.('in_progress')
            }}
            title="Mover para Em Andamento"
          >
            <Play className="w-3 h-3 text-blue-500 fill-current" />
          </div>
        )}
        {!isEffectivelyCompleted && (
          <div
            role="button"
            className="flex items-center justify-center h-6 w-6 rounded bg-background border border-border shadow-sm hover:bg-muted cursor-pointer transition-colors"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onQuickMove?.('done')
            }}
            title="Mover para Concluído"
          >
            <CheckSquare className="w-3 h-3 text-green-500" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground mt-3 w-full">
        <div className="flex flex-wrap items-center gap-3">
          {card.due_date && !isEffectivelyCompleted ? (
            <Popover open={isTimePopoverOpen} onOpenChange={setTimePopoverOpen}>
              <PopoverTrigger asChild>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setTempTime(hasTime ? format(new Date(card.due_date), 'HH:mm') : '')
                  }}
                  className={cn(
                    'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer',
                    dateBadgeClass,
                  )}
                >
                  <Calendar className="w-3 h-3" />
                  <span>{dateText}</span>
                  <Clock className="w-3 h-3 opacity-50 ml-0.5" />
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-3 z-50"
                align="start"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Horário de Entrega
                  </span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={tempTime}
                      onChange={(e) => setTempTime(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Button size="sm" className="h-8" onClick={handleTimeSave}>
                      Salvar
                    </Button>
                  </div>
                  {tempTime && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        setTempTime('')
                        const d = new Date(card.due_date)
                        d.setHours(23, 59, 59, 999)
                        pb.collection('cards')
                          .update(card.id, { due_date: d.toISOString() })
                          .then(() => setTimePopoverOpen(false))
                      }}
                    >
                      Remover Horário
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <div
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
                dateBadgeClass,
              )}
            >
              <Calendar className="w-3 h-3" />
              <span>{dateText}</span>
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

      {checklistCount > 0 && (
        <div className="mt-3 space-y-1.5 w-full">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3" />
              {checklistCompleted}/{checklistCount}
            </span>
            <span>{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-1.5" />
        </div>
      )}
    </Link>
  )
}
