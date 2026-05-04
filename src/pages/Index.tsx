import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { AppHeader } from '@/components/AppHeader'
import { getBoards } from '@/services/boards'
import { getRecentActivities } from '@/services/activity_logs'
import { getDashboardData } from '@/services/dashboard'
import { getUsers } from '@/services/users'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, FileSpreadsheet, FileText, AlertCircle } from 'lucide-react'
import { isToday, parseISO, getHours } from 'date-fns'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

import { OverdueAlert } from '@/components/dashboard/OverdueAlert'
import { ExpiringContractsAlert } from '@/components/dashboard/ExpiringContractsAlert'
import { DailyBriefingModal } from '@/components/dashboard/DailyBriefingModal'
import { ProgressWidget } from '@/components/dashboard/ProgressWidget'
import { UpcomingWidget } from '@/components/dashboard/UpcomingWidget'
import { PriorityWidget } from '@/components/dashboard/PriorityWidget'
import { BoardsWidget } from '@/components/dashboard/BoardsWidget'
import { ActivitiesWidget } from '@/components/dashboard/ActivitiesWidget'
import { AnalyticsTrendsWidget } from '@/components/dashboard/AnalyticsTrendsWidget'
import { AnalyticsDistributionWidget } from '@/components/dashboard/AnalyticsDistributionWidget'

const DEFAULT_LAYOUT = [
  'progress',
  'upcoming',
  'priority',
  'boards',
  'activities',
  'analytics_trends',
  'analytics_distribution',
]

