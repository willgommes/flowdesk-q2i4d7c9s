import { useState, useEffect } from 'react'
import {
  LayoutTemplate,
  Tag,
  Users,
  CheckSquare,
  Paperclip,
  MessageSquare,
  Activity,
  Trash2,
  Clock,
  ArrowRightLeft,
  Copy,
  Archive,
  Play,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Checklist } from './Checklist'
import { Comments } from './Comments'
import { ActivityLog } from './ActivityLog'

const LABEL_COLORS = [
  '#10b981',
  '#3b82f6',
  '#ef4444',
  '#f97316',
  '#ec4899',
  '#06b6d4',
  '#6b7280',
  '#8b5cf6',
  '#6366f1',
  '#14b8a6',
]

export function CardDetail({ card, board, columns = [], onChange, onClose }: any) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')

  const handleTitleBlur = async () => {
    if (title !== card.title) {
      await pb.collection('cards').update(card.id, { title })
      await logAct('edit_title', `Alterou o título para "${title}"`)
      onChange()
    }
  }

  const handleDescBlur = async () => {
    if (description !== card.description) {
      await pb.collection('cards').update(card.id, { description })
      await logAct('edit_desc', 'Atualizou a descrição')
      onChange()
    }
  }

  const logAct = async (type: string, desc: string, targetCardId: string = card.id) => {
    await pb.collection('activity_logs').create({
      card_id: targetCardId,
      user_id: user.id,
      action_type: type,
      description: desc,
    })
  }

  const handleQuickMove = async (action: 'in_progress' | 'done') => {
    const targetColName = action === 'in_progress' ? 'Em Andamento' : 'Concluído'
    const targetCol = columns.find((c: any) => c.name.toLowerCase() === targetColName.toLowerCase())

    const completed = action === 'done'
    const updates: any = { completed }

    if (targetCol) {
      updates.column_id = targetCol.id
    }

    await pb.collection('cards').update(card.id, updates)

    if (action === 'done') {
      await logAct('completion', 'Marcou o cartão como concluído')
    } else {
      await logAct('move', 'Moveu o cartão para Em Andamento')
    }

    if (targetCol) {
      toast({ title: `Cartão movido para ${targetColName}` })
    } else {
      toast({
        title: `Coluna "${targetColName}" não encontrada. Status atualizado.`,
        variant: 'destructive',
      })
    }
    onChange()
  }

  const toggleComplete = async () => {
    const willBeCompleted = !card.completed

    const targetColName = willBeCompleted ? 'Concluído' : 'Em Andamento'
    const targetCol = columns.find((c: any) => c.name.toLowerCase() === targetColName.toLowerCase())

    const updates: any = { completed: willBeCompleted }
    if (targetCol) updates.column_id = targetCol.id

    await pb.collection('cards').update(card.id, updates)
    await logAct(
      'completion',
      `Marcou o cartão como ${willBeCompleted ? 'concluído' : 'não concluído'}`,
    )

    if (targetCol) {
      toast({ title: `Cartão movido para ${targetColName}` })
    } else if (willBeCompleted) {
      toast({ title: 'Cartão marcado como concluído' })
    } else {
      toast({ title: 'Cartão reaberto' })
    }
    onChange()
  }

  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('card_id', card.id)
    formData.append('file', file)
    formData.append('name', file.name)
    formData.append('type', file.type)
    formData.append('size', file.size.toString())
    formData.append('user_id', user.id)
    await pb.collection('attachments').create(formData)
    await logAct('attachment_add', `Anexou o arquivo ${file.name}`)
    onChange()
  }

  const handleDelete = async () => {
    if (!confirm('Excluir este cartão permanentemente?')) return
    await pb.collection('cards').delete(card.id)
    onClose()
  }

  const handleDuplicate = async () => {
    try {
      const newCard = await pb.collection('cards').create({
        board_id: card.board_id,
        column_id: card.column_id,
        title: `${card.title} (Cópia)`,
        description: card.description,
        due_date: card.due_date,
        sort_order: card.sort_order + 1,
        created_by: user.id,
        completed: false,
      })
      await logAct('creation', `Duplicou o cartão ${card.title}`, newCard.id)
      onChange()
    } catch (err) {
      console.error(err)
    }
  }

  const handleArchive = async () => {
    if (!confirm('Deseja arquivar este cartão? Ele não aparecerá mais no quadro.')) return
    await pb.collection('cards').update(card.id, { archived: true })
    await logAct('move', 'Arquivou o cartão')
    onClose()
  }

  const labels = card.expand?.card_labels_via_card_id || []
  const members = card.expand?.card_members_via_card_id || []
  const checklist = card.expand?.checklist_items_via_card_id || []
  const comments = card.expand?.comments_via_card_id || []
  const attachments = card.expand?.attachments_via_card_id || []

  const [boardLabels, setBoardLabels] = useState([])
  useEffect(() => {
    pb.collection('labels')
      .getFullList({ filter: `board_id='${board.id}'` })
      .then(setBoardLabels as any)
  }, [board.id])

  const toggleLabel = async (label: any) => {
    const existing = labels.find((cl: any) => cl.label_id === label.id)
    if (existing) {
      await pb.collection('card_labels').delete(existing.id)
      await logAct('label_remove', `Removeu a etiqueta "${label.name}"`)
    } else {
      await pb.collection('card_labels').create({ card_id: card.id, label_id: label.id })
      await logAct('label_add', `Adicionou a etiqueta "${label.name}"`)
    }
    onChange()
  }

  const createLabel = async (name: string, color: string) => {
    const l = await pb.collection('labels').create({ board_id: board.id, name, color })
    await pb.collection('card_labels').create({ card_id: card.id, label_id: l.id })
    const nb = await pb.collection('labels').getFullList({ filter: `board_id='${board.id}'` })
    setBoardLabels(nb as any)
    await logAct('label_add', `Criou e adicionou a etiqueta "${name}"`)
    onChange()
  }

  return (
    <div className="flex h-auto md:h-full md:max-h-full flex-col md:flex-row md:overflow-hidden">
      <div className="flex-1 md:overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8 bg-background">
        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground gap-2 font-medium">
            <LayoutTemplate className="w-4 h-4" />
            <span>{board.name}</span>
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className={`text-2xl font-bold border-none shadow-none px-0 focus-visible:ring-0 h-auto ${card.completed ? 'line-through text-muted-foreground' : ''}`}
          />
        </div>

        {labels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {labels.map(
              (cl: any) =>
                cl.expand?.label_id && (
                  <div
                    key={cl.id}
                    className="px-3 py-1 rounded-md text-xs font-medium text-white flex items-center shadow-sm"
                    style={{ backgroundColor: cl.expand.label_id.color }}
                  >
                    {cl.expand.label_id.name}
                  </div>
                ),
            )}
          </div>
        )}

        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-muted-foreground" /> Descrição
          </h3>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescBlur}
            className="min-h-[120px] resize-none"
            placeholder="Adicione uma descrição mais detalhada usando texto ou markdown..."
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-muted-foreground" /> Checklist
          </h3>
          <Checklist cardId={card.id} items={checklist} onChange={onChange} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-muted-foreground" /> Anexos
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Adicionar Anexo
            </Button>
            <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} />
          </div>
          {attachments.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {attachments.map((a: any) => (
                <a
                  key={a.id}
                  href={pb.files.getURL(a, a.file)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col border rounded-lg overflow-hidden group hover:border-primary shadow-sm transition-all hover:shadow-md"
                >
                  <div className="bg-muted/50 h-24 flex items-center justify-center relative">
                    {a.type?.includes('image') ? (
                      <img
                        src={pb.files.getURL(a, a.file)}
                        className="object-cover w-full h-full"
                        alt={a.name}
                      />
                    ) : (
                      <Paperclip className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="p-2 text-xs truncate font-medium bg-background">{a.name}</div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground border-2 border-dashed p-6 text-center rounded-lg">
              Nenhum anexo neste cartão.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-muted-foreground" /> Atividades
          </h3>
          <ActivityLog cardId={card.id} />
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-muted-foreground" /> Comentários
          </h3>
          <Comments cardId={card.id} comments={comments} onChange={onChange} />
        </div>
      </div>

      <div className="w-full md:w-[280px] shrink-0 bg-muted/20 p-4 md:p-6 space-y-6 border-t md:border-t-0 md:border-l border-border md:overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">
          <Button
            variant={card.completed ? 'outline' : 'default'}
            className="w-full justify-start font-semibold shadow-sm"
            onClick={toggleComplete}
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            {card.completed ? 'Reabrir Cartão' : 'Marcar como Concluído'}
          </Button>

          {!card.completed && (
            <Button
              variant="outline"
              className="w-full justify-start font-semibold shadow-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={() => handleQuickMove('in_progress')}
            >
              <Play className="w-4 h-4 mr-2 fill-current" />
              Em Andamento
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Adicionar ao cartão
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  className="w-full justify-start bg-secondary/40 hover:bg-secondary border border-transparent hover:border-border"
                >
                  <Users className="w-4 h-4 mr-2" /> Membros
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <h4 className="font-semibold text-sm mb-3">Membros do Quadro</h4>
                <div className="space-y-1">
                  {board.expand?.members?.map((m: any) => {
                    const isAssigned = members.some((cm: any) => cm.user_id === m.id)
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted p-2 rounded-md transition-colors"
                        onClick={async () => {
                          if (isAssigned) {
                            const cm = members.find((x: any) => x.user_id === m.id)
                            await pb.collection('card_members').delete(cm.id)
                            await logAct('assignment_remove', `Removeu ${m.name} do cartão`)
                          } else {
                            await pb
                              .collection('card_members')
                              .create({ card_id: card.id, user_id: m.id })
                            await logAct('assignment_add', `Atribuiu ${m.name} ao cartão`)
                          }
                          onChange()
                        }}
                      >
                        <Checkbox checked={isAssigned} readOnly />
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-[10px]">{m.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm flex-1 truncate font-medium">{m.name}</span>
                      </div>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  className="w-full justify-start bg-secondary/40 hover:bg-secondary border border-transparent hover:border-border"
                >
                  <Tag className="w-4 h-4 mr-2" /> Etiquetas
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <h4 className="font-semibold text-sm mb-3">Etiquetas</h4>
                <div className="space-y-1 max-h-48 overflow-auto mb-3">
                  {boardLabels.map((l: any) => {
                    const isActive = labels.some((cl: any) => cl.label_id === l.id)
                    return (
                      <div
                        key={l.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1.5 rounded-md transition-colors"
                        onClick={() => toggleLabel(l)}
                      >
                        <Checkbox checked={isActive} readOnly />
                        <div
                          className="flex-1 px-2 py-1 rounded-md text-xs font-medium text-white shadow-sm"
                          style={{ backgroundColor: l.color }}
                        >
                          {l.name}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const data = new FormData(e.currentTarget)
                    createLabel(data.get('name') as string, data.get('color') as string)
                    e.currentTarget.reset()
                  }}
                  className="space-y-3 border-t pt-3 mt-2"
                >
                  <Input
                    name="name"
                    placeholder="Nova etiqueta..."
                    required
                    className="h-8 text-sm"
                  />
                  <div className="flex flex-wrap gap-1.5 justify-between">
                    {LABEL_COLORS.map((c) => (
                      <label key={c} className="cursor-pointer relative">
                        <input
                          type="radio"
                          name="color"
                          value={c}
                          required
                          className="sr-only peer"
                        />
                        <div
                          className="w-6 h-6 rounded-md shadow-sm peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-primary transition-all"
                          style={{ backgroundColor: c }}
                        />
                      </label>
                    ))}
                  </div>
                  <Button type="submit" size="sm" className="w-full h-8">
                    Criar Etiqueta
                  </Button>
                </form>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  className="w-full justify-start bg-secondary/40 hover:bg-secondary border border-transparent hover:border-border"
                >
                  <Clock className="w-4 h-4 mr-2" /> Data de Entrega
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={card.due_date ? new Date(card.due_date) : undefined}
                  onSelect={async (date) => {
                    const newDate = date ? date.toISOString() : null
                    await pb.collection('cards').update(card.id, { due_date: newDate })
                    await logAct('date_change', 'Alterou a data de entrega')
                    onChange()
                  }}
                  initialFocus
                />
                {card.due_date && (
                  <div className="p-3 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={async () => {
                        await pb.collection('cards').update(card.id, { due_date: null })
                        await logAct('date_change', 'Removeu a data de entrega')
                        onChange()
                      }}
                    >
                      Remover data
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-3 pt-2 md:pt-6">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Ações
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="secondary"
                  className="w-full justify-start bg-secondary/40 hover:bg-secondary border border-transparent hover:border-border"
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" /> Mover
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="end">
                <h4 className="font-semibold text-sm mb-3">Mover para Coluna</h4>
                <Select
                  value={card.column_id}
                  onValueChange={async (val) => {
                    if (val === card.column_id) return
                    await pb.collection('cards').update(card.id, { column_id: val })
                    await logAct('move', 'Moveu o cartão via menu de ações')
                    onChange()
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col: any) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PopoverContent>
            </Popover>

            <Button
              variant="secondary"
              className="w-full justify-start bg-secondary/40 hover:bg-secondary border border-transparent hover:border-border"
              onClick={handleDuplicate}
            >
              <Copy className="w-4 h-4 mr-2" /> Duplicar
            </Button>

            <Button
              variant="secondary"
              className="w-full justify-start bg-secondary/40 hover:bg-secondary border border-transparent hover:border-border"
              onClick={handleArchive}
            >
              <Archive className="w-4 h-4 mr-2" /> Arquivar
            </Button>

            <Button
              variant="secondary"
              className="w-full justify-start bg-destructive/10 hover:bg-destructive/20 border border-transparent hover:border-destructive/30"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2 text-destructive" />{' '}
              <span className="text-destructive font-medium">Excluir</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
