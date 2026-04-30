import { useState, useEffect } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [cards, setCards] = useState<any[]>([])

  const loadCards = async () => {
    try {
      const data = await pb.collection('cards').getFullList({
        filter: `due_date != '' && archived != true`,
        expand: 'board_id',
      })
      setCards(data)
    } catch (err) {
      console.error('Failed to load cards for calendar', err)
    }
  }

  useEffect(() => {
    loadCards()
  }, [])

  useRealtime('cards', loadCards)
  useRealtime('boards', loadCards)

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const dateFormat = 'MMMM yyyy'

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  })

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <AppHeader />
      <div className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden max-w-7xl mx-auto w-full animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <CalendarIcon className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-semibold tracking-tight capitalize">
              {format(currentDate, dateFormat, { locale: ptBR })}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
            <div className="flex items-center gap-1 border rounded-md p-1 bg-card">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 border rounded-xl overflow-hidden flex flex-col bg-card shadow-subtle">
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {weekDays.map((day) => (
              <div
                key={day}
                className="p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
            {days.map((day, i) => {
              const dayCards = cards.filter((c) => {
                if (!c.due_date) return false
                const dateStr = c.due_date.substring(0, 10)
                const cardDate = parseISO(dateStr)
                return isSameDay(cardDate, day)
              })

              const isCurrentMonth = isSameMonth(day, monthStart)
              const isTodayDate = isToday(day)

              return (
                <div
                  key={day.toString()}
                  className={cn(
                    'min-h-[100px] border-b border-r p-1 sm:p-2 transition-colors flex flex-col',
                    !isCurrentMonth && 'bg-muted/20 text-muted-foreground/50',
                    (i + 1) % 7 === 0 && 'border-r-0',
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={cn(
                        'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                        isTodayDate && 'bg-primary text-primary-foreground',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1 mt-1 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {dayCards.map((card) => {
                      const boardColor = card.expand?.board_id?.color || '#3b82f6'
                      return (
                        <Link
                          key={card.id}
                          to={`/boards/${card.board_id}/cards/${card.id}`}
                          className="block px-2 py-1 text-[10px] sm:text-xs truncate rounded-sm transition-opacity hover:opacity-80 border"
                          style={{
                            backgroundColor: `${boardColor}15`,
                            borderColor: `${boardColor}30`,
                            color: boardColor,
                          }}
                          title={card.title}
                        >
                          {card.title}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