export default function Index() {
  const { user } = useAuth()
  const [boards, setBoards] = useState<any[]>([])

  const now = new Date()
  const isAfter10AM = getHours(now) >= 10
  const [activities, setActivities] = useState<any[]>([])
  const [cardsData, setCardsData] = useState<{ cards: any[]; priorityCards: any[] }>({
    cards: [],
    priorityCards: [],
  })
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState<string>('all')

  const [layout, setLayout] = useState<string[]>(DEFAULT_LAYOUT)
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  useEffect(() => {
    getUsers().then(setUsers).catch(console.error)
  }, [])

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
      setLoading(true)
      const boardsData = await getBoards()
      setBoards(boardsData)

      const explicitBoardIds = boardsData.map((b: any) => b.id)
      const boardIds = user?.role === 'admin' ? undefined : explicitBoardIds

      const memberFilter = selectedMember === 'all' ? undefined : selectedMember

      const activitiesData = await getRecentActivities(boardIds, memberFilter)
      setActivities(activitiesData.items || activitiesData)

      const dData = await getDashboardData(explicitBoardIds, memberFilter)
      setCardsData(dData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user, selectedMember])

  useRealtime('boards', () => loadData())
  useRealtime('activity_logs', () => loadData())
  useRealtime('cards', () => loadData())
  useRealtime('card_labels', () => loadData())
  useRealtime('labels', () => loadData())
  useRealtime('card_members', () => loadData())

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

  const handleExportCSV = async () => {
    try {
      const explicitBoardIds = boards.map((b: any) => b.id)
      const boardFilter =
        user?.role === 'admin' ? '' : explicitBoardIds.map((id) => `board_id="${id}"`).join(' || ')

      const allCards = await pb.collection('cards').getFullList({
        expand: 'board_id,column_id',
        filter: boardFilter ? `(${boardFilter}) && archived != true` : 'archived != true',
      })

      const escapeCSV = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`
      const csvRows = ['Título,Quadro,Coluna,Data de Vencimento,Concluído,Prioridade']

      allCards.forEach((c) => {
        const title = escapeCSV(c.title)
        const board = escapeCSV(c.expand?.board_id?.name)
        const column = escapeCSV(c.expand?.column_id?.name)
        const dueDate = c.due_date ? escapeCSV(format(new Date(c.due_date), 'dd/MM/yyyy')) : '""'
        const completed = c.completed ? '"Sim"' : '"Não"'
        const priority = cardsData.priorityCards.find((pc) => pc.id === c.id)
          ? '"Alta"'
          : '"Normal"'
        csvRows.push(`${title},${board},${column},${dueDate},${completed},${priority}`)
      })

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'relatorio_flowdesk.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export CSV', err)
    }
  }

  const handleExportPDF = () => {
    window.print()
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
      case 'analytics_trends':
        return <AnalyticsTrendsWidget cards={cardsData.cards} loading={loading} />
      case 'analytics_distribution':
        return (
          <AnalyticsDistributionWidget
            cards={cardsData.cards}
            priorityCards={cardsData.priorityCards}
            loading={loading}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      <DailyBriefingModal />
      <AppHeader />
      <div className="p-8 max-w-6xl mx-auto w-full animate-fade-in pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground">
            Bem-vindo, {user?.name?.split(' ')[0] || 'Usuário'}
          </h1>
          <div className="flex items-center gap-4 z-10 flex-wrap justify-end">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                Filtrar por membro:
              </span>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger className="w-[200px] bg-background">
                  <SelectValue placeholder="Todos os membros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os membros</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Exportar Relatórios
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer gap-2">
                  <FileText className="w-4 h-4" />
                  Exportar PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <OverdueAlert cards={cardsData.cards} />

        {user?.role === 'admin' && <ExpiringContractsAlert />}

        {user?.role === 'admin' &&
          isAfter10AM &&
          users.filter(
            (u) =>
              u.role === 'membro' &&
              (!u.last_briefing_at || !isToday(parseISO(u.last_briefing_at))),
          ).length > 0 && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 dark:bg-amber-950/30 dark:border-amber-900/50">
              <h3 className="text-amber-800 dark:text-amber-200 font-semibold mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Membros com Briefing Pendente após as 10:00 (
                {
                  users.filter(
                    (u) =>
                      u.role === 'membro' &&
                      (!u.last_briefing_at || !isToday(parseISO(u.last_briefing_at))),
                  ).length
                }
                )
              </h3>
              <div className="flex flex-wrap gap-2">
                {users
                  .filter(
                    (u) =>
                      u.role === 'membro' &&
                      (!u.last_briefing_at || !isToday(parseISO(u.last_briefing_at))),
                  )
                  .map((u) => (
                    <Badge
                      key={u.id}
                      variant="outline"
                      className="bg-background text-amber-700 border-amber-200 dark:text-amber-300 dark:border-amber-800"
                    >
                      {u.name}
                    </Badge>
                  ))}
              </div>
            </div>
          )}

        <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
          {layout.map((id, index) => {
            const isDragging = draggedIdx === index
            const isOver = dragOverIdx === index
            const spanClass =
              id === 'boards' || id === 'activities' || id.startsWith('analytics_')
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

      {/* Print-only View */}
      <div
        id="print-report"
        className="hidden print:block absolute top-0 left-0 w-full min-h-screen bg-white text-black p-10 z-[9999]"
      >
        <div className="border-b-2 border-black pb-4 mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight">
              Relatório de Produtividade
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              FlowDesk • {format(new Date(), 'dd/MM/yyyy HH:mm')}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b pb-2">
            Resumo Geral
          </h2>
          <div className="grid grid-cols-3 gap-6 mb-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">
                Total de Tarefas
              </p>
              <p className="text-3xl font-bold">{cardsData.cards.length}</p>
            </div>
            <div className="p-4 border rounded-lg border-green-200 bg-green-50">
              <p className="text-sm text-green-700 font-medium uppercase tracking-wider mb-1">
                Concluídas
              </p>
              <p className="text-3xl font-bold text-green-800">
                {cardsData.cards.filter((c) => c.completed).length}
              </p>
            </div>
            <div className="p-4 border rounded-lg border-amber-200 bg-amber-50">
              <p className="text-sm text-amber-700 font-medium uppercase tracking-wider mb-1">
                Pendentes
              </p>
              <p className="text-3xl font-bold text-amber-800">
                {cardsData.cards.filter((c) => !c.completed).length}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b pb-2">
            Cartões Prioritários / Em Atraso
          </h2>
          {cardsData.priorityCards.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-sm">
                    <th className="border-b p-3 font-semibold">Tarefa</th>
                    <th className="border-b p-3 font-semibold">Quadro</th>
                    <th className="border-b p-3 font-semibold">Vencimento</th>
                  </tr>
                </thead>
                <tbody>
                  {cardsData.priorityCards.map((c) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{c.title}</td>
                      <td className="p-3 text-sm text-gray-600">
                        {c.expand?.board_id?.name || '-'}
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {c.due_date ? format(new Date(c.due_date), 'dd/MM/yyyy') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 italic p-4 border rounded-lg bg-gray-50 text-center">
              Nenhum cartão prioritário ou em atraso no momento.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
