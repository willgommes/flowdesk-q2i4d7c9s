import { useState, useEffect, useRef } from 'react'
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
  Pencil,
  Repeat,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  ChevronDown,
  ChevronUp,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'
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

const RichTextEditor = ({ value, onChange, onBlur, minHeight = 'min-h-[120px]' }: any) => {
  const editorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorRef.current) {
      if (editorRef.current.innerHTML === '') {
        editorRef.current.innerHTML = value || ''
      }
      editorRef.current.focus()
      try {
        const range = document.createRange()
        const sel = window.getSelection()
        range.selectNodeContents(editorRef.current)
        range.collapse(false)
        sel?.removeAllRanges()
        sel?.addRange(range)
      } catch {
        /* intentionally ignored */
      }
    }
  }, [])

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(e.currentTarget.innerHTML)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onBlur={onBlur}
      onKeyDown={handleKeyDown}
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-2 break-words',
        minHeight,
      )}
      style={{ outline: 'none', whiteSpace: 'pre-wrap' }}
    />
  )
}

const DescriptionContainer = ({ card, description, setDescription, onChange, logAct }: any) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showToggle, setShowToggle] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isEditing && contentRef.current) {
      const isOverflowing = contentRef.current.scrollHeight > 200
      setShowToggle(isOverflowing)
    }
  }, [description, isEditing, isExpanded])

  const handleDescBlur = async () => {
    setIsEditing(false)
    if (description !== card.description) {
      await pb.collection('cards').update(card.id, { description })
      await logAct('edit_desc', 'Atualizou a descrição')
      onChange()
    }
  }

  if (isEditing) {
    return (
      <div className="space-y-2 relative animate-fade-in">
        <div className="flex items-center gap-1 mb-2 bg-white/5 p-1.5 rounded-md border border-white/10">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e: any) => {
              e.preventDefault()
              document.execCommand('bold', false)
            }}
            title="Negrito (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e: any) => {
              e.preventDefault()
              document.execCommand('italic', false)
            }}
            title="Itálico (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e: any) => {
              e.preventDefault()
              document.execCommand('underline', false)
            }}
            title="Sublinhado (Ctrl+U)"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <div className="w-[1px] h-4 bg-white/10 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e: any) => {
              e.preventDefault()
              document.execCommand('insertUnorderedList', false)
            }}
            title="Lista com Marcadores"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onMouseDown={(e: any) => {
              e.preventDefault()
              document.execCommand('insertOrderedList', false)
            }}
            title="Lista Numerada"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>
        <RichTextEditor value={description} onChange={setDescription} onBlur={handleDescBlur} />
        <p className="text-[10px] text-gray-400 mt-1 flex justify-end">
          Pressione Ctrl+Enter para salvar
        </p>
      </div>
    )
  }

  return (
    <div className="relative group">
      {description ? (
        <div className="space-y-2">
          <div
            ref={contentRef}
            className={cn(
              'cursor-pointer rounded-md bg-white/5 border border-transparent p-3 hover:bg-white/10 hover:border-white/10 transition-all prose prose-sm dark:prose-invert max-w-none overflow-hidden whitespace-pre-wrap break-words',
              !isExpanded && 'max-h-[200px]',
            )}
            onClick={() => setIsEditing(true)}
            dangerouslySetInnerHTML={{ __html: description }}
          />
          {showToggle && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-medium w-full mt-2 transition-all bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300 active:scale-[0.99]"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Mostrar Menos
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Mostrar Mais
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <div
          className="cursor-pointer rounded-md bg-white/5 p-4 text-sm text-gray-400 hover:bg-white/10 transition-all h-24 flex items-center justify-center border border-dashed border-white/10 group-hover:border-emerald-500/30 group-hover:text-emerald-500/70"
          onClick={() => setIsEditing(true)}
        >
          Adicione uma descrição mais detalhada...
        </div>
      )}
    </div>
  )
}

