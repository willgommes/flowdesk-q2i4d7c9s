import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Plus, Paperclip, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
]

export function CreateRoutineDialog({
  open,
  onOpenChange,
  onSuccess,
  boards,
  columns,
  clients,
  users,
  initialData,
}: any) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('internal')
  const [boardId, setBoardId] = useState('')
  const [columnId, setColumnId] = useState('')
  const [description, setDescription] = useState('')
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [time, setTime] = useState('09:00')
  const [members, setMembers] = useState<string[]>([])

  const [checklist, setChecklist] = useState<string[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')

  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (initialData) {
        setTitle(initialData.title + ' (Cópia)')
        const b = boards.find((x: any) => x.id === initialData.board_id)
        setClientId(b?.client_id || 'internal')
        setBoardId(initialData.board_id)
        setColumnId(initialData.column_id)
        setDescription(initialData.description || '')
        setDays(initialData.recurrence_days || [1, 2, 3, 4, 5])
        setTime(initialData.recurrence_time || '09:00')
        setMembers(initialData.expand?.card_members_via_card_id?.map((m: any) => m.user_id) || [])
        setChecklist(
          initialData.expand?.checklist_items_via_card_id
            ?.sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((c: any) => c.text) || [],
        )
        setFiles([])
      } else {
        setTitle('')
        setClientId('internal')
        setBoardId('')
        setColumnId('')
        setDescription('')
        setDays([1, 2, 3, 4, 5])
        setTime('09:00')
        setMembers([])
        setChecklist([])
        setFiles([])
      }
    }
  }, [open, initialData, boards])

  const filteredBoards = boards.filter((b: any) => {
    if (clientId === 'internal') return !b.client_id
    return b.client_id === clientId
  })

  const filteredColumns = columns.filter((c: any) => c.board_id === boardId)

  const toggleDay = (day: number) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()))
  }

  const toggleMember = (uid: string) => {
    setMembers((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]))
  }

  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return
    setChecklist([...checklist, newChecklistItem.trim()])
    setNewChecklistItem('')
  }

  const removeChecklistItem = (idx: number) => {
    setChecklist((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !boardId || !columnId || days.length === 0) {
      toast({
        title: 'Preencha os campos obrigatórios e selecione pelo menos um dia.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const card = await pb.collection('cards').create({
        title,
        description,
        board_id: boardId,
        column_id: columnId,
        is_recurring: true,
        recurrence_days: days,
        recurrence_time: time,
        is_paused: false,
        created_by: user.id,
      })

      await Promise.all(
        members.map((uid) =>
          pb.collection('card_members').create({ card_id: card.id, user_id: uid }),
        ),
      )

      await Promise.all(
        checklist.map((text, idx) =>
          pb.collection('checklist_items').create({ card_id: card.id, text, sort_order: idx }),
        ),
      )

      for (const file of files) {
        const fd = new FormData()
        fd.append('card_id', card.id)
        fd.append('file', file)
        fd.append('name', file.name)
        fd.append('type', file.type)
        fd.append('size', file.size.toString())
        fd.append('user_id', user.id)
        await pb.collection('attachments').create(fd)
      }

      toast({ title: 'Rotina criada com sucesso!' })
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Erro ao criar rotina', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>{initialData ? 'Duplicar Rotina' : 'Nova Rotina'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1">
          <form id="routine-form" onSubmit={handleSubmit} className="p-6 space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">1. Estrutura e Localização</h3>

              <div className="space-y-2">
                <Label>
                  Título da Rotina <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Relatório Semanal de Desempenho"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>
                    Cliente <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={clientId}
                    onValueChange={(val) => {
                      setClientId(val)
                      setBoardId('')
                      setColumnId('')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Interno (Sem Cliente)</SelectItem>
                      {clients.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    Quadro <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={boardId}
                    onValueChange={(val) => {
                      setBoardId(val)
                      setColumnId('')
                    }}
                    disabled={!clientId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredBoards.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    Coluna Inicial <span className="text-destructive">*</span>
                  </Label>
                  <Select value={columnId} onValueChange={setColumnId} disabled={!boardId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredColumns.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">2. Agendamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>
                    Dias de Execução <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        className={`w-10 h-10 rounded-full text-xs font-semibold flex items-center justify-center transition-colors ${
                          days.includes(d.value)
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>
                    Horário <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Horário limite ou alvo para conclusão no dia.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">3. Detalhes e Atribuição</h3>

              <div className="space-y-2">
                <Label>Membros Responsáveis</Label>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto grid grid-cols-2 gap-2 bg-muted/20">
                  {users.map((u: any) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-3 p-1.5 hover:bg-muted/50 rounded-md cursor-pointer"
                    >
                      <Checkbox
                        checked={members.includes(u.id)}
                        onCheckedChange={() => toggleMember(u.id)}
                      />
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={u.avatar ? pb.files.getURL(u, u.avatar) : ''} />
                        <AvatarFallback>{u.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">{u.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] resize-none"
                  placeholder="Instruções ou detalhes da rotina..."
                />
              </div>

              <div className="space-y-2">
                <Label>Checklist Inicial</Label>
                <div className="space-y-2">
                  {checklist.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-muted/30 p-2 rounded-md border"
                    >
                      <Checkbox disabled />
                      <span className="text-sm flex-1">{item}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removeChecklistItem(idx)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addChecklistItem()
                        }
                      }}
                      placeholder="Novo item..."
                      className="h-9"
                    />
                    <Button type="button" onClick={addChecklistItem} size="sm" className="h-9 px-3">
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Anexos Iniciais</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors relative">
                  <input
                    type="file"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.files) setFiles([...files, ...Array.from(e.target.files)])
                    }}
                  />
                  <Paperclip className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground font-medium">
                    Clique ou arraste arquivos para anexar
                  </p>
                </div>
                {files.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {files.map((f, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-muted/30 p-2 rounded-md border text-sm"
                      >
                        <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1 font-medium">{f.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-destructive"
                          onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </form>
        </ScrollArea>
        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="routine-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {initialData ? 'Criar Cópia' : 'Criar Rotina'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
