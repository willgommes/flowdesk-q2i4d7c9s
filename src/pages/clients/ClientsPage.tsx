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
  FileImage,
} from 'lucide-react'
import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getClients, deleteClient } from '@/services/clients'
import { ClientModal } from '@/components/clients/ClientModal'
import { ClientIdentitySheet } from '@/components/clients/ClientIdentitySheet'
import { DocumentPreviewModal } from '@/components/clients/DocumentPreviewModal'
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

  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetClient, setSheetClient] = useState<any>(null)

  const [previewUrl, setPreviewUrl] = useState('')
  const [previewFilename, setPreviewFilename] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  const [fileSearch, setFileSearch] = useState('')

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
      const arr = Array.isArray(client.contract) ? client.contract : [client.contract]
      return arr.map((filename: string) => ({
        clientId: client.id,
        clientName: client.name,
        filename,
        updated: client.updated,
        client,
      }))
    })
  }, [clients])

  const brandAssetsList = useMemo(() => {
    return clients.flatMap((client) => {
      if (!client.brand_assets) return []
      const arr = Array.isArray(client.brand_assets) ? client.brand_assets : [client.brand_assets]
      return arr.map((filename: string) => ({
        clientId: client.id,
        clientName: client.name,
        filename,
        updated: client.updated,
        client,
      }))
    })
  }, [clients])

  const filteredContracts = useMemo(() => {
    return contractsList.filter(
      (c) =>
        c.clientName.toLowerCase().includes(fileSearch.toLowerCase()) ||
        c.filename.toLowerCase().includes(fileSearch.toLowerCase()),
    )
  }, [contractsList, fileSearch])

  const filteredBrandAssets = useMemo(() => {
    return brandAssetsList.filter(
      (c) =>
        c.clientName.toLowerCase().includes(fileSearch.toLowerCase()) ||
        c.filename.toLowerCase().includes(fileSearch.toLowerCase()),
    )
  }, [brandAssetsList, fileSearch])

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

  const openSheet = (client: any) => {
    setSheetClient(client)
    setSheetOpen(true)
  }

  const openPreview = (url: string, filename: string) => {
    setPreviewUrl(url)
    setPreviewFilename(filename)
    setPreviewOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20'
      case 'expired':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20'
      case 'signed':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
      case 'pending_signature':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Em Vigência'
      case 'expired':
        return 'Expirado'
      case 'signed':
        return 'Assinado'
      case 'pending_signature':
        return 'Aguardando Assinatura'
      default:
        return 'Desconhecido'
    }
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#0b0f17]">
      <AppHeader />
      <div className="p-8 max-w-6xl mx-auto w-full flex-1">
        <Tabs defaultValue="clientes" className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-display font-semibold tracking-tight text-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Briefcase className="w-5 h-5 text-emerald-500" />
                </div>
                Clientes
              </h1>
              <p className="text-gray-400 mt-2">
                Gerencie os perfis, identidades visuais e contratos dos clientes.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              <TabsList className="grid w-full sm:w-auto grid-cols-3">
                <TabsTrigger value="clientes">Clientes</TabsTrigger>
                <TabsTrigger value="brand_assets">Ativos da Marca</TabsTrigger>
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
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 backdrop-blur-md rounded-xl border border-white/10 border-dashed shadow-sm animate-fade-in-up">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 border border-white/10">
                  <Briefcase className="w-8 h-8 text-gray-400 opacity-50" />
                </div>
                <h3 className="text-lg font-medium mb-2 text-gray-100">
                  Nenhum cliente cadastrado
                </h3>
                <p className="text-gray-400 max-w-sm mb-6">
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
                    className="overflow-hidden border-white/10 hover-scale shadow-subtle transition-all cursor-pointer group bg-white/10 backdrop-blur-xl"
                    onClick={() => openSheet(client)}
                  >
                    <CardHeader className="pb-4 relative bg-white/5 border-b border-white/10 group-hover:bg-white/10 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 shadow-sm shrink-0 overflow-hidden">
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
                            <CardDescription className="mt-1.5 flex flex-wrap gap-1">
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
                              {client.contract_status && (
                                <Badge
                                  className={`font-medium text-[10px] ${getStatusColor(client.contract_status)}`}
                                  variant="outline"
                                >
                                  {getStatusLabel(client.contract_status)}
                                </Badge>
                              )}
                            </CardDescription>
                          </div>
                        </div>

                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-3 top-3 h-8 w-8 text-muted-foreground z-10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEdit(client)
                                }}
                              >
                                <Pencil className="w-4 h-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDelete(client.id)
                                }}
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
                            <p className="text-[11px] uppercase tracking-wider text-gray-400 mb-2 font-semibold">
                              Paleta
                            </p>
                            <div className="flex gap-1.5">
                              {client.palette.slice(0, 6).map((color: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="w-5 h-5 rounded border border-white/10 shadow-sm"
                                  style={{ backgroundColor: color.hex }}
                                  title={`${color.name} - ${color.hex}`}
                                />
                              ))}
                              {client.palette.length > 6 && (
                                <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[9px] border border-white/10 shadow-sm font-medium text-gray-300">
                                  +{client.palette.length - 6}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span className="font-medium flex items-center gap-1.5">
                              <FileText className="w-3 h-3" />
                              {Array.isArray(client.contract)
                                ? client.contract.length
                                : client.contract
                                  ? 1
                                  : 0}{' '}
                              Contratos
                            </span>
                            <span className="font-medium flex items-center gap-1.5">
                              <FileImage className="w-3 h-3" />
                              {Array.isArray(client.brand_assets)
                                ? client.brand_assets.length
                                : client.brand_assets
                                  ? 1
                                  : 0}{' '}
                              Ativos
                            </span>
                          </div>

                          {clientStats[client.id] && (
                            <div className="flex flex-col gap-2 mt-2">
                              <div className="flex items-center justify-between text-xs text-gray-400">
                                <span className="font-medium">Quadros Ativos</span>
                                <Badge
                                  variant="outline"
                                  className="px-1.5 py-0 text-[10px] font-semibold bg-white/10 border-white/20 text-gray-300"
                                >
                                  {clientStats[client.id].activeBoards}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-400">
                                <span className="font-medium">Progresso das Tarefas</span>
                                <span>
                                  {clientStats[client.id].total > 0
                                    ? `${clientStats[client.id].completed}/${clientStats[client.id].total}`
                                    : '0/0'}
                                </span>
                              </div>
                              {clientStats[client.id].total > 0 && (
                                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
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
          </TabsContent>

          <TabsContent value="brand_assets" className="mt-0 animate-fade-in-up">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-sm overflow-hidden text-gray-100">
              <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5">
                <h3 className="font-medium text-gray-100">Repositório de Ativos da Marca</h3>
                <div className="relative max-w-md w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar arquivo ou cliente..."
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10"
                  />
                </div>
              </div>
              <div className="p-6">
                {filteredBrandAssets.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    Nenhum ativo de marca encontrado.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {filteredBrandAssets.map((asset, i) => {
                      const isImg = asset.filename.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i)
                      return (
                        <div
                          key={i}
                          className="group border border-white/10 rounded-lg overflow-hidden bg-white/5 hover:border-emerald-500/50 transition-all flex flex-col shadow-sm"
                        >
                          <div
                            className="aspect-square bg-white/5 flex items-center justify-center p-4 border-b border-white/10 group-hover:bg-white/10 transition-colors cursor-pointer relative"
                            onClick={(e) => {
                              e.preventDefault()
                              openPreview(
                                pb.files.getURL(asset.client, asset.filename),
                                asset.filename,
                              )
                            }}
                          >
                            {isImg ? (
                              <img
                                src={pb.files.getURL(asset.client, asset.filename)}
                                alt={asset.filename}
                                className="max-w-full max-h-full object-contain"
                              />
                            ) : (
                              <FileImage className="w-12 h-12 text-gray-400/50" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button variant="secondary" size="sm" className="pointer-events-none">
                                Visualizar
                              </Button>
                            </div>
                          </div>
                          <div className="p-3 bg-white/5 relative z-10 flex flex-col justify-between h-full">
                            <div>
                              <p
                                className="text-xs font-medium truncate text-gray-100"
                                title={asset.filename}
                              >
                                {asset.filename}
                              </p>
                              <p className="text-[10px] text-gray-400 truncate mt-0.5">
                                {asset.clientName}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contratos" className="mt-0 animate-fade-in-up">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl shadow-sm overflow-hidden text-gray-100">
              <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5">
                <h3 className="font-medium">Repositório Global de Contratos</h3>
                <div className="relative max-w-md w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar contrato ou cliente..."
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    className="pl-9 bg-white/5 border-white/10"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-white/10 bg-white/5">
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
                          <div className="flex items-center gap-2 text-gray-400">
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
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openPreview(pb.files.getURL(c.client, c.filename), c.filename)
                              }
                            >
                              Visualizar
                            </Button>
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredContracts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12 text-gray-400">
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

        <ClientIdentitySheet open={sheetOpen} onOpenChange={setSheetOpen} client={sheetClient} />
        <DocumentPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          url={previewUrl}
          filename={previewFilename}
        />
      </div>
    </div>
  )
}
