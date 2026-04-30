import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, LayoutTemplate } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getBoards } from '@/services/boards'
import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BoardModal } from '@/components/boards/BoardModal'
import pb from '@/lib/pocketbase/client'

export default function BoardsPage() {
  const { user } = useAuth()
  const [boards, setBoards] = useState<any[]>([])
  const [archived, setArchived] = useState(false)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadBoards = async () => {
    try {
      const data = await getBoards(archived)
      setBoards(data)
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

  const filteredBoards = boards.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.client_name?.toLowerCase().includes(search.toLowerCase()),
  )

  const isAdmin = user?.role === 'admin'

  return (
    <div className="flex flex-col h-full min-h-screen">
      <AppHeader />
      <div className="p-8 max-w-6xl mx-auto w-full flex-1">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-semibold tracking-tight text-foreground">
              Quadros
            </h1>
            <p className="text-muted-foreground">Gerencie seus projetos e processos.</p>
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

        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-lg border border-dashed animate-fade-in">
            <LayoutTemplate className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Nenhum quadro encontrado</h3>
            <p className="text-muted-foreground max-w-sm mb-4">
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
              <Link to={`/boards/${board.id}`} key={board.id}>
                <Card className="h-full border-border/60 hover-scale shadow-subtle transition-all cursor-pointer">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: board.color || '#FFC300' }}
                          />
                          <span className="truncate">{board.name}</span>
                        </CardTitle>
                        {board.client_name && (
                          <CardDescription className="mt-1 font-medium text-foreground/70 truncate">
                            {board.client_name}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                      {board.description || 'Sem descrição'}
                    </p>
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
                      <span className="text-xs text-muted-foreground">
                        {new Date(board.updated).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <BoardModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={loadBoards} />
      </div>
    </div>
  )
}
