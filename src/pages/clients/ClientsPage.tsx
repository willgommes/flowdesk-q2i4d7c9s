import { useEffect, useState } from 'react'
import { Plus, Briefcase, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getClients, deleteClient } from '@/services/clients'
import { ClientModal } from '@/components/clients/ClientModal'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function ClientsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [clients, setClients] = useState<any[]>([])
  const [clientStats, setClientStats] = useState<
    Record<string, { total: number; completed: number }>
  >({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)

  const isAdmin = user?.role === 'admin'

  const loadData = async () => {
    try {
      const data = await getClients()
      setClients(data)

      const boards = await pb
        .collection('boards')
        .getFullList({ fields: 'id,client_id', filter: 'archived != true' })
      const cards = await pb
        .collection('cards')
        .getFullList({ fields: 'id,board_id,completed', filter: 'archived != true' })

      const stats: Record<string, { total: number; completed: number }> = {}
      data.forEach((c) => {
        stats[c.id] = { total: 0, completed: 0 }
      })

      const boardToClient: Record<string, string> = {}
      boards.forEach((b) => {
        if (b.client_id) boardToClient[b.id] = b.client_id
      })

      cards.forEach((card) => {
        const clientId = boardToClient[card.board_id]
        if (clientId && stats[clientId]) {
          stats[clientId].total += 1
          if (card.completed) stats[clientId].completed += 1
        }
      })

      setClientStats(stats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('boards', () => loadData())
  useRealtime('cards', () => loadData())

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este cliente?')) return
    try {
      await deleteClient(id)
      toast({ title: 'Cliente excluído com sucesso' })
      loadData()
    } catch (err) {
      toast({ title: 'Erro ao excluir', description: getErrorMessage(err), variant: 'destructive' })
    }
  }

  const openEdit = (client: any) => {
    setSelectedClient(client)
    setModalOpen(true)
  }

  const openNew = () => {
    setSelectedClient(null)
    setModalOpen(true)
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-muted/10">
      <AppHeader />
      <div className="p-8 max-w-6xl mx-auto w-full flex-1">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              Clientes
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie os perfis, identidades visuais e contratos dos clientes.
            </p>
          </div>
          {isAdmin && (
            <Button onClick={openNew}>
              <Plus className="w-4 h-4 mr-2" /> Novo Cliente
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-background rounded-xl border border-dashed shadow-sm animate-fade-in-up">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-lg font-medium mb-2">Nenhum cliente cadastrado</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Crie o primeiro cliente para gerenciar seus ativos e atribuir aos quadros de projeto.
            </p>
            {isAdmin && <Button onClick={openNew}>Adicionar Primeiro Cliente</Button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
            {clients.map((client) => (
              <Card
                key={client.id}
                className="overflow-hidden border-border/60 hover-scale shadow-subtle transition-all"
              >
                <CardHeader className="pb-4 relative bg-muted/5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center border shadow-sm shrink-0 overflow-hidden">
                        {client.logo ? (
                          <img
                            src={pb.files.getURL(client, client.logo)}
                            alt={client.name}
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Briefcase className="w-5 h-5 text-muted-foreground/50" />
                        )}
                      </div>
                      <div className="overflow-hidden pr-6">
                        <CardTitle className="text-base truncate leading-tight" title={client.name}>
                          {client.name}
                        </CardTitle>
                        <CardDescription className="mt-1.5">
                          <Badge
                            variant={
                              client.status === 'active'
                                ? 'default'
                                : client.status === 'inactive'
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className="font-medium text-[10px]"
                          >
                            {client.status === 'active'
                              ? 'Ativo'
                              : client.status === 'inactive'
                                ? 'Inativo'
                                : 'Arquivado'}
                          </Badge>
                        </CardDescription>
                      </div>
                    </div>

                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-3 top-3 h-8 w-8 text-muted-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(client)}>
                            <Pencil className="w-4 h-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(client.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {client.palette && client.palette.length > 0 && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-semibold">
                          Paleta
                        </p>
                        <div className="flex gap-1.5">
                          {client.palette.slice(0, 6).map((color: any, idx: number) => (
                            <div
                              key={idx}
                              className="w-5 h-5 rounded border shadow-sm"
                              style={{ backgroundColor: color.hex }}
                              title={`${color.name} - ${color.hex}`}
                            />
                          ))}
                          {client.palette.length > 6 && (
                            <div className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[9px] border shadow-sm font-medium">
                              +{client.palette.length - 6}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 pt-4 border-t border-border/40">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium">
                          {client.contract?.length || 0} contratos salvos
                        </span>
                      </div>

                      {clientStats[client.id] && (
                        <div className="flex flex-col gap-1.5 mt-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-medium">Progresso dos Projetos</span>
                            <span>
                              {clientStats[client.id].total > 0
                                ? `${clientStats[client.id].completed}/${clientStats[client.id].total} tarefas`
                                : '0 tarefas'}
                            </span>
                          </div>
                          {clientStats[client.id].total > 0 && (
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-primary h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${(clientStats[client.id].completed / clientStats[client.id].total) * 100}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {isAdmin && (
          <ClientModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            client={selectedClient}
            onSuccess={loadData}
          />
        )}
      </div>
    </div>
  )
}
