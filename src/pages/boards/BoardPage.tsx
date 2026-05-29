import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, Link, useNavigate, Outlet, useOutletContext } from 'react-router-dom'
import {
  ArrowLeft,
  MoreHorizontal,
  Plus,
  Settings,
  Archive,
  Trash2,
  FilterX,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  ArrowDownUp,
  LayoutDashboard,
  List as ListIcon,
  Search,
  X,
  Briefcase,
  Repeat,
  RefreshCw,
} from 'lucide-react'
import { startOfDay, isBefore, isToday, addDays } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getBoard, updateBoard, deleteBoard } from '@/services/boards'
import { getBoardCalendarSync } from '@/services/calendar_sync'
import { syncGoogleCalendar } from '@/services/integrations'
import {
  getBoardColumns,
  createColumn,
  updateColumn,
  deleteColumn,
  updateColumnOrder,
} from '@/services/columns'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { BoardModal } from '@/components/boards/BoardModal'
import { ArchivedCardsSheet } from '@/components/boards/ArchivedCardsSheet'
import { CardItem } from '@/components/cards/CardItem'
import { ClientIdentitySheet } from '@/components/clients/ClientIdentitySheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AppHeader } from '@/components/AppHeader'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { cn } from '@/lib/utils'

const sortCardsByDueDateAndOrder = (a: any, b: any) => {
  if (a.due_date && b.due_date) {
    const timeA = new Date(a.due_date).getTime()
    const timeB = new Date(b.due_date).getTime()
    if (timeA !== timeB) return timeA - timeB
  }
  if (a.due_date && !b.due_date) return -1
  if (!a.due_date && b.due_date) return 1

  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
  return new Date(a.created || 0).getTime() - new Date(b.created || 0).getTime()
}

