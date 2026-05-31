import { useState, useEffect } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)

  const loadCards = async () => {
    try {
      const [data, events] = await Promise.all([
        pb.collection('cards').getFullList({
          filter: `due_date != '' && archived != true`,
          expand: 'board_id',
        }),
        pb.send('/backend/v1/google-calendar/upcoming', { method: 'GET' }).catch(() => []),
      ])
      setCards(data)
      setUpcomingEvents(events)
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
    <div className="flex flex-col h-screen overflow-hidden">
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
            <div className="flex items-center gap-1 border border-white/10 rounded-md p-1 bg-white/5 backdrop-blur-sm">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 border border-white/10 rounded-xl overflow-hidden flex flex-col bg-white/5 backdrop-blur-xl shadow-subtle">
          <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
            {weekDays.map((day) => (
              <div
                key={day}
                className="p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold text-gray-400"
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

              const dayEvents = upcomingEvents.filter((e) => {
                if (!e.date) return false
                const dateStr = e.date.substring(0, 10)
                const evDate = parseISO(dateStr)
                return isSameDay(evDate, day)
              })

              const isCurrentMonth = isSameMonth(day, monthStart)
              const isTodayDate = isToday(day)

              const allDayItems = [
                ...dayCards.map((c) => ({ type: 'card', data: c })),
                ...dayEvents.map((e) => ({ type: 'event', data: e })),
              ]

              const MAX_VISIBLE = 3
              const overflowCount =
                allDayItems.length > MAX_VISIBLE ? allDayItems.length - MAX_VISIBLE + 1 : 0
              const visibleItems =
                overflowCount > 0 ? allDayItems.slice(0, MAX_VISIBLE - 1) : allDayItems

              const renderItem = (item: any, isCompact = false) => {
                if (item.type === 'card') {
                  const card = item.data
                  return (
                    <Link
                      key={`card-${card.id}`}
                      to={`/boards/${card.board_id}/cards/${card.id}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', card.id)
                        setDraggedCardId(card.id)
                      }}
                      onDragEnd={() => setDraggedCardId(null)}
                      className={cn(
                        'block font-medium truncate rounded transition-all duration-200 cursor-grab active:cursor-grabbing backdrop-blur-md shadow-sm hover:shadow-md bg-primary/20 border border-primary/30 text-primary hover:bg-primary/30',
                        isCompact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1.5 text-xs',
                      )}
                      title={card.title}
                    >
                      {card.title}
                    </Link>
                  )
                } else {
                  const ev = item.data
                  return (
                    <div
                      key={`ev-${ev.id}`}
                      className={cn(
                        'block font-medium truncate rounded cursor-default backdrop-blur-md transition-all duration-200 shadow-sm bg-primary/20 border border-primary/30 border-dashed text-primary hover:bg-primary/30',
                        isCompact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1.5 text-xs',
                      )}
                      title={`Sazonal: ${ev.title} (Quadro: ${ev.board_name})`}
                    >
                      🕒 {ev.title}
                    </div>
                  )
                }
              }

              return (
                <div
                  key={day.toString()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (draggedCardId) {
                      e.currentTarget.classList.add('bg-primary/10')
                    }
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('bg-primary/10')
                  }}
                  onDrop={async (e) => {
                    e.preventDefault()
                    e.currentTarget.classList.remove('bg-primary/10')
                    const cardId = e.dataTransfer.getData('text/plain')
                    if (!cardId) return

                    const targetDate = new Date(day)
                    const originalCard = cards.find((c) => c.id === cardId)
                    if (originalCard && originalCard.due_date) {
                      const origDate = new Date(originalCard.due_date)
                      targetDate.setHours(
                        origDate.getHours(),
                        origDate.getMinutes(),
                        origDate.getSeconds(),
                      )
                    } else {
                      targetDate.setHours(23, 59, 59, 999)
                    }

                    try {
                      setCards((prev) =>
                        prev.map((c) =>
                          c.id === cardId ? { ...c, due_date: targetDate.toISOString() } : c,
                        ),
                      )
                      await pb
                        .collection('cards')
                        .update(cardId, { due_date: targetDate.toISOString() })
                    } catch (err) {
                      console.error('Failed to update card due date', err)
                      loadCards()
                    }
                  }}
                  className={cn(
                    'min-h-[100px] border-b border-r border-white/5 p-1 sm:p-2 transition-colors flex flex-col relative',
                    !isCurrentMonth && 'bg-white/5 text-gray-500',
                    (i + 1) % 7 === 0 && 'border-r-0',
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={cn(
                        'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                        isTodayDate && 'bg-emerald-500/20 text-emerald-400',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1 mt-1 flex-1 flex flex-col overflow-hidden">
                    {visibleItems.map((item) => renderItem(item, true))}
                    {overflowCount > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full text-left px-1.5 py-0.5 mt-auto text-[10px] font-semibold rounded text-primary hover:bg-primary/10 transition-colors"
                          >
                            + {overflowCount} mais
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-64 p-3 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl z-50 rounded-xl"
                          align="start"
                          side="bottom"
                          sideOffset={4}
                        >
                          <div className="text-sm font-semibold mb-3 text-gray-200 border-b border-white/10 pb-2 capitalize">
                            {format(day, "d 'de' MMMM", { locale: ptBR })}
                          </div>
                          <div className="space-y-1.5 max-h-[300px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full pr-1">
                            {allDayItems.map((item) => renderItem(item, false))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
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
