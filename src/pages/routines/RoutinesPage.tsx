import { useState, useEffect } from 'react'
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
import { Edit2, Copy, Archive, Trash2, Repeat, History, Activity } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CardDetail } from '@/components/cards/CardDetail'
import { CreateRoutineDialog } from './CreateRoutineDialog'
import { format } from 'date-fns'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle2, XCircle } from 'lucide-react'

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

  const [routines, setRoutines] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [boards, setBoards] = useState<any[]>([])
  const [columns, setColumns] = useState<any[]>([])

  const [clientFilter, setClientFilter] = useState('all')
  const [userFilter, setUserFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my')

  const [createOpen, setCreateOpen] = useState(false)
  const [cloneData, setCloneData] = useState<any>(null)

  const [editCardId, setEditCardId] = useState<string | null>(null)
  const [editCardData, setEditCardData] = useState<any>(null)
  const [editBoardData, setEditBoardData] = useState<any>(null)

  const [historyCard, setHistoryCard] = useState<any>(null)

  const fetchData = async () => {
    try {
      const [rRes, cRes, uRes, bRes, colRes] = await Promise.all([
        pb.collection('cards').getFullList({
          filter: 'is_recurring = true && archived = false && approval_status != "rejected"',
          expand: 'board_id.client_id, column_id, card_members_via_card_id.user_id, created_by',
          sort: '-created',
        }),
        pb.collection('clients').getFullList({ sort: 'name' }),
        pb.collection('users').getFullList({ sort: 'name' }),
        pb.collection('boards').getFullList({ expand: 'members' }),
        pb.collection('columns').getFullList({ sort: 'sort_order' }),
      ])
      setRoutines(rRes)
      setClients(cRes)
      setUsers(uRes)
      setBoards(bRes)
      setColumns(colRes)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const activeRoutines = routines.filter(
    (r) => r.approval_status === 'active' || !r.approval_status,
  )
  const pendingRoutines = routines.filter((r) => r.approval_status === 'pending_approval')

  const filteredRoutines = activeRoutines.filter((r) => {
    if (viewMode === 'my') {
      const memberIds = r.expand?.card_members_via_card_id?.map((m: any) => m.user_id) || []
      if (!memberIds.includes(user?.id)) return false
    }

    if (clientFilter !== 'all') {
      const cid = r.expand?.board_id?.client_id || 'internal'
      if (cid !== clientFilter) return false
    }
    if (userFilter !== 'all') {
      const memberIds = r.expand?.card_members_via_card_id?.map((m: any) => m.user_id) || []
      if (!memberIds.includes(userFilter)) return false
    }
    return true
  })

  const togglePause = async (card: any) => {
    try {
      await pb.collection('cards').update(card.id, { is_paused: !card.is_paused })
      toast({ title: card.is_paused ? 'Rotina reativada' : 'Rotina pausada' })
      fetchData()
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
      fetchData()
    } catch (err) {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const handleDelete = async (card: any) => {
    if (
      !confirm(
        'Excluir esta rotina permanentemente? Isso removerá o cartão base e todas as dependências.',
      )
    )
      return
    try {
      await pb.collection('cards').delete(card.id)
      toast({ title: 'Rotina excluída' })
      fetchData()
    } catch (err) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const handleApprove = async (card: any) => {
    try {
      await pb.collection('cards').update(card.id, { approval_status: 'active' })
      toast({ title: 'Rotina aprovada e ativada com sucesso!' })
      fetchData()
    } catch (err) {
      toast({ title: 'Erro ao aprovar', variant: 'destructive' })
    }
  }

  const handleReject = async (card: any) => {
    if (!confirm('Deseja rejeitar esta sugestão de rotina?')) return
    try {
      await pb.collection('cards').update(card.id, { approval_status: 'rejected' })
      toast({ title: 'Sugestão rejeitada' })
      fetchData()
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
    fetchData()
  }

  const renderDays = (days: number[]) => {
    if (!days || days.length === 0) return 'Nenhum'
    if (days.length === 7) return 'Todos os dias'
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Dias Úteis'
    return days.map((d) => DAYS[d]).join(', ')
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
            <Repeat className="w-8 h-8 text-primary" />
            Rotinas Diárias
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie tarefas recorrentes centralizadas em um só lugar.
          </p>
        </div>
        <Button
          onClick={() => {
            setCloneData(null)
            setCreateOpen(true)
          }}
          className="shadow-md"
        >
          {canManage ? 'Nova Rotina' : 'Sugerir Rotina'}
        </Button>
      </div>

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
                  <Button variant="outline" size="sm" onClick={() => openEdit(r)} className="h-8">
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

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="space-y-1.5 flex-1">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Filtrar por Cliente
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
        <div className="space-y-1.5 flex-1">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
            Filtrar por Membro
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
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
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
            {filteredRoutines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Nenhuma rotina encontrada com os filtros atuais.
                </TableCell>
              </TableRow>
            ) : (
              filteredRoutines.map((r) => (
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
                                    ? pb.files.getURL(m.expand.user_id, m.expand.user_id.avatar)
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
                      <span className="text-sm font-medium">{renderDays(r.recurrence_days)}</span>
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

      <CreateRoutineDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={fetchData}
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
          <div className="flex-1 min-h-0">
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
    </div>
  )
}
