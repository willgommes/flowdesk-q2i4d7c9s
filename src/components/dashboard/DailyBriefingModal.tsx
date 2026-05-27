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

  const Section = ({ title, icon: Icon, colorClass, bgClass, cards, sectionKey }: any) => {
    if (cards.length === 0) return null
    return (
      <div className="mb-6 last:mb-0">
        <h3 className={`flex items-center gap-2 font-semibold text-lg mb-3 ${colorClass}`}>
          <Icon className="w-5 h-5" />
          {title} ({cards.length})
        </h3>
        <div className="space-y-2">
          {cards.map((card: any) => (
            <div
              key={card.id}
              draggable
              onDragStart={(e) => handleDragStart(e, card.id)}
              onDrop={(e) => handleDrop(e, card.id, sectionKey)}
              onDragOver={handleDragOver}
              className={`flex items-center gap-2 p-3 rounded-lg border cursor-grab active:cursor-grabbing ${bgClass} hover:opacity-90 transition-opacity overflow-hidden`}
            >
              <GripVertical className="w-5 h-5 opacity-50 shrink-0" />
              <Link
                to={`/boards/${card.board_id}/cards/${card.id}`}
                onClick={() => setOpen(false)}
                className="flex-1 min-w-0 block"
              >
                <div className="font-medium flex items-center gap-2 w-full">
                  <span className="truncate">{card.title}</span>
                  {card.is_recurring && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold text-white leading-none bg-indigo-500 shadow-sm flex items-center gap-1">
                      <Repeat className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <div className="text-sm opacity-80 mt-1.5 flex justify-between items-center gap-3">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="font-semibold text-[11px] uppercase tracking-wider bg-background/50 px-1.5 py-0.5 rounded text-muted-foreground border shrink-0 truncate max-w-[45%]">
                      {card.expand?.board_id?.expand?.client_id?.name ||
                        card.expand?.board_id?.client_name ||
                        'Interno'}
                    </span>
                    <span className="truncate min-w-0 text-xs">{card.expand?.board_id?.name}</span>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-right whitespace-nowrap">
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
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold">
            Bom dia! Seu Resumo Diário
          </DialogTitle>
          <DialogDescription>
            Aqui estão as tarefas que exigem sua atenção imediata. Arraste para priorizar.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 w-full">
          <div className="py-4 pr-3">
            <Section
              sectionKey="overdue"
              title="Vencidas / Atrasadas"
              icon={AlertCircle}
              colorClass="text-red-600 dark:text-red-400"
              bgClass="bg-red-50 border-red-100 text-red-900 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-200"
              cards={data.overdue}
            />
            <Section
              sectionKey="today"
              title="Vencendo Hoje"
              icon={Clock}
              colorClass="text-orange-600 dark:text-orange-400"
              bgClass="bg-orange-50 border-orange-100 text-orange-900 dark:bg-orange-950/30 dark:border-orange-900/50 dark:text-orange-200"
              cards={data.today}
            />
            <Section
              sectionKey="next24hCards"
              title="Próximas 24h"
              icon={Calendar}
              colorClass="text-yellow-600 dark:text-yellow-400"
              bgClass="bg-yellow-50 border-yellow-100 text-yellow-900 dark:bg-yellow-950/30 dark:border-yellow-900/50 dark:text-yellow-200"
              cards={data.next24hCards}
            />
          </div>
        </ScrollArea>

        <div className="pt-4 border-t mt-auto flex justify-end">
          <Button onClick={handleAcknowledge}>Ciente</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
