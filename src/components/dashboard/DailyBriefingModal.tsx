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
import { Link } from 'react-router-dom'
import { AlertCircle, Clock, Calendar } from 'lucide-react'

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
          setData(cards)
          if (cards.overdue.length > 0 || cards.today.length > 0 || cards.next24hCards.length > 0) {
            setOpen(true)
          } else {
            await pb
              .collection('users')
              .update(user.id, { last_briefing_at: new Date().toISOString() })
          }
        } catch (error) {
          console.error('Failed to load briefing cards', error)
        }
      }
    }

    checkBriefing()
  }, [user])

  const handleClose = async (isOpen: boolean) => {
    if (!isOpen) {
      setOpen(false)
      if (user) {
        try {
          await pb
            .collection('users')
            .update(user.id, { last_briefing_at: new Date().toISOString() })
        } catch (error) {
          console.error('Failed to update last_briefing_at', error)
        }
      }
    }
  }

  if (!data) return null

  const Section = ({ title, icon: Icon, colorClass, bgClass, cards }: any) => {
    if (cards.length === 0) return null
    return (
      <div className="mb-6 last:mb-0">
        <h3 className={`flex items-center gap-2 font-semibold text-lg mb-3 ${colorClass}`}>
          <Icon className="w-5 h-5" />
          {title} ({cards.length})
        </h3>
        <div className="space-y-2">
          {cards.map((card: any) => (
            <Link
              key={card.id}
              to={`/boards/${card.board_id}/cards/${card.id}`}
              onClick={() => handleClose(false)}
              className={`block p-3 rounded-lg border ${bgClass} hover:opacity-90 transition-opacity`}
            >
              <div className="font-medium">{card.title}</div>
              <div className="text-sm opacity-80 mt-1 flex justify-between items-center">
                <span>{card.expand?.board_id?.name}</span>
                <span>{format(parseISO(card.due_date), 'dd/MM/yyyy HH:mm')}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display font-bold">
            Bom dia! Seu Resumo Diário
          </DialogTitle>
          <DialogDescription>
            Aqui estão as tarefas que exigem sua atenção imediata hoje.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="py-4">
            <Section
              title="Vencidas / Atrasadas"
              icon={AlertCircle}
              colorClass="text-red-600 dark:text-red-400"
              bgClass="bg-red-50 border-red-100 text-red-900 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-200"
              cards={data.overdue}
            />
            <Section
              title="Vencendo Hoje"
              icon={Clock}
              colorClass="text-orange-600 dark:text-orange-400"
              bgClass="bg-orange-50 border-orange-100 text-orange-900 dark:bg-orange-950/30 dark:border-orange-900/50 dark:text-orange-200"
              cards={data.today}
            />
            <Section
              title="Próximas 24h"
              icon={Calendar}
              colorClass="text-yellow-600 dark:text-yellow-400"
              bgClass="bg-yellow-50 border-yellow-100 text-yellow-900 dark:bg-yellow-950/30 dark:border-yellow-900/50 dark:text-yellow-200"
              cards={data.next24hCards}
            />
          </div>
        </ScrollArea>

        <div className="pt-4 border-t mt-auto flex justify-end">
          <Button onClick={() => handleClose(false)}>Entendido, vamos lá!</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