export default function BoardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [board, setBoard] = useState<any>(null)
  const [columns, setColumns] = useState<any[]>([])
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [archivedSheetOpen, setArchivedSheetOpen] = useState(false)
  const [identitySheetOpen, setIdentitySheetOpen] = useState(false)

  const [isEditingName, setIsEditingName] = useState(false)
  const [boardName, setBoardName] = useState('')

  const [draggedColId, setDraggedColId] = useState<string | null>(null)
  const isDraggingRef = useRef(false)

  const [dateFilter, setDateFilter] = useState<string>('all')
  const [calendarSync, setCalendarSync] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)

  const handleQuickMove = async (cardId: string, action: 'in_progress' | 'done') => {
    try {
      const targetColName = action === 'in_progress' ? 'EM ANDAMENTO' : 'CONCLUÍDO'
      const targetCol = columns.find((c) => c.name.toUpperCase() === targetColName)
      const completed = action === 'done'

      const card = cards.find((c) => c.id === cardId)
      if (!card) return

      if (!targetCol) {
        // If column doesn't exist, still update the completed status
        if (card.completed !== completed) {
          setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, completed } : c)))
          await pb.collection('cards').update(cardId, { completed })
        }
        toast({
          title: `Coluna "${targetColName}" não encontrada. Status atualizado.`,
          variant: 'destructive',
        })
        return
      }

      if (card.column_id === targetCol.id && card.completed === completed) {
        return
      }

      let newSortOrder = card.sort_order
      if (card.column_id !== targetCol.id) {
        const colCards = cards
          .filter((c) => c.column_id === targetCol.id && c.id !== cardId)
          .sort(sortCardsByDueDateAndOrder)
        newSortOrder = colCards.length > 0 ? colCards[colCards.length - 1].sort_order + 1 : 0
      }

      setCards((prev) =>
        prev.map((c) => {
          if (c.id === cardId) {
            return { ...c, column_id: targetCol.id, completed, sort_order: newSortOrder }
          }
          return c
        }),
      )

      await pb.collection('cards').update(cardId, {
        column_id: targetCol.id,
        completed,
        sort_order: newSortOrder,
      })

      toast({ title: `Cartão movido para ${targetColName}` })
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao mover cartão. Tente novamente.', variant: 'destructive' })
      loadData()
    }
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [view, setView] = useState<'kanban' | 'list'>('kanban')

  const isAdmin = user?.role === 'admin'

  const stats = useMemo(() => {
    const today = startOfDay(new Date())
    let completed = 0
    let overdue = 0
    let open = 0

    cards.forEach((card) => {
      if (card.completed) {
        completed++
      } else {
        open++
        if (card.due_date && isBefore(startOfDay(new Date(card.due_date)), today)) {
          overdue++
        }
      }
    })

    return { total: cards.length, completed, overdue, open }
  }, [cards])

  const handleSortByDueDate = async () => {
    if (!cards.length) return

    const newCards = [...cards]
    const updatedCards: any[] = []

    columns.forEach((col) => {
      const colCards = newCards.filter((c) => c.column_id === col.id)

      colCards.sort(sortCardsByDueDateAndOrder)

      colCards.forEach((c, idx) => {
        if (c.sort_order !== idx) {
          c.sort_order = idx
          updatedCards.push(c)
        }
      })
    })

    if (updatedCards.length === 0) {
      toast({ title: 'Cartões já estão ordenados' })
      return
    }

    setCards(newCards)

    try {
      await Promise.all(
        updatedCards.map((c) => pb.collection('cards').update(c.id, { sort_order: c.sort_order })),
      )
      toast({ title: 'Cartões ordenados por prazo' })
    } catch (err) {
      toast({ title: 'Erro ao ordenar cartões', variant: 'destructive' })
      loadData()
    }
  }

  const filteredCards = useMemo(() => {
    let result = cards

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (c) => c.title?.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q),
      )
    }

    if (dateFilter !== 'all') {
      const today = startOfDay(new Date())
      result = result.filter((card) => {
        if (!card.due_date) return false
        const cardDate = startOfDay(new Date(card.due_date))

        if (dateFilter === 'overdue') {
          return !card.completed && isBefore(cardDate, today)
        }
        if (dateFilter === 'today') {
          return isToday(cardDate)
        }
        if (dateFilter === 'week') {
          return cardDate >= today && cardDate <= addDays(today, 7)
        }
        return true
      })
    }

    return result
  }, [cards, dateFilter, searchQuery])

  const loadData = async () => {
    if (!id) return
    try {
      const b = await getBoard(id)
      setBoard(b)
      const cols = await getBoardColumns(id)
      setColumns(cols)

      const c = await pb.collection('cards').getFullList({
        filter: `board_id = '${id}' && archived != true && is_recurring != true`,
        expand:
          'card_labels_via_card_id.label_id,card_members_via_card_id.user_id,comments_via_card_id,checklist_items_via_card_id,attachments_via_card_id,created_by',
        sort: 'sort_order',
      })
      setCards(c)

      const sync = await getBoardCalendarSync(id)
      setCalendarSync(sync)
    } catch (err) {
      toast({ title: 'Erro ao carregar quadro', variant: 'destructive' })
      navigate('/boards')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime('boards', (e) => {
    if (e.record.id === id) {
      if (e.action === 'delete') navigate('/boards')
      else loadData()
    }
  })

  useRealtime('columns', (e) => {
    if (e.record.board_id === id && !isDraggingRef.current) {
      loadData()
    }
  })

  useRealtime('cards', () => loadData())
  useRealtime('card_labels', () => loadData())
  useRealtime('labels', () => loadData())
  useRealtime('card_members', () => loadData())
  useRealtime('comments', () => loadData())
  useRealtime('checklist_items', () => loadData())
  useRealtime('attachments', () => loadData())

  const handleAddColumn = async () => {
    try {
      const maxOrder =
        columns.length > 0
          ? Math.max(
              ...columns.map((c) => {
                const val = Number(c.sort_order)
                return isNaN(val) ? 0 : val
              }),
            )
          : -1
      await createColumn({
        board_id: id,
        name: 'Nova Coluna',
        sort_order: Math.floor(maxOrder + 1),
        color: '#e2e8f0',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao adicionar coluna',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const handleArchive = async () => {
    if (!confirm('Deseja arquivar este quadro?')) return
    try {
      await updateBoard(id!, { archived: true })
      toast({ title: 'Quadro arquivado' })
      navigate('/boards')
    } catch (err) {
      toast({ title: 'Erro ao arquivar', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este quadro? Esta ação não pode ser desfeita.'))
      return
    if (!confirm('Dupla confirmação: Excluir permanentemente?')) return
    try {
      await deleteBoard(id!)
      toast({ title: 'Quadro excluído com sucesso' })
      navigate('/boards')
    } catch (err) {
      toast({ title: 'Erro ao excluir quadro', variant: 'destructive' })
    }
  }

  const handleBoardNameUpdate = async () => {
    if (!boardName.trim()) {
      toast({ title: 'O nome do quadro não pode estar vazio', variant: 'destructive' })
      setBoardName(board.name)
      setIsEditingName(false)
      return
    }
    setIsEditingName(false)
    if (boardName !== board.name) {
      try {
        await updateBoard(id!, { name: boardName })
        setBoard((prev: any) => ({ ...prev, name: boardName }))
        toast({ title: 'Nome atualizado' })
      } catch (err) {
        toast({ title: 'Erro ao atualizar nome', variant: 'destructive' })
        setBoardName(board.name)
      }
    }
  }

  const handleDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedColId(colId)
    isDraggingRef.current = true
    e.dataTransfer.effectAllowed = 'move'
    setTimeout(() => {
      const el = document.getElementById(`col-${colId}`)
      if (el) el.style.opacity = '0.5'
    }, 0)
  }

  const handleDragEnter = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedColId || draggedColId === targetId) return

    setColumns((prev) => {
      const newCols = [...prev]
      const draggedIdx = newCols.findIndex((c) => c.id === draggedColId)
      const targetIdx = newCols.findIndex((c) => c.id === targetId)

      if (draggedIdx === -1 || targetIdx === -1) return prev

      const temp = newCols[draggedIdx]
      newCols[draggedIdx] = newCols[targetIdx]
      newCols[targetIdx] = temp

      return newCols.map((c, idx) => ({ ...c, sort_order: idx }))
    })
  }

  const handleDragEnd = async (e: React.DragEvent, colId: string) => {
    setDraggedColId(null)
    const el = document.getElementById(`col-${colId}`)
    if (el) el.style.opacity = '1'

    try {
      await updateColumnOrder(columns.map((c) => ({ id: c.id, sort_order: c.sort_order })))
      await loadData()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao reordenar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      isDraggingRef.current = false
    }
  }

  if (loading || !board)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#0b0f17]">
      <AppHeader />

      <div className="bg-background border-b px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/boards">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            {isEditingName && isAdmin ? (
              <Input
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                onBlur={handleBoardNameUpdate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleBoardNameUpdate()
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    setIsEditingName(false)
                    setBoardName(board.name)
                  }
                }}
                autoFocus
                className="h-8 text-xl font-semibold w-64 rounded-lg border border-white/30 bg-white/10 text-gray-100 backdrop-blur focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
              />
            ) : (
              <h1
                className={`text-2xl font-display font-semibold tracking-tight flex items-center gap-2 text-gray-100 ${isAdmin ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                onClick={() => {
                  if (isAdmin) {
                    setIsEditingName(true)
                    setBoardName(board.name)
                  }
                }}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: board.color || '#e2e8f0' }}
                />
                {board.name}
              </h1>
            )}

            {(board.client_name || board.expand?.client_id) && (
              <div className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
                {board.expand?.client_id?.logo && (
                  <img
                    src={pb.files.getURL(board.expand.client_id, board.expand.client_id.logo)}
                    alt=""
                    className="w-4 h-4 object-contain rounded-sm"
                  />
                )}
                <span>{board.expand?.client_id?.name || board.client_name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {board.expand?.client_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIdentitySheetOpen(true)}
              className="h-8 text-xs bg-background/50 shrink-0 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5 sm:mr-2" />
              <span className="hidden sm:inline">Identidade do Cliente</span>
            </Button>
          )}

          <div className="relative shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar cartões..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-40 lg:w-56 pl-10 pr-9 h-8 text-xs rounded-lg border border-white/30 bg-white/10 text-gray-100 backdrop-blur focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-400 hover:text-gray-100"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          <Tabs
            value={view}
            onValueChange={(v) => setView(v as 'kanban' | 'list')}
            className="h-8 shrink-0"
          >
            <TabsList className="h-8 inline-flex rounded-full bg-black/20 p-1 backdrop-blur border-none">
              <TabsTrigger
                value="kanban"
                className="h-6 text-xs px-2.5 rounded-full text-gray-300 hover:bg-white/5 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow"
              >
                <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" /> Quadro
              </TabsTrigger>
              <TabsTrigger
                value="list"
                className="h-6 text-xs px-2.5 rounded-full text-gray-300 hover:bg-white/5 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow"
              >
                <ListIcon className="w-3.5 h-3.5 mr-1.5" /> Lista
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setArchivedSheetOpen(true)}
            className="h-8 text-xs bg-background/50 shrink-0"
          >
            <Archive className="w-3.5 h-3.5 sm:mr-2" />
            <span className="hidden sm:inline">Itens Arquivados</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSortByDueDate}
            className="h-8 text-xs bg-background/50 hidden xl:flex shrink-0"
          >
            <ArrowDownUp className="w-3.5 h-3.5 mr-2" />
            Ordenar
          </Button>

          {calendarSync && (
            <Button
              variant="outline"
              size="sm"
              loading={syncing}
              onClick={async () => {
                try {
                  setSyncing(true)
                  const res: any = await syncGoogleCalendar(calendarSync.id)
                  const count = res?.createdCount ?? 0
                  toast({
                    title: `Sincronização concluída! ${count} novos eventos importados (limite de 7 dias).`,
                  })
                  loadData()
                } catch (err) {
                  toast({
                    title: 'Erro ao sincronizar',
                    description: getErrorMessage(err),
                    variant: 'destructive',
                  })
                } finally {
                  setSyncing(false)
                }
              }}
              className="h-8 text-xs bg-background/50 shrink-0 border-primary/20"
            >
              {!syncing && <RefreshCw className="w-3.5 h-3.5 sm:mr-2" />}
              <span className="hidden sm:inline">Sincronizar Agenda</span>
            </Button>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px] lg:w-[180px] h-8 text-xs rounded-lg border border-white/30 bg-white/10 text-gray-100 backdrop-blur focus:outline-none focus:ring-2 focus:ring-emerald-400/50">
                <SelectValue placeholder="Filtrar por data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tarefas</SelectItem>
                <SelectItem value="today">Vencendo hoje</SelectItem>
                <SelectItem value="week">Vencendo esta semana</SelectItem>
                <SelectItem value="overdue">Atrasadas</SelectItem>
              </SelectContent>
            </Select>
            {dateFilter !== 'all' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400"
                onClick={() => setDateFilter('all')}
                title="Limpar filtros"
              >
                <FilterX className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex -space-x-2 shrink-0 ml-2">
            {board.expand?.members?.map((m: any) => (
              <Avatar key={m.id} className="w-8 h-8 border-2 border-background">
                <AvatarImage src={m.avatar ? pb.files.getURL(m, m.avatar) : ''} />
                <AvatarFallback className="text-xs bg-primary/10">
                  {m.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 ml-1">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditModalOpen(true)}>
                  <Settings className="w-4 h-4 mr-2" /> Editar Quadro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="w-4 h-4 mr-2" /> Arquivar Quadro
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-500 focus:text-red-500"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir Quadro
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="bg-background/60 border-b px-6 py-2.5 flex items-center gap-6 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] text-sm">
        <div className="flex items-center gap-2 min-w-max">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-gray-400">Total de Tarefas:</span>
          <span className="font-semibold text-gray-100">{stats.total}</span>
        </div>

        <div className="w-px h-4 bg-border shrink-0"></div>

        <div className="flex items-center gap-2 min-w-max">
          <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
            <LayoutDashboard className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <span className="text-gray-400">Em aberto:</span>
          <span className="font-semibold text-blue-600">{stats.open}</span>
        </div>

        <div className="w-px h-4 bg-border shrink-0"></div>

        <div className="flex items-center gap-2 min-w-max">
          <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <span className="text-gray-400">Concluídas:</span>
          <span className="font-semibold text-emerald-500">{stats.completed}</span>
        </div>

        <div className="w-px h-4 bg-border shrink-0"></div>

        <div className="flex items-center gap-2 min-w-max">
          <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          </div>
          <span className="text-gray-400">Atrasadas:</span>
          <span className="font-semibold text-red-500">{stats.overdue}</span>
        </div>
      </div>

      <div className="flex-1 relative p-4 lg:p-6 overflow-hidden flex flex-col animate-fade-in">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none z-0" />
        <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none z-0" />

        <div
          className={cn(
            'flex-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] relative z-10 p-4 lg:p-6',
            view === 'kanban' ? 'overflow-x-auto overflow-y-hidden' : 'overflow-auto',
          )}
        >
          {view === 'kanban' ? (
            <div className="flex gap-6 h-full items-start">
              {columns.map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  cards={filteredCards.filter((c) => c.column_id === col.id)}
                  onDragStart={(e: any) => handleDragStart(e, col.id)}
                  onDragEnter={(e: any) => handleDragEnter(e, col.id)}
                  onDragEnd={(e: any) => handleDragEnd(e, col.id)}
                  onDelete={async () => {
                    const colCards = cards.filter((c: any) => c.column_id === col.id)
                    if (colCards.length > 0) {
                      if (
                        !confirm(
                          'Esta coluna contém cards. Deseja excluir a coluna e todos os cards dentro dela?',
                        )
                      ) {
                        return
                      }
                      try {
                        await Promise.all(
                          colCards.map((c: any) => pb.collection('cards').delete(c.id)),
                        )
                        await deleteColumn(col.id)
                        toast({ title: 'Coluna e cartões excluídos com sucesso' })
                      } catch (err) {
                        toast({
                          title: 'Erro ao excluir',
                          description: getErrorMessage(err),
                          variant: 'destructive',
                        })
                      }
                    } else {
                      if (confirm('Excluir coluna?')) {
                        try {
                          await deleteColumn(col.id)
                          toast({ title: 'Coluna excluída com sucesso' })
                        } catch (err) {
                          toast({
                            title: 'Erro ao excluir',
                            description: getErrorMessage(err),
                            variant: 'destructive',
                          })
                        }
                      }
                    }
                  }}
                  onUpdate={async (data: any) => {
                    try {
                      await updateColumn(col.id, data)
                    } catch (err) {
                      toast({
                        title: 'Erro ao atualizar',
                        description: getErrorMessage(err),
                        variant: 'destructive',
                      })
                    }
                  }}
                  onQuickMove={handleQuickMove}
                  onCardDrop={async (cardId: string, colId: string, targetCardId?: string) => {
                    try {
                      const card = cards.find((c) => c.id === cardId)
                      if (!card) return

                      const currentCards = [...cards]
                      const oldColId = card.column_id

                      // Move card to new column
                      card.column_id = colId

                      // Filter cards for the target column
                      let colCards = currentCards
                        .filter((c) => c.column_id === colId && c.id !== cardId)
                        .sort(sortCardsByDueDateAndOrder)

                      if (targetCardId) {
                        const targetIdx = colCards.findIndex((c) => c.id === targetCardId)
                        if (targetIdx >= 0) {
                          colCards.splice(targetIdx, 0, card)
                        } else {
                          colCards.push(card)
                        }
                      } else {
                        colCards.push(card)
                      }

                      // Update sort_order locally
                      colCards.forEach((c, idx) => {
                        c.sort_order = idx
                      })

                      setCards((prev) =>
                        prev.map((c) => {
                          const updated = colCards.find((cc) => cc.id === c.id)
                          return updated
                            ? { ...c, column_id: updated.column_id, sort_order: updated.sort_order }
                            : c
                        }),
                      )

                      if (oldColId !== colId) {
                        await pb.collection('cards').update(cardId, { column_id: colId })
                        await pb.collection('activity_logs').create({
                          card_id: cardId,
                          user_id: user?.id,
                          action_type: 'move',
                          description: 'Moveu o cartão para outra coluna',
                        })
                      }

                      // Sync sort_orders sequentially
                      await Promise.all(
                        colCards.map((c) =>
                          pb.collection('cards').update(c.id, { sort_order: c.sort_order }),
                        ),
                      )
                    } catch (err) {
                      console.error(err)
                      toast({
                        title: 'Erro ao mover cartão',
                        description: getErrorMessage(err),
                        variant: 'destructive',
                      })
                    }
                  }}
                />
              ))}

              <Button
                variant="ghost"
                className="shrink-0 w-[280px] h-[50px] bg-background/50 border border-dashed border-border/60 hover:bg-background justify-start"
                onClick={handleAddColumn}
              >
                <Plus className="w-4 h-4 mr-2" /> Adicionar coluna
              </Button>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto space-y-8 pb-12">
              {columns.map((col) => {
                const colCards = filteredCards
                  .filter((c) => c.column_id === col.id)
                  .sort(sortCardsByDueDateAndOrder)

                if (colCards.length === 0) return null

                return (
                  <div key={col.id} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shadow-sm"
                        style={{ backgroundColor: col.color || '#e2e8f0' }}
                      />
                      <h3 className="font-semibold text-lg text-gray-100">{col.name}</h3>
                      <span className="text-gray-400 text-xs font-medium bg-muted px-2 py-0.5 rounded-full border border-border/50">
                        {colCards.length} {colCards.length === 1 ? 'cartão' : 'cartões'}
                      </span>
                    </div>

                    <div className="bg-background rounded-xl border border-border shadow-sm overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead className="w-[40%]">Título</TableHead>
                            <TableHead>Etiquetas</TableHead>
                            <TableHead>Membros</TableHead>
                            <TableHead>Criado</TableHead>
                            <TableHead className="w-[140px]">Prazo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {colCards.map((card) => {
                            const labels =
                              card.expand?.card_labels_via_card_id?.map(
                                (cl: any) => cl.expand?.label_id,
                              ) || []
                            const members =
                              card.expand?.card_members_via_card_id?.map(
                                (cm: any) => cm.expand?.user_id,
                              ) || []

                            return (
                              <TableRow
                                key={card.id}
                                className={cn(
                                  'cursor-pointer hover:bg-muted/50 transition-all duration-300',
                                  (card.completed || col.name.toUpperCase() === 'CONCLUÍDO') &&
                                    'opacity-70 bg-secondary/50',
                                )}
                                onClick={() => navigate(`/boards/${id}/cards/${card.id}`)}
                              >
                                <TableCell className="font-medium py-3">
                                  <div className="flex items-center gap-2">
                                    {card.is_recurring && (
                                      <div
                                        className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white leading-none shadow-sm flex items-center gap-1 bg-indigo-500"
                                        title="Tarefa Recorrente"
                                      >
                                        <Repeat className="w-2.5 h-2.5" />
                                      </div>
                                    )}
                                    {(card.completed || col.name.toUpperCase() === 'CONCLUÍDO') && (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                    )}
                                    <span
                                      className={cn(
                                        'transition-all duration-300',
                                        card.completed || col.name.toUpperCase() === 'CONCLUÍDO'
                                          ? 'line-through text-gray-400'
                                          : 'text-gray-100',
                                      )}
                                    >
                                      {card.title}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3">
                                  <div className="flex flex-wrap gap-1.5">
                                    {labels.map(
                                      (l: any) =>
                                        l && (
                                          <div
                                            key={l.id}
                                            className="px-2 py-0.5 rounded text-[10px] font-semibold text-white leading-none shadow-sm"
                                            style={{ backgroundColor: l.color }}
                                            title={l.name}
                                          >
                                            {l.name}
                                          </div>
                                        ),
                                    )}
                                    {labels.length === 0 && (
                                      <span className="text-xs text-gray-400">-</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-3">
                                  <div className="flex -space-x-1.5">
                                    {members.map(
                                      (m: any) =>
                                        m && (
                                          <Avatar
                                            key={m.id}
                                            className="w-7 h-7 border-2 border-background shadow-sm"
                                            title={m.name}
                                          >
                                            <AvatarImage
                                              src={m.avatar ? pb.files.getURL(m, m.avatar) : ''}
                                            />
                                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                              {m.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                        ),
                                    )}
                                    {members.length === 0 && (
                                      <span className="text-xs text-gray-400 ml-1.5">-</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 text-xs text-gray-400">
                                  <div className="flex flex-col">
                                    <span className="font-medium text-gray-100 truncate">
                                      {card.expand?.created_by?.name || 'Sistema'}
                                    </span>
                                    <span className="text-[10px]">
                                      {card.created
                                        ? new Date(card.created).toLocaleDateString('pt-BR')
                                        : '-'}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3">
                                  {card.due_date ? (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                      <CalendarDays className="w-3.5 h-3.5" />
                                      {isBefore(
                                        startOfDay(new Date(card.due_date)),
                                        startOfDay(new Date()),
                                      ) && !card.completed ? (
                                        <span className="text-red-500">
                                          {new Date(card.due_date).toLocaleDateString('pt-BR')}
                                        </span>
                                      ) : (
                                        new Date(card.due_date).toLocaleDateString('pt-BR')
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )
              })}

              {filteredCards.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 border-2 border-dashed border-border rounded-xl bg-background/30">
                  <Search className="w-10 h-10 mb-4 opacity-20" />
                  <p className="text-lg font-medium text-gray-100">Nenhum cartão encontrado</p>
                  <p className="text-sm">Tente ajustar seus filtros ou termo de busca.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <BoardModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        board={board}
        onSuccess={loadData}
      />
      <ArchivedCardsSheet
        open={archivedSheetOpen}
        onOpenChange={setArchivedSheetOpen}
        boardId={id!}
      />
      <ClientIdentitySheet
        open={identitySheetOpen}
        onOpenChange={setIdentitySheetOpen}
        client={board.expand?.client_id}
      />
      <Outlet context={{ cards, board, columns, loadData }} />
    </div>
  )
}

function Column({
  column,
  cards = [],
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDelete,
  onUpdate,
  onCardDrop,
  onQuickMove,
}: any) {
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(column.name)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editing])

  const handleSave = () => {
    if (!name.trim()) {
      toast({ title: 'O nome da coluna não pode estar vazio', variant: 'destructive' })
      setName(column.name)
      setEditing(false)
      return
    }
    setEditing(false)
    if (name !== column.name) {
      onUpdate({ name })
    }
  }

  return (
    <div
      id={`col-${column.id}`}
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      className="shrink-0 w-[300px] max-h-full flex flex-col bg-background/50 rounded-xl border border-border/50 shadow-subtle cursor-grab active:cursor-grabbing transition-all duration-200 hover:border-border"
    >
      <div
        className="p-3 flex items-center justify-between group border-b border-border/50"
        style={{
          borderTop: `4px solid ${column.color || '#e2e8f0'}`,
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
        }}
      >
        {editing ? (
          <Input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSave()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                setEditing(false)
                setName(column.name)
              }
            }}
            className="h-7 text-sm font-semibold rounded-lg border border-white/30 bg-white/10 text-gray-100 backdrop-blur focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
          />
        ) : (
          <div
            className="flex items-center gap-2 flex-1 cursor-pointer"
            onClick={() => setEditing(true)}
          >
            <h3 className="font-semibold text-sm truncate text-gray-100">{column.name}</h3>
            <span className="text-xs text-gray-400 bg-muted px-2 py-0.5 rounded-full">
              {cards.length}
            </span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditing(true)}>Renomear</DropdownMenuItem>
            <div className="grid grid-cols-4 gap-1.5 p-2 justify-items-center">
              {[
                '#e2e8f0',
                '#64748b',
                '#ef4444',
                '#f97316',
                '#f59e0b',
                '#84cc16',
                '#10b981',
                '#06b6d4',
                '#3b82f6',
                '#6366f1',
                '#8b5cf6',
                '#ec4899',
              ].map((c) => (
                <button
                  key={c}
                  className="w-5 h-5 rounded-full border border-black/10 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  onClick={() => onUpdate({ color: c })}
                  title={c}
                />
              ))}
            </div>
            <DropdownMenuItem onClick={onDelete} className="text-red-500 focus:text-red-500">
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        className="p-3 flex-1 overflow-y-auto min-h-[100px] flex flex-col gap-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const cardId = e.dataTransfer.getData('cardId')
          if (cardId) onCardDrop(cardId, column.id)
        }}
      >
        {cards.sort(sortCardsByDueDateAndOrder).map((card: any) => (
          <CardItem
            key={card.id}
            card={card}
            boardId={column.board_id}
            columnName={column.name}
            onDragStart={(e: any) => {
              e.dataTransfer.setData('cardId', card.id)
            }}
            onDropCard={(e: any, targetCard: any) => {
              const cardId = e.dataTransfer.getData('cardId')
              if (cardId && cardId !== targetCard.id) {
                onCardDrop(cardId, column.id, targetCard.id)
              }
            }}
            onQuickMove={(action: any) => onQuickMove?.(card.id, action)}
          />
        ))}

        {isAdding ? (
          <div className="bg-background p-2 rounded-lg border border-border mt-1 shadow-sm">
            <Input
              autoFocus
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Título do cartão..."
              className="h-8 mb-2 text-sm shadow-none rounded-lg border border-white/30 bg-white/10 text-gray-100 backdrop-blur focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (!newCardTitle.trim()) {
                    toast({
                      title: 'O título do cartão não pode estar vazio',
                      variant: 'destructive',
                    })
                    return
                  }
                  const title = newCardTitle.trim()
                  setNewCardTitle('')
                  setIsAdding(false)
                  try {
                    const authId = pb.authStore.record?.id
                    const newCard = await pb.collection('cards').create({
                      board_id: column.board_id,
                      column_id: column.id,
                      title,
                      sort_order: Math.floor(cards.length),
                      created_by: authId,
                      completed: false,
                    })
                    await pb.collection('activity_logs').create({
                      card_id: newCard.id,
                      user_id: authId,
                      action_type: 'creation',
                      description: 'Criou este cartão',
                    })
                  } catch (err: any) {
                    if (err.status === 403 || err.status === 404) {
                      toast({
                        title: 'Cartão criado',
                        description:
                          'O cartão foi criado, mas você não possui permissão para visualizá-lo. Solicite atribuição a um administrador.',
                      })
                    } else {
                      toast({
                        title: 'Erro ao criar cartão',
                        description: getErrorMessage(err),
                        variant: 'destructive',
                      })
                    }
                  }
                }
                if (e.key === 'Escape') setIsAdding(false)
              }}
              onBlur={() => setIsAdding(false)}
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setIsAdding(true)}
            className="w-full text-gray-400 justify-start text-sm h-8 border border-dashed hover:bg-muted shrink-0 mt-1"
          >
            <Plus className="w-4 h-4 mr-2" /> Adicionar cartão
          </Button>
        )}
      </div>
    </div>
  )
}
