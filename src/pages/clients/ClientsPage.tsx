import { useEffect, useState, useMemo } from 'react'
import {
  Plus,
  Briefcase,
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  FileText,
  Download,
} from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'

export default function ClientsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [clients, setClients] = useState<any[]>([])
  const [clientStats, setClientStats] = useState<
    Record<string, { total: number; completed: number; activeBoards: number }>
  >({})
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [contractSearch, setContractSearch] = useState('')

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

      const stats: Record<string, { total: number; completed: number; activeBoards: number }> = {}
      data.forEach((c) => {
        stats[c.id] = { total: 0, completed: 0, activeBoards: 0 }
      })

      const boardToClient: Record<string, string> = {}
      boards.forEach((b) => {
        if (b.client_id) {
          boardToClient[b.id] = b.client_id
          if (stats[b.client_id]) {
            stats[b.client_id].activeBoards += 1
          }
        }
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

  const contractsList = useMemo(() => {
    return clients.flatMap((client) => {
      if (!client.contract) return []
      return client.contract.map((filename: string) => ({
        clientId: client.id,
        clientName: client.name,
        filename,
        updated: client.updated,
        client,
      }))
    })
  }, [clients])

  const filteredContracts = useMemo(() => {
    return contractsList.filter((c) =>
      c.clientName.toLowerCase().includes(contractSearch.toLowerCase()),
    )
  }, [contractsList, contractSearch])

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
        <Tabs defaultValue="clientes" className="w-full">
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              <TabsList className="grid w-full sm:w-auto grid-cols-2">
                <TabsTrigger value="clientes">Clientes</TabsTrigger>
                <TabsTrigger value="contratos">Contratos</TabsTrigger>
              </TabsList>
              {isAdmin && (
                <Button onClick={openNew} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" /> Novo Cliente
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="clientes" className="mt-0">
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
                  Crie o primeiro cliente para gerenciar seus ativos e atribuir aos quadros de
                  projeto.
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
                            <CardTitle
                              className="text-base truncate leading-tight"
                              title={client.name}
                            >
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
                            <div className="flex flex-col gap-2 mt-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="font-medium">Quadros Ativos</span>
                                <Badge
                                  variant="secondary"
                                  className="px-1.5 py-0 text-[10px] font-semibold"
                                >
                                  {clientStats[client.id].activeBoards}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="font-medium">Progresso das Tarefas</span>
                                <span>
                                  {clientStats[client.id].total > 0
                                    ? `${clientStats[client.id].completed}/${clientStats[client.id].total}`
                                    : '0/0'}
                                </span>
                              </div>
                              {clientStats[client.id].total > 0 && (
                                <Progress
                                  value={
                                    (clientStats[client.id].completed /
                                      clientStats[client.id].total) *
                                    100
                                  }
                                  className="h-1.5"
                                />
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
          </TabsContent>

          <TabsContent value="contratos" className="mt-0 animate-fade-in-up">
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/20">
                <h3 className="font-medium">Repositório Global de Contratos</h3>
                <div className="relative max-w-md w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar contrato por cliente..."
                    value={contractSearch}
                    onChange={(e) => setContractSearch(e.target.value)}
                    className="pl-9 bg-background"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Data de Upload</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{c.clientName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="w-4 h-4 shrink-0" />
                            <span
                              className="truncate max-w-[200px] sm:max-w-[300px]"
                              title={c.filename}
                            >
                              {c.filename}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(c.updated).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={pb.files.getURL(c.client, c.filename)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="w-4 h-4 sm:mr-2" />
                              <span className="hidden sm:inline">Baixar</span>
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredContracts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                          Nenhum contrato encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

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
