import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Search,
  CalendarDays,
  Plus,
  Trash2,
  ArrowRightLeft,
  Repeat,
  Edit2,
  Info,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { AppHeader } from '@/components/AppHeader'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CardDetail } from '@/components/cards/CardDetail'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { format } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'

function CreateSeasonalDialog({ open, onOpenChange, boards, columns, onSuccess }: any) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [boardId, setBoardId] = useState('')
  const [columnId, setColumnId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const card = await pb.collection('cards').create({
        title,
        description,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        board_id: boardId,
        column_id: columnId,
        google_event_id: 'manual_' + Date.now(),
        completed: false,
        created_by: user?.id,
      })
      await pb.collection('activity_logs').create({
        card_id: card.id,
        user_id: user?.id,
        action_type: 'creation',
        description: 'Criou tarefa sazonal manualmente',
      })
      toast({ title: 'Tarefa sazonal criada' })
      onSuccess()
      onOpenChange(false)
      setTitle('')
      setDescription('')
      setDueDate('')
      setBoardId('')
      setColumnId('')
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const boardColumns = columns.filter((c: any) => c.board_id === boardId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0b0f17]/95 backdrop-blur-xl border-white/10 text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-gray-100">Nova Tarefa Sazonal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Data de Vencimento</Label>
            <Input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quadro</Label>
              <Select required value={boardId} onValueChange={setBoardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Coluna</Label>
              <Select required value={columnId} onValueChange={setColumnId} disabled={!boardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {boardColumns.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MoveSelectedDialog({ open, onOpenChange, boards, columns, selectedIds, onSuccess }: any) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [boardId, setBoardId] = useState('')
  const [columnId, setColumnId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      for (const id of selectedIds) {
        await pb.collection('cards').update(id, { board_id: boardId, column_id: columnId })
        await pb.collection('activity_logs').create({
          card_id: id,
          user_id: user?.id,
          action_type: 'move',
          description: 'Moveu sazonal em lote',
        })
      }
      toast({ title: `${selectedIds.size} tarefas movidas` })
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const boardColumns = columns.filter((c: any) => c.board_id === boardId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0b0f17]/95 backdrop-blur-xl border-white/10 text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-gray-100">Mover {selectedIds.size} Selecionados</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Quadro de Destino</Label>
            <Select required value={boardId} onValueChange={setBoardId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {boards.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Coluna de Destino</Label>
            <Select required value={columnId} onValueChange={setColumnId} disabled={!boardId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {boardColumns.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Movendo...' : 'Mover'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function SazonaisPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const canManage = user?.role === 'admin' || user?.can_manage_routines

  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [boards, setBoards] = useState<any[]>([])
  const [columns, setColumns] = useState<any[]>([])

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [monthFilter, setMonthFilter] = useState('all')

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 50

  // Bulk State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [createOpen, setCreateOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [deleteOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Edit State
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const editingCardData = useMemo(
    () => cards.find((c) => c.id === editingCardId),
    [cards, editingCardId],
  )
  const editingBoardData = useMemo(
    () => (editingCardData ? boards.find((b) => b.id === editingCardData.board_id) : null),
    [editingCardData, boards],
  )

  // Sync / Preview State
  const [syncs, setSyncs] = useState<any[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [eventCards, setEventCards] = useState<any[]>([])
  const [seasonalBoardFilter, setSeasonalBoardFilter] = useState('all')
  const [seasonalColumnFilter, setSeasonalColumnFilter] = useState('all')
  const [seasonalMonthFilter, setSeasonalMonthFilter] = useState('all')
  const [seasonalPage, setSeasonalPage] = useState(1)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [cardsRes, boardsRes, colsRes, syncsRes, eventsRes] = await Promise.all([
        pb.collection('cards').getFullList({
          filter: `google_event_id != ''`,
          sort: '-created',
          expand: 'board_id.client_id,column_id',
        }),
        pb.collection('boards').getFullList(),
        pb.collection('columns').getFullList({ sort: 'sort_order' }),
        pb.collection('calendar_sync').getFullList({
          expand: 'board_id.client_id, target_column_id',
          sort: '-created',
        }),
        pb.send('/backend/v1/google-calendar/upcoming', { method: 'GET' }).catch(() => []),
      ])

      setCards(cardsRes)
      setBoards(boardsRes)
      setColumns(colsRes)
      setSyncs(syncsRes)
      setUpcomingEvents(eventsRes || [])
      setEventCards(cardsRes)
    } catch (e) {
      console.error('Error fetching sazonais:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
      let matchesMonth = true
      if (monthFilter !== 'all' && c.due_date) {
        const date = new Date(c.due_date)
        const month = (date.getMonth() + 1).toString()
        matchesMonth = month === monthFilter
      }
      return matchesSearch && matchesMonth
    })
  }, [cards, searchTerm, monthFilter])

  const paginatedCards = useMemo(() => {
    return filteredCards.slice((page - 1) * pageSize, page * pageSize)
  }, [filteredCards, page])

  const totalPages = Math.ceil(filteredCards.length / pageSize)

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(paginatedCards.map((c) => c.id)))
    else setSelectedIds(new Set())
  }

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const handleBulkDelete = async () => {
    try {
      for (const id of Array.from(selectedIds)) {
        const collectionsToClean = [
          'card_labels',
          'card_members',
          'attachments',
          'checklist_items',
          'comments',
          'activity_logs',
        ]
        for (const coll of collectionsToClean) {
          try {
            const records = await pb.collection(coll).getFullList({ filter: `card_id='${id}'` })
            for (const record of records) await pb.collection(coll).delete(record.id)
          } catch {
            /* intentionally ignored */
          }
        }
        await pb.collection('cards').delete(id)
      }
      toast({ title: 'Tarefas excluídas com sucesso' })
      setSelectedIds(new Set())
      fetchData()
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    } finally {
      setDeleteDialogOpen(false)
    }
  }

  const handleSingleDelete = async () => {
    if (!deletingId) return
    try {
      const collectionsToClean = [
        'card_labels',
        'card_members',
        'attachments',
        'checklist_items',
        'comments',
        'activity_logs',
      ]
      for (const coll of collectionsToClean) {
        try {
          const records = await pb
            .collection(coll)
            .getFullList({ filter: `card_id='${deletingId}'` })
          for (const record of records) await pb.collection(coll).delete(record.id)
        } catch {
          /* intentionally ignored */
        }
      }
      await pb.collection('cards').delete(deletingId)
      toast({ title: 'Tarefa excluída com sucesso' })
      fetchData()
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  // Sync Logic
  const handleForceSyncAll = async () => {
    try {
      toast({
        title: 'Iniciando sincronização...',
        description: 'Sincronizando todos os calendários ativos.',
      })
      const activeSyncs = syncs.filter((s) => s.is_active)
      for (const s of activeSyncs) {
        await pb
          .send('/backend/v1/google-calendar/sync', {
            method: 'POST',
            body: JSON.stringify({ sync_id: s.id }),
          })
          .catch(console.error)
      }
      toast({ title: 'Sincronização concluída com sucesso!' })
      fetchData()
    } catch (err: any) {
      toast({ title: 'Erro na sincronização', description: err.message, variant: 'destructive' })
    }
  }

  const handleUpdateSyncColumn = async (syncId: string, columnId: string) => {
    try {
      await pb.collection('calendar_sync').update(syncId, { target_column_id: columnId })
      toast({ title: 'Coluna de destino atualizada' })
      fetchData()
    } catch (err) {
      toast({ title: 'Erro ao atualizar coluna', variant: 'destructive' })
    }
  }

  const handleToggleSyncActive = async (syncId: string, isActive: boolean) => {
    try {
      await pb.collection('calendar_sync').update(syncId, { is_active: isActive })
      toast({ title: isActive ? 'Sincronização ativada' : 'Sincronização pausada' })
      fetchData()
    } catch (err) {
      toast({ title: 'Erro ao alterar status', variant: 'destructive' })
    }
  }

  const handleIgnoreEvent = async (eventId: string, syncId: string) => {
    if (!confirm('Deseja ignorar este evento? Ele não será convertido em cartão no futuro.')) return
    try {
      await pb
        .collection('ignored_google_events')
        .create({ google_event_id: eventId, sync_id: syncId })
      toast({ title: 'Evento ignorado com sucesso' })
      fetchData()
    } catch (err: any) {
      toast({ title: 'Erro ao ignorar', description: err.message, variant: 'destructive' })
    }
  }

  const filteredUpcomingEvents = upcomingEvents.filter((ev) => {
    if (seasonalBoardFilter !== 'all') {
      const b = boards.find((x) => x.id === seasonalBoardFilter)
      if (b && ev.board_name !== b.name) return false
    }
    if (seasonalColumnFilter !== 'all') {
      const c = columns.find((x) => x.id === seasonalColumnFilter)
      if (c && ev.column_name !== c.name) return false
    }
    if (seasonalMonthFilter !== 'all') {
      const evMonth = new Date(ev.date).getMonth() + 1
      if (evMonth.toString() !== seasonalMonthFilter) return false
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      if (!ev.title?.toLowerCase().includes(term) && !ev.id?.toLowerCase().includes(term))
        return false
    }
    return true
  })

  const SEASONAL_ITEMS_PER_PAGE = 30
  const seasonalTotalPages = Math.max(
    1,
    Math.ceil(filteredUpcomingEvents.length / SEASONAL_ITEMS_PER_PAGE),
  )
  const paginatedUpcomingEvents = filteredUpcomingEvents.slice(
    (seasonalPage - 1) * SEASONAL_ITEMS_PER_PAGE,
    seasonalPage * SEASONAL_ITEMS_PER_PAGE,
  )

  const months = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ]

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppHeader />
      <div className="flex-1 overflow-auto p-6 md:p-8 animate-fade-in">
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold tracking-tight">Sazonais</h1>
              <p className="text-muted-foreground mt-1">
                Visão global e gerenciamento em lote das tarefas sazonais e configurações de
                sincronização.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setCreateOpen(true)} className="shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Nova Sazonal
              </Button>
              <Button onClick={handleForceSyncAll} className="shadow-sm">
                <Repeat className="w-4 h-4 mr-2" /> Sincronizar Agora
              </Button>
            </div>
          </div>

          <Tabs defaultValue="cartoes" className="w-full space-y-6">
            <TabsList>
              <TabsTrigger value="cartoes">Cartões Sazonais</TabsTrigger>
              <TabsTrigger value="config">Configuração & Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="cartoes" className="space-y-6 m-0">
              <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 shadow-sm p-6 space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div className="flex items-center gap-4 w-full sm:w-auto flex-1">
                    <div className="relative w-full sm:max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar por nome ou descrição..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Mês da Sazonalidade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os meses</SelectItem>
                        {months.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 animate-fade-in">
                      <span className="text-sm font-medium mr-2">
                        {selectedIds.size} selecionados
                      </span>
                      <Button variant="outline" size="sm" onClick={() => setMoveOpen(true)}>
                        <ArrowRightLeft className="w-4 h-4 mr-2" /> Mover
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border border-white/10 rounded-md overflow-hidden bg-white/5 shadow-sm">
                  <Table className="w-full text-sm text-left min-w-[800px]">
                    <TableHeader className="bg-white/5 border-b border-white/10">
                      <TableRow>
                        <TableHead className="w-[40px] text-center">
                          <Checkbox
                            checked={
                              paginatedCards.length > 0 &&
                              selectedIds.size === paginatedCards.length
                            }
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="px-4 py-3 font-medium">Evento</TableHead>
                        <TableHead className="px-4 py-3 font-medium">Data</TableHead>
                        <TableHead className="px-4 py-3 font-medium">Cliente / Quadro</TableHead>
                        <TableHead className="px-4 py-3 font-medium">Status / Coluna</TableHead>
                        <TableHead className="px-4 py-3 text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y">
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell className="px-4 py-3">
                              <Skeleton className="h-4 w-4" />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <Skeleton className="h-5 w-[200px]" />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <Skeleton className="h-5 w-[100px]" />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-[150px]" />
                                <Skeleton className="h-3 w-[100px]" />
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <Skeleton className="h-5 w-[80px] rounded-full" />
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right">
                              <Skeleton className="h-8 w-8 ml-auto" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : paginatedCards.length > 0 ? (
                        paginatedCards.map((c) => (
                          <TableRow
                            key={c.id}
                            className="hover:bg-white/5 transition-colors group border-b border-white/10"
                          >
                            <TableCell className="w-[40px] text-center">
                              <Checkbox
                                checked={selectedIds.has(c.id)}
                                onCheckedChange={() => toggleSelection(c.id)}
                              />
                            </TableCell>
                            <TableCell
                              className="px-4 py-3 font-medium text-gray-100 cursor-pointer"
                              onClick={() => setEditingCardId(c.id)}
                            >
                              {c.title}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-gray-400 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <CalendarDays className="w-4 h-4 text-emerald-400" />
                                {c.due_date
                                  ? new Date(c.due_date).toLocaleDateString('pt-BR')
                                  : '-'}
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-100">
                                  {c.expand?.board_id?.expand?.client_id?.name ||
                                    c.expand?.board_id?.client_name ||
                                    'Sem Cliente'}
                                </span>
                                <span className="text-xs text-gray-400 mt-0.5">
                                  Quadro: {c.expand?.board_id?.name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {c.completed ? (
                                  <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20">
                                    Concluído
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-white/5 border-white/10 text-gray-300"
                                  >
                                    {c.expand?.column_id?.name || 'Sem Coluna'}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-amber-500 hover:bg-amber-50"
                                  onClick={() => setEditingCardId(c.id)}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:bg-red-50"
                                  onClick={() => setDeletingId(c.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                            Nenhum evento sazonal encontrado com os filtros atuais.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {!loading && (
                  <div className="flex justify-between items-center text-sm text-gray-400 border-t border-white/10 pt-4">
                    <span>
                      Mostrando {paginatedCards.length} de {filteredCards.length} tarefas.
                      {selectedIds.size > 0 && (
                        <span className="ml-2 font-medium text-primary">
                          ({selectedIds.size} selecionadas)
                        </span>
                      )}
                    </span>
                    {totalPages > 1 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          Anterior
                        </Button>
                        <div className="flex items-center text-sm px-2 font-medium text-gray-100">
                          Página {page} de {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                        >
                          Próxima
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="config" className="space-y-6 m-0">
              <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 shadow-sm p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    Configurações de Integração
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gerencie os calendários ativos que geram tarefas automaticamente 7 dias antes do
                    evento.
                  </p>
                </div>

                <div className="overflow-hidden border border-white/10 rounded-lg bg-white/5 w-full mb-8">
                  <div className="overflow-x-auto w-full">
                    <Table className="min-w-[900px]">
                      <TableHeader className="bg-white/5">
                        <TableRow className="border-b border-white/10">
                          <TableHead className="w-[30%]">Calendário</TableHead>
                          <TableHead>Cliente / Quadro</TableHead>
                          <TableHead>Coluna de Destino</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syncs.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center py-12 text-muted-foreground"
                            >
                              Nenhuma sincronização de calendário configurada.
                            </TableCell>
                          </TableRow>
                        ) : (
                          syncs.map((sync) => {
                            const boardColumns = columns.filter((c) => c.board_id === sync.board_id)
                            return (
                              <TableRow key={sync.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium truncate max-w-[200px] block">
                                      {sync.calendar_id}
                                    </span>
                                  </div>
                                  {sync.last_synced_at && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      Última sync:{' '}
                                      {format(new Date(sync.last_synced_at), 'dd/MM/yyyy HH:mm')}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium text-sm text-gray-100">
                                    {sync.expand?.board_id?.expand?.client_id?.name ||
                                      sync.expand?.board_id?.client_name ||
                                      'Interno'}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {sync.expand?.board_id?.name}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={sync.target_column_id}
                                    onValueChange={(val) => handleUpdateSyncColumn(sync.id, val)}
                                    disabled={!canManage}
                                  >
                                    <SelectTrigger className="w-[180px] h-8 text-sm">
                                      <SelectValue placeholder="Selecione a coluna" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {boardColumns.map((col) => (
                                        <SelectItem key={col.id} value={col.id}>
                                          {col.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={sync.is_active}
                                      disabled={!canManage}
                                      onCheckedChange={(val) =>
                                        handleToggleSyncActive(sync.id, val)
                                      }
                                    />
                                    <span
                                      className={`text-xs font-bold uppercase tracking-wider ${sync.is_active ? 'text-emerald-400' : 'text-gray-500'}`}
                                    >
                                      {sync.is_active ? 'Ativo' : 'Pausado'}
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-100">
                    Próximos Eventos (Preview do Google)
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Eventos do Google Calendar que ainda serão convertidos em tarefas (nos próximos
                    12 meses).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <Select
                    value={seasonalBoardFilter}
                    onValueChange={(val) => {
                      setSeasonalBoardFilter(val)
                      setSeasonalColumnFilter('all')
                      setSeasonalPage(1)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os quadros" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os quadros</SelectItem>
                      {boards.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={seasonalColumnFilter}
                    onValueChange={(val) => {
                      setSeasonalColumnFilter(val)
                      setSeasonalPage(1)
                    }}
                    disabled={seasonalBoardFilter === 'all'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as colunas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as colunas</SelectItem>
                      {columns
                        .filter((c) => c.board_id === seasonalBoardFilter)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={seasonalMonthFilter}
                    onValueChange={(val) => {
                      setSeasonalMonthFilter(val)
                      setSeasonalPage(1)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os meses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os meses</SelectItem>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-hidden border border-white/10 rounded-lg bg-white/5 w-full">
                  <div className="overflow-x-auto w-full">
                    <Table className="min-w-[800px]">
                      <TableHeader className="bg-white/5 border-b border-white/10">
                        <TableRow className="border-b border-white/10">
                          <TableHead>Evento</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Destino</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedUpcomingEvents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                              {' '}
                              Nenhum evento sazonal futuro encontrado.
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedUpcomingEvents.map((ev) => {
                            const convertedCard = eventCards.find(
                              (c) => c.google_event_id === ev.id,
                            )
                            return (
                              <TableRow key={ev.id}>
                                <TableCell>
                                  <div className="font-medium truncate max-w-[200px] sm:max-w-[300px]">
                                    {ev.title}
                                  </div>
                                  <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[200px]">
                                    {ev.id}
                                  </div>
                                </TableCell>
                                <TableCell>{format(new Date(ev.date), 'dd/MM/yyyy')}</TableCell>
                                <TableCell>
                                  {ev.board_name} → {ev.column_name}
                                </TableCell>
                                <TableCell className="text-right">
                                  {convertedCard ? (
                                    <div className="flex justify-end">
                                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1.5 rounded flex items-center w-max gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Convertido
                                      </span>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      onClick={() => handleIgnoreEvent(ev.id, ev.sync_id)}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" /> Ignorar
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {seasonalTotalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-white/5">
                      <div className="text-sm text-gray-400 font-medium">
                        Página {seasonalPage} de {seasonalTotalPages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSeasonalPage((p) => Math.max(1, p - 1))}
                          disabled={seasonalPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSeasonalPage((p) => Math.min(seasonalTotalPages, p + 1))
                          }
                          disabled={seasonalPage === seasonalTotalPages}
                        >
                          Próxima <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <CreateSeasonalDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        boards={boards}
        columns={columns}
        onSuccess={fetchData}
      />
      <MoveSelectedDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        boards={boards}
        columns={columns}
        selectedIds={selectedIds}
        onSuccess={fetchData}
      />

      <Dialog open={!!editingCardId} onOpenChange={(o) => !o && setEditingCardId(null)}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0 flex flex-col overflow-hidden bg-[#0b0f17]/95 backdrop-blur-xl border-white/10 sm:border">
          <div className="flex-1 min-h-0 overflow-y-auto">
            {editingCardData && editingBoardData && (
              <CardDetail
                card={editingCardData}
                board={editingBoardData}
                columns={columns.filter((c) => c.board_id === editingBoardData.id)}
                onChange={fetchData}
                onClose={() => setEditingCardId(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#0b0f17]/95 backdrop-blur-xl border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} tarefas sazonais?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados associados a essas tarefas serão
              removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent className="bg-[#0b0f17]/95 backdrop-blur-xl border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa sazonal?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados desta tarefa serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSingleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
