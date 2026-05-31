import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getBriefingCards } from '@/services/briefing'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { isToday, parseISO, format } from 'date-fns'
import { ClientResponseError } from 'pocketbase'
import { Link } from 'react-router-dom'
import { AlertCircle, Clock, Calendar, GripVertical, Repeat } from 'lucide-react'

export function DailyBriefingModal() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<{ overdue: any[]; today: any[]; next24hCards: any[] } | null>(
    null,
  )

  useEffect(() => {
    if (!user) return

    const checkBriefing = async () => {
      const lastBriefing = user.last_briefing_at ? parseISO(user.last_briefing_at) : null

      if (!lastBriefing || !isToday(lastBriefing)) {
        try {
          const cards = await getBriefingCards(user.id, user.role)

          // Check for overdue recurring tasks
          const todayDay = new Date().getDay()
          const now = new Date()
          const recurringCards = await pb.collection('cards').getFullList({
            filter: `archived != true && is_recurring = true && completed = false`,
            expand: 'board_id,board_id.client_id',
          })

          const overdueRecurring = recurringCards.filter((c) => {
            if (
              c.recurrence_days &&
              c.recurrence_days.length > 0 &&
              !c.recurrence_days.includes(todayDay)
            )
              return false
            if (!c.recurrence_time) return false
            const [hours, minutes] = c.recurrence_time.split(':').map(Number)
            const taskTime = new Date()
            taskTime.setHours(hours, minutes, 0, 0)
            return now > taskTime
          })

          cards.overdue = [...cards.overdue, ...overdueRecurring]

          setData(cards)
          if (cards.overdue.length > 0 || cards.today.length > 0 || cards.next24hCards.length > 0) {
            setOpen(true)
          } else {
            await pb
              .collection('users')
              .update(user.id, { last_briefing_at: new Date().toISOString() })
          }
        } catch (error: any) {
          console.error('Failed to load briefing cards', error)

          // Treat missing resources or errors as "no briefing available"
          setData({ overdue: [], today: [], next24hCards: [] })

          const is404 =
            error?.status === 404 || (error instanceof ClientResponseError && error.status === 404)
          if (is404) {
            try {
              const userExists = await pb
                .collection('users')
                .getOne(user.id)
                .catch(() => null)
              if (userExists) {
                await pb
                  .collection('users')
                  .update(user.id, { last_briefing_at: new Date().toISOString() })
              }
            } catch (updateError) {
              console.error('Failed to silence 404 briefing check', updateError)
            }
          }
        }
      }
    }
    checkBriefing()
  }, [user])

  const handleAcknowledge = async () => {
    setOpen(false)
    if (user) {
      try {
        const userExists = await pb
          .collection('users')
          .getOne(user.id)
          .catch(() => null)
        if (userExists) {
          await pb
            .collection('users')
            .update(user.id, { last_briefing_at: new Date().toISOString() })
        }

        try {
          await pb.collection('activity_logs').create({
            user_id: user.id,
            action_type: 'briefing_read',
            description: 'Usuário confirmou leitura do briefing diário',
          })
        } catch (logError: any) {
          if (logError?.status !== 404) {
            console.error('Failed to create activity log for briefing', logError)
          }
        }
      } catch (error) {
        console.error('Failed to log briefing acknowledgment', error)
      }
    }
  }

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('cardId', cardId)
  }

  const handleDrop = async (
    e: React.DragEvent,
    targetCardId: string,
    sectionKey: 'overdue' | 'today' | 'next24hCards',
  ) => {
    e.preventDefault()
    const sourceCardId = e.dataTransfer.getData('cardId')
    if (!sourceCardId || sourceCardId === targetCardId || !data) return

    const allCards = [...data.overdue, ...data.today, ...data.next24hCards]
    const sourceCard = allCards.find((c) => c.id === sourceCardId)
    const targetCard = allCards.find((c) => c.id === targetCardId)

    if (!sourceCard || !targetCard) return

    let isSameSection = false

    setData((prev) => {
      if (!prev) return prev
      const newSection = [...prev[sectionKey]]
      const sourceIndex = newSection.findIndex((c) => c.id === sourceCardId)
      const targetIndex = newSection.findIndex((c) => c.id === targetCardId)

      if (sourceIndex !== -1 && targetIndex !== -1) {
        isSameSection = true
        const [movedCard] = newSection.splice(sourceIndex, 1)
        newSection.splice(targetIndex, 0, movedCard)
      }
      return { ...prev, [sectionKey]: newSection }
    })

    if (!isSameSection) return

    try {
      const sourceOrder = sourceCard.sort_order || 0
      const targetOrder = targetCard.sort_order || 0
      await pb.collection('cards').update(sourceCard.id, { sort_order: targetOrder })
      await pb.collection('cards').update(targetCard.id, { sort_order: sourceOrder })
    } catch (error) {
      console.error('Failed to reorder', error)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  if (!data) return null

  const Section = ({ title, icon: Icon, colorClass, cards, sectionKey }: any) => {
    if (cards.length === 0) return null
    return (
      <div className="mb-6 last:mb-0">
        <h3 className={`flex items-center gap-2 font-semibold text-lg mb-3 ${colorClass}`}>
          <Icon className="w-5 h-5 drop-shadow-md" />
          <span className="drop-shadow-sm">
            {title} ({cards.length})
          </span>
        </h3>
        <div className="space-y-3">
          {cards.map((card: any, idx: number) => (
            <div
              key={card.id}
              draggable
              onDragStart={(e) => handleDragStart(e, card.id)}
              onDrop={(e) => handleDrop(e, card.id, sectionKey)}
              onDragOver={handleDragOver}
              className={`flex items-start gap-2 p-3 sm:p-4 rounded-2xl border border-white/3 bg-white/8 hover:bg-white/12 cursor-grab active:cursor-grabbing hover:scale-[1.01] hover:shadow-lg transition-all w-full backdrop-blur-sm text-foreground animate-fade-in-up fill-mode-both`}
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <GripVertical className="w-5 h-5 opacity-50 shrink-0 mt-0.5" />
              <Link
                to={`/boards/${card.board_id}/cards/${card.id}`}
                onClick={() => setOpen(false)}
                className="flex-1 min-w-0 w-full"
              >
                <div className="font-medium flex items-start gap-2 w-full mb-2">
                  <span className="line-clamp-2 break-words flex-1 text-[15px] leading-snug">
                    {card.title}
                  </span>
                  {card.is_recurring && (
                    <span className="shrink-0 px-1.5 py-0.5 mt-0.5 rounded text-[10px] font-semibold text-white leading-none bg-indigo-500 shadow-sm flex items-center gap-1">
                      <Repeat className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div className="text-sm opacity-80 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 sm:gap-4 w-full">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-semibold text-[11px] uppercase tracking-wider bg-background/50 px-2 py-0.5 rounded text-muted-foreground border shrink-0 truncate max-w-[140px]">
                      {card.expand?.board_id?.expand?.client_id?.name ||
                        card.expand?.board_id?.client_name ||
                        'Interno'}
                    </span>
                    <span className="truncate min-w-0 text-xs flex-1">
                      {card.expand?.board_id?.name}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-right whitespace-nowrap">
                    {(() => {
                      if (card.is_recurring && card.recurrence_time) {
                        return card.recurrence_time
                      }
                      if (!card.due_date) return ''
                      const d = parseISO(card.due_date)
                      const hasTime = !(
                        d.getHours() === 23 &&
                        d.getMinutes() === 59 &&
                        d.getSeconds() === 59
                      )
                      return format(d, hasTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy')
                    })()}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) setOpen(false)
      }}
    >
      <DialogContent className="max-w-2xl bg-white/10 backdrop-blur-xl border border-white/10 text-foreground p-6 shadow-2xl sm:rounded-[2rem]">
        <DialogHeader className="mb-2 text-left">
          <DialogTitle className="text-2xl font-bold tracking-tight">
            Bom dia! Seu Resumo Diário
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mt-1.5">
            Aqui estão as tarefas que exigem sua atenção imediata. Arraste para priorizar.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-4 -mr-4">
          <div className="space-y-6 pb-2 pt-2">
            <Section
              title="Vencidas / Atrasadas"
              icon={AlertCircle}
              colorClass="text-red-500"
              cards={data.overdue}
              sectionKey="overdue"
            />
            <Section
              title="Para Hoje"
              icon={Clock}
              colorClass="text-amber-500"
              cards={data.today}
              sectionKey="today"
            />
            <Section
              title="Próximas 24h"
              icon={Calendar}
              colorClass="text-blue-500"
              cards={data.next24hCards}
              sectionKey="next24hCards"
            />
          </div>
        </ScrollArea>

        <div
          className="mt-4 pt-5 border-t border-white/10 flex justify-end animate-fade-in-up fill-mode-both"
          style={{ animationDelay: '300ms' }}
        >
          <Button
            onClick={handleAcknowledge}
            size="lg"
            variant="default"
            className="rounded-full px-10 font-semibold shadow-md border-none outline-none hover:opacity-90 hover:scale-[1.02] transition-all duration-300"
          >
            Ciente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
