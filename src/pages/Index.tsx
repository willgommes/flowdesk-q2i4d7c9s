import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { AppHeader } from '@/components/AppHeader'
import { getBoards } from '@/services/boards'
import { getRecentActivities } from '@/services/activity_logs'
import { getDashboardData } from '@/services/dashboard'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'

import { OverdueAlert } from '@/components/dashboard/OverdueAlert'
import { ProgressWidget } from '@/components/dashboard/ProgressWidget'
import { UpcomingWidget } from '@/components/dashboard/UpcomingWidget'
import { PriorityWidget } from '@/components/dashboard/PriorityWidget'
import { BoardsWidget } from '@/components/dashboard/BoardsWidget'
import { ActivitiesWidget } from '@/components/dashboard/ActivitiesWidget'

const DEFAULT_LAYOUT = ['progress', 'upcoming', 'priority', 'boards', 'activities']

export default function Index() {
  const { user } = useAuth()
  const [boards, setBoards] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [cardsData, setCardsData] = useState<{ cards: any[]; priorityCards: any[] }>({
    cards: [],
    priorityCards: [],
  })
  const [loading, setLoading] = useState(true)

  const [layout, setLayout] = useState<string[]>(DEFAULT_LAYOUT)
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  useEffect(() => {
    if (
      user?.dashboard_layout &&
      Array.isArray(user.dashboard_layout) &&
      user.dashboard_layout.length > 0
    ) {
      const valid = user.dashboard_layout.filter((id) => DEFAULT_LAYOUT.includes(id))
      const missing = DEFAULT_LAYOUT.filter((id) => !valid.includes(id))
      setLayout([...valid, ...missing])
    }
  }, [user])

  const loadData = async () => {
    try {
      const boardsData = await getBoards()
      setBoards(boardsData)

      const explicitBoardIds = boardsData.map((b: any) => b.id)
      const boardIds = user?.role === 'admin' ? undefined : explicitBoardIds

      const activitiesData = await getRecentActivities(boardIds)
      setActivities(activitiesData.items)

      const dData = await getDashboardData(explicitBoardIds)
      setCardsData(dData)
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
  useRealtime('cards', () => loadData())
  useRealtime('card_labels', () => loadData())
  useRealtime('labels', () => loadData())

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIdx !== null && draggedIdx !== index) {
      setDragOverIdx(index)
    }
  }

  const handleDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIdx(null)
    if (draggedIdx === null || draggedIdx === index) return

    const newLayout = [...layout]
    const draggedItem = newLayout[draggedIdx]
    newLayout.splice(draggedIdx, 1)
    newLayout.splice(index, 0, draggedItem)

    setLayout(newLayout)
    setDraggedIdx(null)

    try {
      if (user?.id) {
        await pb.collection('users').update(user.id, { dashboard_layout: newLayout })
      }
    } catch (err) {
      console.error('Failed to save layout', err)
    }
  }

  const renderWidget = (id: string) => {
    switch (id) {
      case 'progress':
        return <ProgressWidget cards={cardsData.cards} loading={loading} />
      case 'upcoming':
        return <UpcomingWidget cards={cardsData.cards} loading={loading} />
      case 'priority':
        return <PriorityWidget priorityCards={cardsData.priorityCards} loading={loading} />
      case 'boards':
        return <BoardsWidget boards={boards} loading={loading} />
      case 'activities':
        return <ActivitiesWidget activities={activities} loading={loading} />
      default:
        return null
    }
  }

  return (
    <>
      <AppHeader />
      <div className="p-8 max-w-6xl mx-auto w-full animate-fade-in pb-20">
        <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground mb-8">
          Bem-vindo, {user?.name?.split(' ')[0] || 'Usuário'}
        </h1>

        <OverdueAlert cards={cardsData.cards} />

        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          {layout.map((id, index) => {
            const isDragging = draggedIdx === index
            const isOver = dragOverIdx === index
            const spanClass =
              id === 'boards' || id === 'activities'
                ? 'md:col-span-6 lg:col-span-3'
                : 'md:col-span-2 lg:col-span-2'

            return (
              <div
                key={id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={() => {
                  setDraggedIdx(null)
                  setDragOverIdx(null)
                }}
                className={cn(
                  spanClass,
                  'transition-all duration-200 ease-in-out',
                  isDragging && 'opacity-50 scale-[0.98] rotate-1 z-10',
                  isOver &&
                    'border-primary/50 border-2 border-dashed rounded-xl bg-primary/5 scale-[1.02]',
                )}
              >
                {renderWidget(id)}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
