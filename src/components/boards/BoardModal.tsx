import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { getUsers } from '@/services/users'
import { getClients } from '@/services/clients'
import { createBoard, updateBoard } from '@/services/boards'
import { getBoardCalendarSync } from '@/services/calendar_sync'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  const [clientId, setClientId] = useState<string>('none')
  const [color, setColor] = useState('#FFC300')
  const [members, setMembers] = useState<string[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [syncData, setSyncData] = useState<any>(null)

  useEffect(() => {
    if (open) {
      getUsers().then(setUsers)
      getClients('active').then(setClients)
      if (board) {
        setName(board.name || '')
        setDescription(board.description || '')
        setClientId(board.client_id || 'none')
        setColor(board.color || '#FFC300')
        setMembers(board.members || [])
      } else {
        setName('')
        setDescription('')
        setClientId('none')
        setColor('#FFC300')
        setMembers([])
        setSyncData(null)
      }

      if (board?.id) {
        getBoardCalendarSync(board.id).then(setSyncData)
      }
    }
  }, [open, board])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const data: any = { name, description, color, members }
      if (clientId && clientId !== 'none') {
        data.client_id = clientId
        data.client_name = ''
      } else {
        data.client_id = null
      }
      if (board) {
        await updateBoard(board.id, data)
        toast({ title: 'Quadro atualizado com sucesso' })
      } else {
        await createBoard(data)
        toast({ title: 'Quadro criado com sucesso e colunas padrão configuradas' })
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
      <DialogContent className="sm:max-w-[425px] bg-white/10 backdrop-blur-xl border border-white/10 text-gray-100">
        <DialogHeader>
          <DialogTitle>{board ? 'Editar Quadro' : 'Novo Quadro'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-lg border border-white/30 bg-white/10 text-gray-100 backdrop-blur focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="rounded-lg border border-white/30 bg-white/10 text-gray-100 backdrop-blur focus:outline-none focus:ring-2 focus:ring-emerald-400/50">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Descrição</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-lg border border-white/30 bg-white/10 text-gray-100 backdrop-blur focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  const form = e.currentTarget.closest('form')
                  if (form) form.requestSubmit()
                }
              }}
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

          {board && syncData && (
            <div className="space-y-2 pt-4 border-t">
              <Label>Sincronização Google Calendar</Label>
              <div className="text-sm text-gray-400 flex flex-col gap-1">
                <span>Status: {syncData.is_active ? '🟢 Ativa' : '🔴 Inativa'}</span>
                <span>
                  Última sinc:{' '}
                  {syncData.last_synced_at
                    ? new Date(syncData.last_synced_at).toLocaleString()
                    : 'Nunca'}
                </span>
                <span className="truncate" title={syncData.calendar_id}>
                  Calendário: {syncData.calendar_id}
                </span>
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
