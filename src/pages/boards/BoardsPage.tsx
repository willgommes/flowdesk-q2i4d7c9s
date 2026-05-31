import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  LayoutTemplate,
  ListTodo,
  Briefcase,
  MoreHorizontal,
  Archive,
  Trash2,
  ArchiveRestore,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getBoards, updateBoard, deleteBoard } from '@/services/boards'
import { getClients } from '@/services/clients'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BoardModal } from '@/components/boards/BoardModal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function BoardsPage() {
  const { user } = useAuth()
  const [boards, setBoards] = useState<any[]>([])
  const [cardCounts, setCardCounts] = useState<
    Record<string, { total: number; completed: number }>
  >({})
  const [archived, setArchived] = useState(false)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('all')
  const [boardToDelete, setBoardToDelete] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const navigate = useNavigate()

  const loadBoards = async () => {
    try {
      setLoading(true)
      const clientsData = await getClients()
      setClients(clientsData.filter((c) => c.status !== 'archived'))
    } catch (err) {
      console.error(err)
    }

    try {
      const data = await getBoards(archived)
      setBoards(data)

      const counts: Record<string, { total: number; completed: number }> = {}
      await Promise.all(
        data.map(async (board) => {
          try {
            const [resTotal, resCompleted] = await Promise.all([
              pb.collection('cards').getList(1, 1, {
                filter: `board_id = '${board.id}' && archived = false`,
                fields: 'id',
              }),
              pb.collection('cards').getList(1, 1, {
                filter: `board_id = '${board.id}' && completed = true && archived = false`,
                fields: 'id',
              }),
            ])
            counts[board.id] = { total: resTotal.totalItems, completed: resCompleted.totalItems }
          } catch {
            counts[board.id] = { total: 0, completed: 0 }
          }
        }),
      )
      setCardCounts(counts)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBoards()
  }, [archived])

  useRealtime('boards', () => {
    loadBoards()
  })

  useRealtime('cards', () => {
    loadBoards()
  })

  const filteredBoards = boards.filter((b) => {
    const matchSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.expand?.client_id?.name?.toLowerCase().includes(search.toLowerCase())

    const matchClient = selectedClient === 'all' || b.client_id === selectedClient

    return matchSearch && matchClient
  })

  const isAdmin = user?.role === 'admin'

  const toggleArchiveBoard = async (board: any) => {
    try {
      await updateBoard(board.id, { archived: !board.archived })
      toast.success(`Quadro ${board.archived ? 'desarquivado' : 'arquivado'} com sucesso.`)
      loadBoards()
    } catch (err: any) {
      toast.error('Erro ao atualizar o quadro: ' + err.message)
    }
  }

  const handleDeleteBoard = async () => {
    if (!boardToDelete) return
    setIsDeleting(true)
    try {
      await deleteBoard(boardToDelete.id)
      toast.success('Quadro excluído com sucesso.')
      setBoardToDelete(null)
      loadBoards()
    } catch (err: any) {
      toast.error('Erro ao excluir o quadro: ' + err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-screen">
      <AppHeader />
      <div className="p-8 max-w-6xl mx-auto w-full flex-1">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-semibold tracking-tight text-gray-100">
              Quadros
            </h1>
            <p className="text-gray-400">Gerencie seus projetos e processos.</p>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Switch id="archived" checked={archived} onCheckedChange={setArchived} />
                <Label htmlFor="archived" className="text-sm">
                  Ver Arquivados
                </Label>
              </div>
            )}
            {isAdmin && (
              <Button onClick={() => setModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Novo Quadro
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <SelectValue placeholder="Filtrar por cliente" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white/5 backdrop-blur-md rounded-lg border border-white/10 border-dashed animate-fade-in">
            <LayoutTemplate className="w-16 h-16 text-gray-400 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2 text-gray-100">Nenhum quadro encontrado</h3>
            <p className="text-gray-400 max-w-sm mb-4">
              {search
                ? 'Tente buscar com outros termos.'
                : 'Crie seu primeiro quadro para começar a organizar seus projetos.'}
            </p>
            {isAdmin && !search && (
              <Button onClick={() => setModalOpen(true)}>Criar primeiro quadro</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
            {filteredBoards.map((board) => (
              <Card
                key={board.id}
                onClick={() => navigate(`/boards/${board.id}`)}
                className="h-full flex flex-col border-border/60 hover-scale shadow-subtle transition-all cursor-pointer overflow-hidden group relative"
              >
                <CardHeader className="pb-4 shrink-0">
                  <div className="flex justify-between items-start w-full">
                    <div className="flex-1 min-w-0 pr-4">
                      <CardTitle className="flex items-start gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0 mt-1.5"
                          style={{ backgroundColor: board.color || '#FFC300' }}
                        />
                        <span className="break-words whitespace-normal leading-tight">
                          {board.name}
                        </span>
                      </CardTitle>
                      {(board.client_name || board.expand?.client_id) && (
                        <CardDescription className="mt-2 font-medium text-gray-400 break-words whitespace-normal flex items-center gap-1.5">
                          {board.expand?.client_id?.logo && (
                            <img
                              src={pb.files.getURL(
                                board.expand.client_id,
                                board.expand.client_id.logo,
                              )}
                              alt=""
                              className="w-4 h-4 object-contain rounded-sm"
                            />
                          )}
                          <span className="truncate">
                            {board.expand?.client_id?.name || board.client_name}
                          </span>
                        </CardDescription>
                      )}
                    </div>
                    <div
                      className="shrink-0 flex items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 data-[state=open]:opacity-100"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toggleArchiveBoard(board)}>
                            {board.archived ? (
                              <ArchiveRestore className="w-4 h-4 mr-2" />
                            ) : (
                              <Archive className="w-4 h-4 mr-2" />
                            )}
                            {board.archived ? 'Desarquivar' : 'Arquivar'}
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                onClick={() => setBoardToDelete(board)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1">
                  <p className="text-sm text-gray-400 line-clamp-2 mb-4 break-words whitespace-normal">
                    {board.description || 'Sem descrição'}
                  </p>
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-1.5 font-medium">
                        <ListTodo className="w-3.5 h-3.5" />
                        <span>
                          {cardCounts[board.id] === undefined
                            ? '...'
                            : `${cardCounts[board.id].completed}/${cardCounts[board.id].total} tarefas concluídas`}
                        </span>
                      </div>
                      {cardCounts[board.id] !== undefined && cardCounts[board.id].total > 0 && (
                        <span>
                          {Math.round(
                            (cardCounts[board.id].completed / cardCounts[board.id].total) * 100,
                          )}
                          %
                        </span>
                      )}
                    </div>
                    {cardCounts[board.id] !== undefined && cardCounts[board.id].total > 0 && (
                      <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(cardCounts[board.id].completed / cardCounts[board.id].total) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex -space-x-2">
                      {board.expand?.members?.map((m: any) => (
                        <Avatar key={m.id} className="w-8 h-8 border-2 border-background">
                          <AvatarImage src={m.avatar ? pb.files.getURL(m, m.avatar) : ''} />
                          <AvatarFallback className="text-xs bg-primary/10">
                            {m.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">
                      {board.updated
                        ? formatDistanceToNow(new Date(board.updated), {
                            addSuffix: true,
                            locale: ptBR,
                          })
                        : ''}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <BoardModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={loadBoards} />

        <AlertDialog
          open={!!boardToDelete}
          onOpenChange={(open) => !open && !isDeleting && setBoardToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir quadro?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o quadro <strong>{boardToDelete?.name}</strong>? Esta
                ação é irreversível e excluirá todas as colunas, cartões e anexos associados a ele.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleDeleteBoard()
                }}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