export function CardDetail({ card, board, columns = [], onChange, onClose }: any) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || '')

  const dueDateObj = card.due_date ? new Date(card.due_date) : undefined
  const hasSpecificTime = dueDateObj
    ? !(
        dueDateObj.getHours() === 23 &&
        dueDateObj.getMinutes() === 59 &&
        dueDateObj.getSeconds() === 59
      )
    : false
  const [timeStr, setTimeStr] = useState(
    hasSpecificTime && dueDateObj ? format(dueDateObj, 'HH:mm') : '',
  )

  const [isRecurring, setIsRecurring] = useState(card.is_recurring || false)
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(card.recurrence_days || [])
  const [recurrenceTime, setRecurrenceTime] = useState(card.recurrence_time || '')

  const DAYS = [
    { label: 'D', value: 0 },
    { label: 'S', value: 1 },
    { label: 'T', value: 2 },
    { label: 'Q', value: 3 },
    { label: 'Q', value: 4 },
    { label: 'S', value: 5 },
    { label: 'S', value: 6 },
  ]

  const handleRecurrenceChange = async (newVal: boolean) => {
    setIsRecurring(newVal)
    if (!newVal) {
      await pb.collection('cards').update(card.id, { is_recurring: false })
      await logAct('date_change', 'Desativou a recorrência do cartão')
      onChange()
    } else {
      const days = recurrenceDays.length > 0 ? recurrenceDays : [1, 2, 3, 4, 5]
      const time = recurrenceTime || '12:00'
      setRecurrenceDays(days)
      setRecurrenceTime(time)
      await pb.collection('cards').update(card.id, {
        is_recurring: true,
        recurrence_days: days,
        recurrence_time: time,
      })
      await logAct('date_change', 'Ativou a recorrência do cartão')
      onChange()
    }
  }

  const updateRecurrenceConfig = async (days: number[], time: string) => {
    setRecurrenceDays(days)
    setRecurrenceTime(time)
    if (isRecurring) {
      await pb.collection('cards').update(card.id, { recurrence_days: days, recurrence_time: time })
      onChange()
    }
  }

  const toggleRecurrenceDay = (day: number) => {
    const newDays = recurrenceDays.includes(day)
      ? recurrenceDays.filter((d) => d !== day)
      : [...recurrenceDays, day]
    updateRecurrenceConfig(newDays, recurrenceTime)
  }

  useEffect(() => {
    const d = card.due_date ? new Date(card.due_date) : undefined
    const specific = d
      ? !(d.getHours() === 23 && d.getMinutes() === 59 && d.getSeconds() === 59)
      : false
    setTimeStr(specific && d ? format(d, 'HH:mm') : '')
  }, [card.due_date])

  const handleTitleBlur = async () => {
    if (!title.trim()) {
      toast({ title: 'O título não pode estar vazio', variant: 'destructive' })
      setTitle(card.title)
      return
    }
    if (title !== card.title) {
      await pb.collection('cards').update(card.id, { title })
      await logAct('edit_title', `Alterou o título para "${title}"`)
      onChange()
    }
  }

  const handleDescBlur = async () => {
    // Only used if fallback text editing is needed. Logic handled by DescriptionContainer.
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

    try {
      const collectionsToClean = [
        'card_labels',
        'card_members',
        'attachments',
        'checklist_items',
        'comments',
        'activity_logs',
      ]

      for (const coll of collectionsToClean) {
        try {
          const records = await pb.collection(coll).getFullList({
            filter: `card_id='${card.id}'`,
          })
          for (const record of records) {
            await pb.collection(coll).delete(record.id).catch(console.error)
          }
        } catch (e) {
          console.error(`Erro ao limpar ${coll}:`, e)
        }
      }

      await pb.collection('cards').delete(card.id)
      onClose()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o cartão e suas dependências.',
        variant: 'destructive',
      })
    }
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

  const [boardLabels, setBoardLabels] = useState<any[]>([])
  const [editingLabel, setEditingLabel] = useState<any>(null)

  const fetchLabels = async () => {
    const res = await pb.collection('labels').getFullList({
      filter: `board_id='${board.id}' || board_id=''`,
    })
    const sorted = res.sort((a: any, b: any) => {
      if (a.is_system && !b.is_system) return -1
      if (!a.is_system && b.is_system) return 1
      return a.name.localeCompare(b.name)
    })
    setBoardLabels(sorted)
  }

  useEffect(() => {
    fetchLabels()
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
    if (editingLabel) {
      await pb.collection('labels').update(editingLabel.id, { name, color })
      setEditingLabel(null)
      await fetchLabels()
      onChange()
    } else {
      const l = await pb.collection('labels').create({ board_id: board.id, name, color })
      await pb.collection('card_labels').create({ card_id: card.id, label_id: l.id })
      await fetchLabels()
      await logAct('label_add', `Criou e adicionou a etiqueta "${name}"`)
      onChange()
    }
  }

  const deleteLabel = async (labelId: string) => {
    const existing = labels.find((cl: any) => cl.label_id === labelId)
    if (existing) {
      await pb.collection('card_labels').delete(existing.id)
      const labelName = existing.expand?.label_id?.name || 'etiqueta'
      await logAct('label_remove', `Removeu a etiqueta "${labelName}"`)
      onChange()
    }
  }

  return (
    <div className="flex h-auto md:h-full md:max-h-full flex-col md:flex-row md:overflow-hidden">
      <div className="flex-1 md:overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8 bg-transparent">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center text-sm text-gray-400 gap-2 font-medium">
            <LayoutTemplate className="w-4 h-4" />
            <span>{board.name}</span>
            {(card.is_recurring || (card.recurrence_days && card.recurrence_days.length > 0)) && (
              <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Repeat className="w-3 h-3" /> Recorrente
              </span>
            )}
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
            className={`text-2xl font-bold px-3 py-2 h-auto ${card.completed ? 'line-through text-gray-400' : 'text-gray-100'} bg-transparent border-transparent hover:border-white/10 hover:bg-white/5 focus:bg-white/5 focus:border-white/10 focus:ring-2 focus:ring-emerald-500/50 shadow-none transition-all`}
          />
          <div className="text-xs text-gray-400">
            Criado por {card.expand?.created_by?.name || 'Sistema'}{' '}
            {card.created
              ? `em ${format(new Date(card.created), "d 'de' MMM, yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}`
              : ''}
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-gray-400 uppercase">Membros</h4>
            <div className="flex flex-wrap gap-1.5 items-center">
              {members.length > 0 ? (
                members.map((cm: any) => {
                  const m = cm.expand?.user_id
                  if (!m) return null
                  return (
                    <Tooltip key={cm.id}>
                      <TooltipTrigger asChild>
                        <Avatar className="w-8 h-8 border border-white/10 shadow-sm cursor-help">
                          <AvatarImage src={m.avatar ? pb.files.getURL(m, m.avatar) : undefined} />
                          <AvatarFallback className="text-xs font-medium">
                            {' '}
                            {m.name?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{m.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })
              ) : (
                <span className="text-sm text-gray-400 italic h-8 flex items-center">Nenhum</span>
              )}
            </div>
          </div>

          {labels.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-gray-400 uppercase">Etiquetas</h4>
              <div className="flex flex-wrap gap-2">
                {labels.map(
                  (cl: any) =>
                    cl.expand?.label_id && (
                      <div
                        key={cl.id}
                        className="px-3 py-1.5 rounded-md text-xs font-medium text-white flex items-center shadow-sm h-8"
                        style={{ backgroundColor: cl.expand.label_id.color }}
                      >
                        {cl.expand.label_id.name}
                      </div>
                    ),
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-100">
            <LayoutTemplate className="w-5 h-5 text-gray-400" /> Descrição
          </h3>
          <DescriptionContainer
            card={card}
            description={description}
            setDescription={setDescription}
            onChange={onChange}
            logAct={logAct}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-100">
            <CheckSquare className="w-5 h-5 text-gray-400" /> Checklist
          </h3>
          <Checklist cardId={card.id} items={checklist} onChange={onChange} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-100">
              <Paperclip className="w-5 h-5 text-gray-400" /> Anexos
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300"
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
                  className="flex flex-col border border-white/10 rounded-lg overflow-hidden group hover:border-emerald-500/50 shadow-sm transition-all hover:shadow-md bg-white/5"
                >
                  <div className="bg-black/20 h-24 flex items-center justify-center relative">
                    {a.type?.includes('image') ? (
                      <img
                        src={pb.files.getURL(a, a.file)}
                        className="object-cover w-full h-full"
                        alt={a.name}
                      />
                    ) : (
                      <Paperclip className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="p-2 text-xs truncate font-medium bg-transparent text-gray-100 border-t border-white/10">
                    {a.name}
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400 border-2 border-dashed border-white/10 bg-white/5 p-6 text-center rounded-lg">
              Nenhum anexo neste cartão.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-100">
            <Activity className="w-5 h-5 text-gray-400" /> Atividades
          </h3>
          <ActivityLog cardId={card.id} />
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-100">
            <MessageSquare className="w-5 h-5 text-gray-400" /> Comentários
          </h3>
          <Comments cardId={card.id} comments={comments} onChange={onChange} />
        </div>
      </div>

      <div className="w-full md:w-[280px] shrink-0 bg-white/5 p-4 pt-12 md:p-6 md:pt-14 space-y-6 border-t md:border-t-0 md:border-l border-white/10 md:overflow-y-auto backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">
          <Button
            variant={card.completed ? 'outline' : 'default'}
            className={cn(
              'w-full justify-start font-semibold shadow-sm active:scale-[0.98] transition-all',
              card.completed ? 'bg-white/5 border-white/10 hover:bg-white/10' : '',
            )}
            onClick={toggleComplete}
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            {card.completed ? 'Reabrir Cartão' : 'Marcar como Concluído'}
          </Button>

          {!card.completed && (
            <Button
              variant="outline"
              className="w-full justify-start font-semibold shadow-sm text-emerald-500 hover:text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all active:scale-[0.98]"
              onClick={() => handleQuickMove('in_progress')}
            >
              <Play className="w-4 h-4 mr-2 fill-current" />
              Em Andamento
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Adicionar ao cartão
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 text-gray-300 hover:text-white transition-all active:scale-[0.98]"
                >
                  <Users className="w-4 h-4 mr-2 text-emerald-500/70" /> Membros
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-64 p-3 bg-zinc-950/90 backdrop-blur-xl border-white/10"
                align="end"
              >
                <h4 className="font-semibold text-sm mb-3 text-gray-100">Membros do Quadro</h4>
                <div className="space-y-1">
                  {board.expand?.members?.map((m: any) => {
                    const isAssigned = members.some((cm: any) => cm.user_id === m.id)
                    return (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-white/10 p-2 rounded-md transition-colors"
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
                  variant="outline"
                  className="w-full justify-start bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 text-gray-300 hover:text-white transition-all active:scale-[0.98]"
                >
                  <Tag className="w-4 h-4 mr-2 text-emerald-500/70" /> Etiquetas
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-64 p-3 bg-zinc-950/90 backdrop-blur-xl border-white/10"
                align="end"
              >
                <h4 className="font-semibold text-sm mb-3 text-gray-100">Etiquetas</h4>
                <div className="space-y-1 max-h-48 overflow-auto mb-3">
                  {boardLabels.map((l: any) => {
                    const isActive = labels.some((cl: any) => cl.label_id === l.id)
                    return (
                      <div
                        key={l.id}
                        className="flex items-center justify-between group p-1.5 rounded-md hover:bg-white/10 transition-colors"
                      >
                        <div
                          className="flex items-center gap-2 cursor-pointer flex-1"
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
                        {!l.is_system && (
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity ml-2 gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-gray-400 hover:text-primary"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingLabel(l)
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            {isActive && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-gray-400 hover:text-red-500"
                                title="Remover do cartão"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteLabel(l.id)
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <form
                  key={editingLabel ? editingLabel.id : 'new'}
                  onSubmit={(e) => {
                    e.preventDefault()
                    const data = new FormData(e.currentTarget)
                    createLabel(data.get('name') as string, data.get('color') as string)
                    e.currentTarget.reset()
                  }}
                  className="space-y-3 border-t pt-3 mt-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-xs text-gray-400">
                      {editingLabel ? 'Editar Etiqueta' : 'Nova Etiqueta'}
                    </h4>
                    {editingLabel && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 text-[10px] px-2 hover:bg-white/10"
                        onClick={() => setEditingLabel(null)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                  <Input
                    name="name"
                    placeholder="Nome da etiqueta..."
                    required
                    defaultValue={editingLabel?.name}
                    className="h-8 text-sm bg-white/5 border-white/10 focus-visible:ring-emerald-500/50"
                  />
                  <div className="flex flex-wrap gap-1.5 justify-between">
                    {LABEL_COLORS.map((c) => (
                      <label key={c} className="cursor-pointer relative">
                        <input
                          type="radio"
                          name="color"
                          value={c}
                          defaultChecked={
                            editingLabel ? editingLabel.color === c : c === LABEL_COLORS[0]
                          }
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
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full h-8 active:scale-[0.98] transition-transform"
                  >
                    {editingLabel ? 'Salvar Alterações' : 'Criar Etiqueta'}
                  </Button>
                </form>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 text-gray-300 hover:text-white transition-all active:scale-[0.98]',
                    isRecurring &&
                      'text-emerald-500 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10',
                  )}
                >
                  <Repeat
                    className={cn(
                      'w-4 h-4 mr-2',
                      isRecurring ? 'text-emerald-500' : 'text-emerald-500/70',
                    )}
                  />
                  {isRecurring ? 'Recorrente' : 'Recorrência'}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-72 p-3 bg-zinc-950/90 backdrop-blur-xl border-white/10"
                align="end"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-gray-100">Tarefa Recorrente</h4>
                    <Switch checked={isRecurring} onCheckedChange={handleRecurrenceChange} />
                  </div>
                  {isRecurring && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-400 mb-1.5 block">
                          Repetir nos dias
                        </label>
                        <div className="flex justify-between gap-1">
                          {DAYS.map((d) => (
                            <button
                              key={d.value}
                              className={cn(
                                'w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center transition-colors',
                                recurrenceDays.includes(d.value)
                                  ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                  : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10',
                              )}
                              onClick={() => toggleRecurrenceDay(d.value)}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-400 mb-1.5 block">
                          Horário de Entrega
                        </label>
                        <Input
                          type="time"
                          value={recurrenceTime}
                          onChange={(e) => updateRecurrenceConfig(recurrenceDays, e.target.value)}
                          className="h-8 text-sm bg-white/5 border-white/10 focus-visible:ring-emerald-500/50"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 text-gray-300 hover:text-white transition-all active:scale-[0.98]"
                >
                  <Clock className="w-4 h-4 mr-2 text-emerald-500/70" />
                  {card.due_date && dueDateObj
                    ? hasSpecificTime
                      ? format(
                          dueDateObj,
                          `d 'de' MMM, ${user?.time_format === '12h' ? 'hh:mm a' : 'HH:mm'}`,
                          { locale: ptBR },
                        )
                      : format(dueDateObj, "d 'de' MMM", { locale: ptBR })
                    : 'Data de Entrega'}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 bg-zinc-950/90 backdrop-blur-xl border-white/10"
                align="end"
              >
                <Calendar
                  mode="single"
                  selected={card.due_date ? new Date(card.due_date) : undefined}
                  disabled={(date) => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    return date < today
                  }}
                  onSelect={async (date) => {
                    if (!date) {
                      await pb.collection('cards').update(card.id, { due_date: null })
                      await logAct('date_change', 'Removeu a data de entrega')
                      onChange()
                      return
                    }
                    const newDate = new Date(date)
                    if (timeStr) {
                      const [h, m] = timeStr.split(':').map(Number)
                      newDate.setHours(h, m, 0, 0)
                    } else {
                      newDate.setHours(23, 59, 59, 999)
                    }

                    if (newDate.getTime() < new Date().getTime()) {
                      toast({
                        title: 'Data inválida',
                        description: 'A data de vencimento não pode ser no passado.',
                        variant: 'destructive',
                      })
                      return
                    }

                    await pb
                      .collection('cards')
                      .update(card.id, { due_date: newDate.toISOString() })
                    await logAct('date_change', 'Alterou a data de entrega')
                    onChange()
                  }}
                  initialFocus
                />
                <div className="p-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <Input
                      type="time"
                      value={timeStr}
                      onChange={(e) => setTimeStr(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          e.currentTarget.blur()
                        }
                      }}
                      className="w-[100px] h-8 text-sm bg-white/5 border-white/10 focus-visible:ring-emerald-500/50"
                      onBlur={async () => {
                        if (!card.due_date) return
                        const d = new Date(card.due_date)
                        if (timeStr) {
                          const [h, m] = timeStr.split(':').map(Number)
                          d.setHours(h, m, 0, 0)
                        } else {
                          d.setHours(23, 59, 59, 999)
                        }

                        if (d.getTime() < new Date().getTime()) {
                          toast({
                            title: 'Data inválida',
                            description: 'A data de vencimento não pode ser no passado.',
                            variant: 'destructive',
                          })
                          setTimeStr(
                            hasSpecificTime && dueDateObj ? format(dueDateObj, 'HH:mm') : '',
                          )
                          return
                        }

                        if (d.getTime() !== new Date(card.due_date).getTime()) {
                          await pb
                            .collection('cards')
                            .update(card.id, { due_date: d.toISOString() })
                          await logAct('date_change', 'Alterou o horário de entrega')
                          onChange()
                        }
                      }}
                    />{' '}
                  </div>
                  {card.due_date && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-500 hover:bg-red-500/10 h-8 px-2"
                      onClick={async () => {
                        await pb.collection('cards').update(card.id, { due_date: null })
                        await logAct('date_change', 'Removeu a data de entrega')
                        setTimeStr('')
                        onChange()
                      }}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-3 pt-2 md:pt-6">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ações</h4>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 text-gray-300 hover:text-white transition-all active:scale-[0.98]"
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2 text-emerald-500/70" /> Mover
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-64 p-3 bg-zinc-950/90 backdrop-blur-xl border-white/10"
                align="end"
              >
                <h4 className="font-semibold text-sm mb-3 text-gray-100">Mover para Coluna</h4>
                <Select
                  value={card.column_id}
                  onValueChange={async (val) => {
                    if (val === card.column_id) return
                    await pb.collection('cards').update(card.id, { column_id: val })
                    await logAct('move', 'Moveu o cartão via menu de ações')
                    onChange()
                  }}
                >
                  <SelectTrigger className="rounded-lg border border-white/10 bg-white/5 text-gray-100 backdrop-blur focus:outline-none focus:ring-2 focus:ring-emerald-500/50 hover:border-white/20 transition-colors">
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950/90 backdrop-blur-xl border-white/10">
                    {columns.map((col: any) => (
                      <SelectItem
                        key={col.id}
                        value={col.id}
                        className="focus:bg-white/10 focus:text-white"
                      >
                        {col.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              className="w-full justify-start bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 text-gray-300 hover:text-white transition-all active:scale-[0.98]"
              onClick={handleDuplicate}
            >
              <Copy className="w-4 h-4 mr-2 text-emerald-500/70" /> Duplicar
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/30 text-gray-300 hover:text-white transition-all active:scale-[0.98]"
              onClick={handleArchive}
            >
              <Archive className="w-4 h-4 mr-2 text-emerald-500/70" /> Arquivar
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all active:scale-[0.98]"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2 text-red-500" />{' '}
              <span className="text-red-500 font-medium">Excluir</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
