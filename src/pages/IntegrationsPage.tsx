import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Trash2, CalendarDays, ExternalLink, Calendar } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  getGoogleAuthUrl,
  getGoogleConnectionStatus,
  disconnectGoogle,
  getGoogleCalendars,
  syncGoogleCalendar,
} from '@/services/integrations'
import { getBoards } from '@/services/boards'
import { getBoardColumns } from '@/services/columns'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'

export default function IntegrationsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [syncs, setSyncs] = useState<any[]>([])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [calendars, setCalendars] = useState<any[]>([])
  const [boards, setBoards] = useState<any[]>([])
  const [columns, setColumns] = useState<any[]>([])

  const [selectedCalendar, setSelectedCalendar] = useState('')
  const [selectedBoard, setSelectedBoard] = useState('')
  const [selectedColumn, setSelectedColumn] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('users', (e) => {
    if (user && e.record.id === user.id) {
      loadData()
    }
  })

  const loadData = async () => {
    try {
      setLoading(true)
      const statusRes = await getGoogleConnectionStatus()
      setConnected(statusRes.connected)

      const syncsList = await pb.collection('calendar_sync').getFullList({
        sort: '-created',
        expand: 'board_id,target_column_id',
      })
      setSyncs(syncsList)
    } catch (err) {
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      const redirectUri = window.location.origin + '/integracoes/google/callback'
      const url = await getGoogleAuthUrl(redirectUri)
      window.location.href = url
    } catch (err) {
      toast({
        title: 'Erro ao iniciar conexão',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const handleDisconnect = async () => {
    if (
      !confirm('Deseja realmente desconectar o Google Agenda? Todos os mapeamentos serão apagados.')
    )
      return
    try {
      for (const sync of syncs) {
        await pb.collection('calendar_sync').delete(sync.id)
      }
      await disconnectGoogle()
      setConnected(false)
      setSyncs([])
      toast({ title: 'Conta desconectada e mapeamentos removidos' })
    } catch (err) {
      toast({ title: 'Erro ao desconectar', variant: 'destructive' })
    }
  }

  const handleOpenDialog = async () => {
    try {
      setSaving(true)
      const cals = await getGoogleCalendars()
      setCalendars(cals)
      const bds = await getBoards()
      setBoards(bds)

      setSelectedCalendar('')
      setSelectedBoard('')
      setSelectedColumn('')
      setColumns([])

      setDialogOpen(true)
    } catch (err) {
      const errorMsg = getErrorMessage(err)
      toast({
        title: 'Erro ao buscar agendas',
        description: errorMsg,
        variant: 'destructive',
      })
      if (
        errorMsg.includes('Not connected to Google') ||
        errorMsg.includes('refresh Google token') ||
        errorMsg.includes('No refresh token')
      ) {
        setConnected(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleBoardChange = async (boardId: string) => {
    setSelectedBoard(boardId)
    setSelectedColumn('')
    try {
      const cols = await getBoardColumns(boardId)
      setColumns(cols)
    } catch (err) {
      toast({ title: 'Erro ao carregar colunas', variant: 'destructive' })
    }
  }

  const handleSave = async () => {
    if (!selectedCalendar || !selectedBoard || !selectedColumn) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' })
      return
    }
    try {
      setSaving(true)
      await pb.collection('calendar_sync').create({
        calendar_id: selectedCalendar,
        board_id: selectedBoard,
        target_column_id: selectedColumn,
        is_active: true,
      })
      toast({ title: 'Sincronização configurada com sucesso' })
      setDialogOpen(false)
      loadData()
    } catch (err) {
      toast({
        title: 'Erro ao salvar configuração',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja remover esta configuração de sincronização?')) return
    try {
      await pb.collection('calendar_sync').delete(id)
      setSyncs((prev) => prev.filter((s) => s.id !== id))
      toast({ title: 'Configuração removida' })
    } catch (err) {
      toast({ title: 'Erro ao remover', variant: 'destructive' })
    }
  }

  const handleSyncNow = async (id: string) => {
    try {
      setSyncingId(id)
      await syncGoogleCalendar(id)
      toast({ title: `Sincronização concluída! Eventos atualizados com sucesso.` })
      loadData()
    } catch (err) {
      const errorMsg = getErrorMessage(err)
      const isAuthError =
        errorMsg.toLowerCase().includes('token') ||
        errorMsg.toLowerCase().includes('auth') ||
        errorMsg.toLowerCase().includes('credentials')
      toast({
        title: 'Erro na sincronização',
        description: isAuthError
          ? 'Sua conexão expirou. Por favor, desconecte e reconecte sua conta do Google.'
          : errorMsg,
        variant: 'destructive',
      })
      if (isAuthError) {
        setConnected(false)
      }
    } finally {
      setSyncingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-muted/10">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/10">
      <AppHeader />
      <div className="flex-1 overflow-auto p-6 md:p-8 animate-fade-in">
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Integrações</h1>
            <p className="text-muted-foreground mt-1">
              Conecte serviços externos para sincronizar dados com seus quadros.
            </p>
          </div>

          <div className="bg-background rounded-xl border border-border shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                  <CalendarDays className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Google Agenda</h2>
                  <p className="text-sm text-muted-foreground">
                    Importe seus eventos automaticamente para tarefas nos quadros.
                  </p>
                </div>
              </div>
              <div>
                {connected ? (
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                    onClick={handleDisconnect}
                  >
                    Desconectar Conta
                  </Button>
                ) : (
                  <Button onClick={handleConnect}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Conectar Google
                  </Button>
                )}
              </div>
            </div>

            {connected && (
              <div className="mt-8 border-t pt-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium">Mapeamentos Ativos</h3>
                  <Button onClick={handleOpenDialog} size="sm" disabled={saving}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Sincronização
                  </Button>
                </div>

                {syncs.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground border-2 border-dashed border-border rounded-lg bg-muted/30">
                    <Calendar className="w-10 h-10 mx-auto opacity-20 mb-3" />
                    <p className="font-medium text-foreground">
                      Nenhuma sincronização configurada.
                    </p>
                    <p className="text-sm">Clique no botão acima para mapear uma agenda.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {syncs.map((sync) => (
                      <div
                        key={sync.id}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 border rounded-lg bg-background hover:bg-muted/50 transition-colors min-w-0"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium flex items-center gap-2 text-foreground">
                            <Calendar className="w-4 h-4 text-primary shrink-0" />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="truncate cursor-help w-full max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]">
                                  {sync.calendar_id}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-[300px] break-all">{sync.calendar_id}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                            <span>
                              Quadro:{' '}
                              <span className="font-medium text-foreground">
                                {sync.expand?.board_id?.name || 'Desconhecido'}
                              </span>
                            </span>
                            <span>&rarr;</span>
                            <span>
                              Coluna:{' '}
                              <span className="font-medium text-foreground">
                                {sync.expand?.target_column_id?.name || 'Desconhecida'}
                              </span>
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                            <RefreshCw className="w-3 h-3" />
                            Última sincronização:{' '}
                            {sync.last_synced_at
                              ? new Date(sync.last_synced_at).toLocaleString('pt-BR')
                              : 'Nunca'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2 md:mt-0">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSyncNow(sync.id)}
                            disabled={syncingId === sync.id}
                            className="bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            <RefreshCw
                              className={`w-4 h-4 mr-2 ${syncingId === sync.id ? 'animate-spin' : ''}`}
                            />
                            {syncingId === sync.id ? 'Sincronizando...' : 'Sincronizar'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(sync.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[450px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>Nova Sincronização</DialogTitle>
            <DialogDescription>
              Mapeie uma agenda do Google para enviar eventos como tarefas.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="space-y-2">
              <Label>Agenda do Google</Label>
              <Select value={selectedCalendar} onValueChange={setSelectedCalendar}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a agenda" />
                </SelectTrigger>
                <SelectContent>
                  {calendars.map((cal) => (
                    <SelectItem key={cal.id} value={cal.id}>
                      {cal.summary} {cal.primary && '(Principal)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quadro de Destino</Label>
              <Select value={selectedBoard} onValueChange={handleBoardChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o quadro" />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.expand?.client_id?.name
                        ? `${board.expand.client_id.name} - ${board.name}`
                        : `Sem Cliente - ${board.name}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Coluna de Destino</Label>
              <Select
                value={selectedColumn}
                onValueChange={setSelectedColumn}
                disabled={!selectedBoard || columns.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      columns.length === 0 ? 'Selecione um quadro primeiro' : 'Selecione a coluna'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0 bg-background">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              Salvar Configuração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
