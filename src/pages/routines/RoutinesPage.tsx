import { useState, useEffect, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Edit2,
  Copy,
  Archive,
  Trash2,
  Repeat,
  History,
  Activity,
  Search,
  Info,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { CardDetail } from '@/components/cards/CardDetail'
import { CreateRoutineDialog } from './CreateRoutineDialog'
import { format } from 'date-fns'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function ExecutionHistoryDialog({ card, open, onOpenChange }: any) {
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    if (open && card) {
      pb.collection('activity_logs')
        .getFullList({
          filter: `card_id = '${card.id}' && action_type = 'completion'`,
          sort: '-created',
          expand: 'user_id',
        })
        .then(setLogs)
        .catch(console.error)
    }
  }, [open, card])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> Histórico de Conclusões
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <Activity className="w-8 h-8 opacity-20" />
              <p>Nenhuma conclusão registrada nos últimos 30 dias.</p>
            </div>
          ) : (
            logs.map((l) => (
              <div
                key={l.id}
                className="flex gap-3 items-center text-sm border p-3 rounded-lg bg-muted/20"
              >
                <Avatar className="w-8 h-8 border shadow-sm">
                  <AvatarImage
                    src={
                      l.expand?.user_id?.avatar
                        ? pb.files.getURL(l.expand.user_id, l.expand.user_id.avatar)
                        : ''
                    }
                  />
                  <AvatarFallback className="text-xs">
                    {l.expand?.user_id?.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">{l.expand?.user_id?.name}</span>
                  <span className="text-muted-foreground text-xs">
                    Marcou como concluído em {format(new Date(l.created), 'dd/MM/yyyy HH:mm')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function RoutinesPage() {
  const { toast } = useToast()
  const { user } = useAuth()

  const canManage = user?.role === 'admin' || user?.can_manage_routines

  const [clients, setClients] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [boards, setBoards] = useState<any[]>([])
  const [columns, setColumns] = useState<any[]>([])

  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [eventCards, setEventCards] = useState<any[]>([])

  const [pendingRoutines, setPendingRoutines] = useState<any[]>([])

  const [routines, setRoutines] = useState<any[]>([])
  const [routinePage, setRoutinePage] = useState(1)
  const [routineTotalPages, setRoutineTotalPages] = useState(1)
  const [routineTotalItems, setRoutineTotalItems] = useState(0)

  const [syncs, setSyncs] = useState<any[]>([])
  const [syncPage, setSyncPage] = useState(1)
  const [syncTotalPages, setSyncTotalPages] = useState(1)
  const [syncTotalItems, setSyncTotalItems] = useState(0)

  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [clientFilter, setClientFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [dailyBoardFilter, setDailyBoardFilter] = useState('all')
  const [dailyStatusFilter, setDailyStatusFilter] = useState('all')

  const [seasonalBoardFilter, setSeasonalBoardFilter] = useState('all')
  const [seasonalColumnFilter, setSeasonalColumnFilter] = useState('all')
  const [seasonalPage, setSeasonalPage] = useState(1)

  const [viewMode, setViewMode] = useState<'my' | 'all'>('my')

  const [createOpen, setCreateOpen] = useState(false)
  const [cloneData, setCloneData] = useState<any>(null)

  const [editCardId, setEditCardId] = useState<string | null>(null)
  const [editCardData, setEditCardData] = useState<any>(null)
  const [editBoardData, setEditBoardData] = useState<any>(null)

  const [historyCard, setHistoryCard] = useState<any>(null)
  const [deleteCard, setDeleteCard] = useState<any>(null)

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
    }, 400)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const fetchMetadata = useCallback(async () => {
    try {
      const [cRes, uRes, bRes, colRes, evRes, ecRes] = await Promise.all([
        pb.collection('clients').getFullList({ sort: 'name' }),
        pb.collection('users').getFullList({ sort: 'name' }),
        pb.collection('boards').getFullList({ expand: 'members' }),
        pb.collection('columns').getFullList({ sort: 'sort_order' }),
        pb.send('/backend/v1/google-calendar/upcoming', { method: 'GET' }).catch(() => []),
        pb
          .collection('cards')
          .getFullList({ filter: "google_event_id != ''", fields: 'id,google_event_id,board_id' })
          .catch(() => []),
      ])
      setClients(cRes)
      setUsers(uRes)
      setBoards(bRes)
      setColumns(colRes)
      setUpcomingEvents(evRes)
      setEventCards(ecRes || [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchPending = useCallback(async () => {
    if (!canManage) return
    try {
      const res = await pb.collection('cards').getFullList({
        filter: 'is_recurring = true && archived = false && approval_status = "pending_approval"',
        expand: 'board_id.client_id, column_id, card_members_via_card_id.user_id, created_by',
        sort: '-created',
      })
      setPendingRoutines(res)
    } catch (err) {
      console.error(err)
    }
  }, [canManage])

  const fetchRoutines = useCallback(async () => {
    try {
      const filters = [
        'is_recurring = true',
        'archived = false',
        '(approval_status = "active" || approval_status = "")',
      ]

      if (viewMode === 'my' && user?.id) {
        filters.push(`card_members_via_card_id.user_id ?= "${user.id}"`)
      }
      if (clientFilter !== 'all') {
        if (clientFilter === 'internal') {
          filters.push(`board_id.client_id = ""`)
        } else {
          filters.push(`board_id.client_id = "${clientFilter}"`)
        }
      }
      if (userFilter !== 'all') {
        filters.push(`card_members_via_card_id.user_id ?= "${userFilter}"`)
      }
      if (dailyBoardFilter !== 'all') {
        filters.push(`board_id = "${dailyBoardFilter}"`)
      }
      if (dailyStatusFilter === 'active') {
        filters.push(`is_paused = false`)
      } else if (dailyStatusFilter === 'paused') {
        filters.push(`is_paused = true`)
      }
      if (debouncedSearch) {
        const safeSearch = debouncedSearch.replace(/"/g, '\\"')
        filters.push(`(title ~ "${safeSearch}" || description ~ "${safeSearch}")`)
      }

      const res = await pb.collection('cards').getList(routinePage, 30, {
        filter: filters.join(' && '),
        expand: 'board_id.client_id, column_id, card_members_via_card_id.user_id, created_by',
        sort: '-created',
      })

      setRoutines(res.items)
      setRoutineTotalPages(res.totalPages)
      setRoutineTotalItems(res.totalItems)
    } catch (err) {
      console.error(err)
    }
  }, [
    routinePage,
    viewMode,
    clientFilter,
    userFilter,
    dailyBoardFilter,
    dailyStatusFilter,
    debouncedSearch,
    user?.id,
  ])

  const fetchSyncs = useCallback(async () => {
    try {
      let filterStr = ''
      if (debouncedSearch) {
        const safeSearch = debouncedSearch.replace(/"/g, '\\"')
        filterStr = `calendar_id ~ "${safeSearch}" || board_id.name ~ "${safeSearch}"`
      }
      const res = await pb.collection('calendar_sync').getList(syncPage, 30, {
        filter: filterStr,
        expand: 'board_id, target_column_id',
        sort: '-created',
      })
      setSyncs(res.items)
      setSyncTotalPages(res.totalPages)
      setSyncTotalItems(res.totalItems)
    } catch (err) {
      console.error(err)
    }
  }, [syncPage, debouncedSearch])

  // Initial loads
  useEffect(() => {
    fetchMetadata()
  }, [fetchMetadata])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  // Data loads mapped to dependencies
  useEffect(() => {
    fetchRoutines()
  }, [fetchRoutines])

  useEffect(() => {
    fetchSyncs()
  }, [fetchSyncs])

  // Reset pages on filter changes
  useEffect(() => {
    setRoutinePage(1)
  }, [viewMode, clientFilter, userFilter, dailyBoardFilter, dailyStatusFilter, debouncedSearch])

  useEffect(() => {
    setSyncPage(1)
  }, [debouncedSearch])

  const filteredUpcomingEvents = upcomingEvents.filter((ev) => {
    if (seasonalBoardFilter !== 'all') {
      const b = boards.find((x) => x.id === seasonalBoardFilter)
      if (b && ev.board_name !== b.name) return false
    }
    if (seasonalColumnFilter !== 'all') {
      const c = columns.find((x) => x.id === seasonalColumnFilter)
      if (c && ev.column_name !== c.name) return false
    }
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase()
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

  const handleActionSuccess = () => {
    fetchRoutines()
    fetchPending()
  }

  const togglePause = async (card: any) => {
    try {
      await pb.collection('cards').update(card.id, { is_paused: !card.is_paused })
      toast({ title: card.is_paused ? 'Rotina reativada' : 'Rotina pausada' })
      handleActionSuccess()
    } catch (err) {
      toast({ title: 'Erro ao alterar status', variant: 'destructive' })
    }
  }

  const handleArchive = async (card: any) => {
    if (
      !confirm(
        'Deseja arquivar esta rotina? Ela deixará de aparecer aqui e não gerará novas tarefas.',
      )
    )
      return
    try {
      await pb.collection('cards').update(card.id, { archived: true })
      toast({ title: 'Rotina arquivada' })
      handleActionSuccess()
    } catch (err) {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const handleDelete = (card: any) => {
    setDeleteCard(card)
  }

  const confirmDelete = async () => {
    if (!deleteCard) return
    const idToDelete = deleteCard.id
    setDeleteCard(null)

    try {
      await pb.collection('cards').delete(idToDelete)
      toast({ title: 'Rotina excluída com sucesso' })
      handleActionSuccess()
    } catch (err: any) {
      console.error(err)
      toast({ title: 'Erro ao excluir a rotina', description: err.message, variant: 'destructive' })
    }
  }

  const handleApprove = async (card: any) => {
    try {
      await pb.collection('cards').update(card.id, { approval_status: 'active' })
      toast({ title: 'Rotina aprovada e ativada com sucesso!' })
      handleActionSuccess()
    } catch (err) {
      toast({ title: 'Erro ao aprovar', variant: 'destructive' })
    }
  }

  const handleReject = async (card: any) => {
    if (!confirm('Deseja rejeitar esta sugestão de rotina?')) return
    try {
      await pb.collection('cards').update(card.id, { approval_status: 'rejected' })
      toast({ title: 'Sugestão rejeitada' })
      handleActionSuccess()
    } catch (err) {
      toast({ title: 'Erro ao rejeitar', variant: 'destructive' })
    }
  }

  const handleClone = async (card: any) => {
    const fullCard = await pb.collection('cards').getOne(card.id, {
      expand: 'card_members_via_card_id, checklist_items_via_card_id',
    })
    setCloneData(fullCard)
    setCreateOpen(true)
  }

  const openEdit = async (card: any) => {
    const b = boards.find((x) => x.id === card.board_id)
    if (!b) return
    const fullCard = await pb.collection('cards').getOne(card.id, {
      expand:
        'card_labels_via_card_id.label_id, card_members_via_card_id.user_id, checklist_items_via_card_id, comments_via_card_id.user_id, attachments_via_card_id',
    })
    setEditBoardData(b)
    setEditCardData(fullCard)
    setEditCardId(card.id)
  }

  const handleEditChange = async () => {
    if (editCardId) {
      const fullCard = await pb.collection('cards').getOne(editCardId, {
        expand:
          'card_labels_via_card_id.label_id, card_members_via_card_id.user_id, checklist_items_via_card_id, comments_via_card_id.user_id, attachments_via_card_id',
      })
      setEditCardData(fullCard)
    }
    fetchRoutines()
  }

  const handleUpdateSyncColumn = async (syncId: string, columnId: string) => {
    try {
      await pb.collection('calendar_sync').update(syncId, { target_column_id: columnId })
      toast({ title: 'Coluna de destino atualizada' })
      fetchSyncs()
    } catch (err) {
      toast({ title: 'Erro ao atualizar coluna', variant: 'destructive' })
    }
  }

  const handleToggleSyncActive = async (syncId: string, isActive: boolean) => {
    try {
      await pb.collection('calendar_sync').update(syncId, { is_active: isActive })
      toast({ title: isActive ? 'Sincronização ativada' : 'Sincronização pausada' })
      fetchSyncs()
    } catch (err) {
      toast({ title: 'Erro ao alterar status', variant: 'destructive' })
    }
  }

  const handleForceSync = async (syncId: string) => {
    try {
      toast({
        title: 'Iniciando sincronização...',
        description: 'Buscando eventos sazonais na janela de 7 dias.',
      })
      await pb.send('/backend/v1/google-calendar/sync', {
        method: 'POST',
        body: JSON.stringify({ sync_id: syncId }),
      })
      toast({ title: 'Sincronização concluída com sucesso!' })
      fetchMetadata() // To refresh upcoming events and cards
    } catch (err: any) {
      toast({ title: 'Erro na sincronização', description: err.message, variant: 'destructive' })
    }
  }

  const handleIgnoreEvent = async (eventId: string, syncId: string) => {
    if (!confirm('Deseja ignorar este evento? Ele não será convertido em cartão no futuro.')) return
    try {
      await pb.collection('ignored_google_events').create({
        google_event_id: eventId,
        sync_id: syncId,
      })
      toast({ title: 'Evento ignorado com sucesso' })
      fetchMetadata()
    } catch (err: any) {
      toast({ title: 'Erro ao ignorar', description: err.message, variant: 'destructive' })
    }
  }

  const renderDays = (days: number[]) => {
    if (!days || days.length === 0) return 'Nenhum'
    if (days.length === 7) return 'Todos os dias'
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Dias Úteis'
    return days.map((d) => DAYS[d]).join(', ')
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
            <Repeat className="w-8 h-8 text-primary" />
            Rotinas e Sazonais
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie tarefas recorrentes e eventos anuais sazonais.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar rotinas ou eventos..."
              className="w-full pl-8 bg-background shadow-sm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setSeasonalPage(1)
              }}
            />
          </div>
          <Button
            onClick={() => {
              setCloneData(null)
              setCreateOpen(true)
            }}
            className="shadow-md w-full sm:w-auto"
          >
            {canManage ? 'Nova Rotina' : 'Sugerir Rotina'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="recorrentes" className="w-full space-y-6">
        <TabsList className="bg-muted/50 border">
          <TabsTrigger value="recorrentes">Recorrentes (Diárias/Semanais)</TabsTrigger>
          <TabsTrigger value="sazonais">Sazonais (Eventos Google)</TabsTrigger>
        </TabsList>

        <TabsContent value="recorrentes" className="space-y-6 m-0">
          {canManage && pendingRoutines.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 shadow-sm">
              <h3 className="text-amber-800 dark:text-amber-400 font-semibold mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Sugestões Pendentes de Aprovação ({pendingRoutines.length})
              </h3>
              <div className="space-y-3">
                {pendingRoutines.map((r) => (
                  <div
                    key={r.id}
                    className="bg-background border rounded-lg p-3 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        {r.title}
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase tracking-wider font-bold">
                          Sugerido por: {r.expand?.created_by?.name || 'Usuário'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {r.expand?.board_id?.name} •{' '}
                        {r.description?.replace(/<[^>]*>?/gm, '') || 'Sem descrição'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(r)}
                        className="h-8"
                      >
                        Ver Detalhes
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(r)}
                        className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Aprovar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(r)}
                        className="h-8"
                      >
                        <XCircle className="w-4 h-4 mr-1.5" /> Rejeitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {canManage && (
            <div className="flex items-center justify-between bg-card p-2 rounded-xl border shadow-sm">
              <Tabs
                value={viewMode}
                onValueChange={(v) => setViewMode(v as 'my' | 'all')}
                className="w-full sm:w-auto"
              >
                <TabsList>
                  <TabsTrigger value="my">Minhas Rotinas</TabsTrigger>
                  <TabsTrigger value="all">Todas as Rotinas</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-card p-4 rounded-xl border shadow-sm">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Cliente
              </Label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  <SelectItem value="internal">Interno (Sem Cliente)</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Membro
              </Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
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
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Quadro
              </Label>
              <Select value={dailyBoardFilter} onValueChange={setDailyBoardFilter}>
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
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Status
              </Label>
              <Select value={dailyStatusFilter} onValueChange={setDailyStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="paused">Pausados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-card rounded-xl border shadow-sm overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[30%]">Rotina</TableHead>
                    <TableHead>Quadro / Cliente</TableHead>
                    <TableHead>Membros</TableHead>
                    <TableHead>Recorrência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {routines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        Nenhuma rotina encontrada com os filtros atuais.
                      </TableCell>
                    </TableRow>
                  ) : (
                    routines.map((r) => (
                      <TableRow key={r.id} className="group hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-semibold text-foreground">{r.title}</div>
                          {r.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px] mt-0.5">
                              {r.description.replace(/<[^>]*>?/gm, '')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{r.expand?.board_id?.name}</span>
                            <span className="text-xs text-muted-foreground opacity-80">
                              {r.expand?.board_id?.expand?.client_id?.name ||
                                r.expand?.board_id?.client_name ||
                                'Interno'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex -space-x-2">
                            {r.expand?.card_members_via_card_id?.map((m: any) => (
                              <Tooltip key={m.id}>
                                <TooltipTrigger asChild>
                                  <Avatar className="w-8 h-8 border-2 border-background shadow-sm hover:z-10 transition-transform">
                                    <AvatarImage
                                      src={
                                        m.expand?.user_id?.avatar
                                          ? pb.files.getURL(
                                              m.expand.user_id,
                                              m.expand.user_id.avatar,
                                            )
                                          : ''
                                      }
                                    />
                                    <AvatarFallback className="text-[10px]">
                                      {m.expand?.user_id?.name?.[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>{m.expand?.user_id?.name}</TooltipContent>
                              </Tooltip>
                            ))}
                            {!r.expand?.card_members_via_card_id && (
                              <span className="text-xs text-muted-foreground italic">Nenhum</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {renderDays(r.recurrence_days)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              às {r.recurrence_time || '23:59'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={!r.is_paused}
                              disabled={!canManage}
                              onCheckedChange={() => togglePause(r)}
                            />
                            <span
                              className={`text-xs font-bold uppercase tracking-wider ${!r.is_paused ? 'text-primary' : 'text-muted-foreground'}`}
                            >
                              {!r.is_paused ? 'Ativo' : 'Pausado'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setHistoryCard(r)}
                                  className="h-8 w-8 text-blue-500 hover:bg-blue-50"
                                >
                                  <History className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Histórico</TooltipContent>
                            </Tooltip>
                            {canManage && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleClone(r)}
                                      className="h-8 w-8 text-indigo-500 hover:bg-indigo-50"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Duplicar</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEdit(r)}
                                      className="h-8 w-8 text-amber-500 hover:bg-amber-50"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleArchive(r)}
                                      className="h-8 w-8 text-orange-500 hover:bg-orange-50"
                                    >
                                      <Archive className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Arquivar</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDelete(r)}
                                      className="h-8 w-8 text-red-500 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Excluir</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {routineTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                <div className="text-sm text-muted-foreground font-medium">
                  Página {routinePage} de {routineTotalPages} (Total: {routineTotalItems})
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRoutinePage((p) => Math.max(1, p - 1))}
                    disabled={routinePage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRoutinePage((p) => Math.min(routineTotalPages, p + 1))}
                    disabled={routinePage === routineTotalPages}
                  >
                    Próxima <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sazonais" className="space-y-6 m-0">
          <div className="bg-card rounded-xl border shadow-sm p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                Eventos Anuais (Sazonais)
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Integrações ativas com o Google Calendar. Eventos são transformados em cartões
                automaticamente <strong>7 dias antes</strong> da data marcada.
              </p>
            </div>

            <div className="overflow-hidden border rounded-lg bg-card w-full">
              <div className="overflow-x-auto w-full">
                <Table className="min-w-[900px]">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[35%]">Calendário</TableHead>
                      <TableHead>Quadro de Destino</TableHead>
                      <TableHead>Coluna de Destino</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          Nenhuma sincronização de calendário configurada. Acesse um Quadro para
                          adicionar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      syncs.map((sync) => {
                        const boardColumns = columns.filter((c) => c.board_id === sync.board_id)

                        return (
                          <TableRow key={sync.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 cursor-help max-w-[200px] sm:max-w-[300px]">
                                      <span className="font-medium truncate block w-full">
                                        {sync.calendar_id}
                                      </span>
                                      <Info className="w-4 h-4 text-muted-foreground shrink-0" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="max-w-[300px] break-all">{sync.calendar_id}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              {sync.last_synced_at && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Última sync:{' '}
                                  {format(new Date(sync.last_synced_at), 'dd/MM/yyyy HH:mm')}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{sync.expand?.board_id?.name || 'Desconhecido'}</TableCell>
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
                                  onCheckedChange={(val) => handleToggleSyncActive(sync.id, val)}
                                />
                                <span
                                  className={`text-xs font-bold uppercase tracking-wider ${sync.is_active ? 'text-primary' : 'text-muted-foreground'}`}
                                >
                                  {sync.is_active ? 'Ativo' : 'Pausado'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!canManage || !sync.is_active}
                                onClick={() => handleForceSync(sync.id)}
                              >
                                <Repeat className="w-3.5 h-3.5 mr-2" />
                                Sincronizar
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {syncTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                  <div className="text-sm text-muted-foreground font-medium">
                    Página {syncPage} de {syncTotalPages} (Total: {syncTotalItems})
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSyncPage((p) => Math.max(1, p - 1))}
                      disabled={syncPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSyncPage((p) => Math.min(syncTotalPages, p + 1))}
                      disabled={syncPage === syncTotalPages}
                    >
                      Próxima <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-10 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  Próximos Eventos (Preview)
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Lista completa dos eventos sincronizados para o ano. Eles serão convertidos em
                  cartões automaticamente 7 dias antes da data.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-card p-4 rounded-xl border shadow-sm mb-6">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Quadro de Destino
                </Label>
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
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Coluna de Destino
                </Label>
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
              </div>
            </div>

            <div className="overflow-hidden border rounded-lg bg-card w-full">
              <div className="overflow-x-auto w-full">
                <Table className="min-w-[800px]">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Quadro de Destino</TableHead>
                      <TableHead>Coluna de Destino</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUpcomingEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhum evento sazonal futuro encontrado com os filtros atuais.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUpcomingEvents.map((ev) => {
                        const convertedCard = eventCards.find((c) => c.google_event_id === ev.id)
                        return (
                          <TableRow key={ev.id}>
                            <TableCell>
                              <div className="font-medium truncate max-w-[200px] sm:max-w-[300px]">
                                {ev.title}
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-[10px] text-muted-foreground truncate max-w-[150px] cursor-help block mt-0.5">
                                    ID: {ev.id}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="max-w-[300px] break-all">{ev.id}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>{format(new Date(ev.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{ev.board_name}</TableCell>
                            <TableCell>{ev.column_name}</TableCell>
                            <TableCell className="text-right">
                              {convertedCard ? (
                                <div className="flex justify-end">
                                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1.5 rounded flex items-center w-max gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Convertido
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
                <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                  <div className="text-sm text-muted-foreground font-medium">
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
                      onClick={() => setSeasonalPage((p) => Math.min(seasonalTotalPages, p + 1))}
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

      <CreateRoutineDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleActionSuccess}
        boards={boards}
        columns={columns}
        clients={clients}
        users={users}
        initialData={cloneData}
      />

      <Dialog
        open={!!editCardId}
        onOpenChange={(o) => {
          if (!o) {
            setEditCardId(null)
            setEditCardData(null)
            setEditBoardData(null)
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] p-0 flex flex-col overflow-hidden bg-background">
          <DialogHeader className="p-4 border-b bg-muted/10 shrink-0">
            <DialogTitle>Editar Rotina</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {editCardData && editBoardData && (
              <CardDetail
                card={editCardData}
                board={editBoardData}
                columns={columns.filter((c) => c.board_id === editBoardData.id)}
                onChange={handleEditChange}
                onClose={() => setEditCardId(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ExecutionHistoryDialog
        card={historyCard}
        open={!!historyCard}
        onOpenChange={(o: boolean) => {
          if (!o) setHistoryCard(null)
        }}
      />

      <AlertDialog open={!!deleteCard} onOpenChange={(o) => !o && setDeleteCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir esta rotina?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso removerá o cartão base e todas as dependências
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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
