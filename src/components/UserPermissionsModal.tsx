import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { getBoards } from '@/services/boards'

interface UserPermissionsModalProps {
  user: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function UserPermissionsModal({
  user,
  open,
  onOpenChange,
  onSuccess,
}: UserPermissionsModalProps) {
  const { toast } = useToast()
  const [role, setRole] = useState('membro')
  const [canManageRoutines, setCanManageRoutines] = useState(false)
  const [briefingRequired, setBriefingRequired] = useState(true)
  const [boards, setBoards] = useState<any[]>([])
  const [selectedBoards, setSelectedBoards] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const isSelf = user?.id === pb.authStore.record?.id

  useEffect(() => {
    if (open && user) {
      setRole(user.role || 'membro')
      setCanManageRoutines(user.can_manage_routines || false)
      setBriefingRequired(user.briefing_required ?? true)
      loadBoards()
    }
  }, [open, user])

  const loadBoards = async () => {
    setIsLoading(true)
    try {
      const activeBoards = await getBoards(false)
      setBoards(activeBoards)
      const userBoards = new Set<string>()
      activeBoards.forEach((b) => {
        if (b.members?.includes(user.id)) {
          userBoards.add(b.id)
        }
      })
      setSelectedBoards(userBoards)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar os boards.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleBoard = (boardId: string, checked: boolean) => {
    const next = new Set(selectedBoards)
    if (checked) next.add(boardId)
    else next.delete(boardId)
    setSelectedBoards(next)
  }

  const handleSave = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      if (
        user.role !== role ||
        user.can_manage_routines !== canManageRoutines ||
        user.briefing_required !== briefingRequired
      ) {
        await pb.collection('users').update(user.id, {
          role,
          can_manage_routines: canManageRoutines,
          briefing_required: briefingRequired,
        })
      }

      const updatePromises = boards.map((board) => {
        const wasMember = board.members?.includes(user.id)
        const isMember = selectedBoards.has(board.id)

        if (wasMember && !isMember) {
          return pb.collection('boards').update(board.id, { 'members-': user.id })
        } else if (!wasMember && isMember) {
          return pb.collection('boards').update(board.id, { 'members+': user.id })
        }
        return Promise.resolve()
      })

      await Promise.all(updatePromises)

      toast({
        title: 'Permissões atualizadas',
        description: 'As permissões do usuário foram salvas com sucesso.',
      })
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error.message || 'Ocorreu um erro ao salvar as permissões.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Permissões: {user?.name}</DialogTitle>
          <DialogDescription>
            Ajuste o papel do usuário e gerencie o acesso aos boards.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Papel</Label>
                <Select disabled={isSelf} value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um papel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="membro">Membro</SelectItem>
                    <SelectItem value="cliente">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Gerenciar Rotinas</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite que o usuário crie e edite tarefas recorrentes.
                  </p>
                </div>
                <Switch
                  checked={role === 'admin' ? true : canManageRoutines}
                  disabled={role === 'admin'}
                  onCheckedChange={setCanManageRoutines}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label>Exigir Briefing Diário</Label>
                  <p className="text-sm text-muted-foreground">
                    Obriga o usuário a ler e confirmar o briefing todos os dias.
                  </p>
                </div>
                <Switch checked={briefingRequired} onCheckedChange={setBriefingRequired} />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Acesso aos Boards</Label>
              <ScrollArea className="h-[200px] rounded-md border p-4">
                <div className="space-y-4">
                  {boards.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum board encontrado.
                    </p>
                  ) : (
                    boards.map((board) => (
                      <div key={board.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={`board-${board.id}`}
                          checked={role === 'admin' ? true : selectedBoards.has(board.id)}
                          onCheckedChange={(checked) =>
                            handleToggleBoard(board.id, checked as boolean)
                          }
                          disabled={role === 'admin'}
                        />
                        <Label
                          htmlFor={`board-${board.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {board.name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              {role === 'admin' && (
                <p className="text-xs text-muted-foreground">
                  Admins têm acesso a todos os boards automaticamente.
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isSaving}>
              Cancelar
            </Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
