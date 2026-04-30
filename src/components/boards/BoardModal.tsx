import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { getUsers } from '@/services/users'
import { createBoard, updateBoard } from '@/services/boards'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'

interface BoardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  board?: any
  onSuccess: () => void
}

export function BoardModal({ open, onOpenChange, board, onSuccess }: BoardModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [clientName, setClientName] = useState('')
  const [color, setColor] = useState('#FFC300')
  const [members, setMembers] = useState<string[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (open) {
      getUsers().then(setUsers)
      if (board) {
        setName(board.name || '')
        setDescription(board.description || '')
        setClientName(board.client_name || '')
        setColor(board.color || '#FFC300')
        setMembers(board.members || [])
      } else {
        setName('')
        setDescription('')
        setClientName('')
        setColor('#FFC300')
        setMembers([])
      }
    }
  }, [open, board])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const data = { name, description, client_name: clientName, color, members }
      if (board) {
        await updateBoard(board.id, data)
        toast({ title: 'Quadro atualizado com sucesso' })
      } else {
        await createBoard(data)
        toast({ title: 'Quadro criado com sucesso' })
      }
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Erro ao salvar quadro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const toggleMember = (userId: string) => {
    setMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{board ? 'Editar Quadro' : 'Novo Quadro'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client">Cliente</Label>
            <Input id="client" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Descrição</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-primary' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          {isAdmin && (
            <div className="space-y-2">
              <Label>Membros</Label>
              <div className="max-h-32 overflow-y-auto space-y-1 border rounded-md p-2">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={members.includes(u.id)}
                      onChange={() => toggleMember(u.id)}
                    />
                    {u.name} ({u.email})
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
