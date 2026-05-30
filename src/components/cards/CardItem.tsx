import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  Calendar,
  CheckSquare,
  MessageSquare,
  Paperclip,
  Play,
  CheckCircle2,
  Clock,
  Repeat,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'
import { format, isToday, addDays, startOfDay, isBefore } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'

export function CardItem({ card, boardId, columnName, onDragStart, onDropCard, onQuickMove }: any) {
  const [localCard, setLocalCard] = useState(card)
  const [isDatePopoverOpen, setDatePopoverOpen] = useState(false)
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [tempDate, setTempDate] = useState<Date | undefined>()
  const [tempHour, setTempHour] = useState<string>('12')
  const [tempMinute, setTempMinute] = useState<string>('00')
  const [tempAmPm, setTempAmPm] = useState<string>('AM')
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
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
            filter: `card_id='${localCard.id}'`,
          })
          for (const record of records) {
            await pb.collection(coll).delete(record.id).catch(console.error)
          }
        } catch (err) {
          console.error(`Erro ao limpar ${coll}:`, err)
        }
      }

      await pb.collection('cards').delete(localCard.id)
      toast({ title: 'Cartão excluído com sucesso' })
      setDeleteAlertOpen(false)
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao excluir cartão', variant: 'destructive' })
    }
  }

  useEffect(() => {
    setLocalCard(card)
  }, [card])

  useRealtime('cards', (e) => {
    if (e.action === 'update' && e.record.id === localCard.id) {
      setLocalCard((prev: any) => ({ ...prev, ...e.record, expand: prev.expand }))
    }
  })

  const isCompleted = localCard.completed
  const isColumnDone = columnName?.toUpperCase() === 'CONCLUÍDO'
  const isColumnInProgress = columnName?.toUpperCase() === 'EM ANDAMENTO'
  const isEffectivelyCompleted = isCompleted || isColumnDone
  const labels =
    localCard.expand?.card_labels_via_card_id?.map((cl: any) => cl.expand?.label_id) || []
  const members =
    localCard.expand?.card_members_via_card_id?.map((cm: any) => cm.expand?.user_id) || []

  let dateBadgeClass = 'bg-muted text-muted-foreground'
  let dateText = 'Sem data'
  let hasTime = false

  const timeFormatStr = user?.time_format === '12h' ? 'hh:mm a' : 'HH:mm'

  if (localCard.due_date) {
    const date = new Date(localCard.due_date)
    const now = new Date()
    const today = startOfDay(now)
    const cardDate = startOfDay(date)
    hasTime = !(date.getHours() === 23 && date.getMinutes() === 59 && date.getSeconds() === 59)

    dateText = format(date, hasTime ? `d 'de' MMM, ${timeFormatStr}` : "d 'de' MMM", {
      locale: ptBR,
    })

    const isOverdue = date < now

    if (isCompleted) {
      dateBadgeClass = 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
    } else if (isOverdue) {
      dateBadgeClass = 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
    } else if (isToday(cardDate)) {
      dateBadgeClass =
        'bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20'
    } else if (cardDate <= addDays(today, 7)) {
      dateBadgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
    } else {
      dateBadgeClass = 'bg-secondary text-gray-100 hover:bg-secondary/80'
    }
  } else {
    dateBadgeClass = 'bg-muted/50 text-gray-400 border border-dashed border-border'
  }

  const handleOpenChange = (open: boolean) => {
    setDatePopoverOpen(open)
    if (open) {
      if (localCard.due_date) {
        const d = new Date(localCard.due_date)
        setTempDate(d)
        let h = d.getHours()
        setTempMinute(d.getMinutes().toString().padStart(2, '0'))
        if (user?.time_format === '12h') {
          setTempAmPm(h >= 12 ? 'PM' : 'AM')
          h = h % 12 || 12
        }
        setTempHour(h.toString().padStart(2, '0'))
      } else {
        setTempDate(new Date())
        setTempHour(user?.time_format === '12h' ? '12' : '12')
        setTempMinute('00')
        setTempAmPm('PM')
      }
    }
  }

  const getSelectedDateTime = () => {
    if (!tempDate) return null
    const d = new Date(tempDate)
    let h = parseInt(tempHour, 10) || 0
    const m = parseInt(tempMinute, 10) || 0
    if (user?.time_format === '12h') {
      if (tempAmPm === 'PM' && h < 12) h += 12
      if (tempAmPm === 'AM' && h === 12) h = 0
    }
    d.setHours(h, m, 0, 0)
    return d
  }

  const selectedDateTime = getSelectedDateTime()
  const isInvalidDate = selectedDateTime ? selectedDateTime < new Date() : false

  const handleSave = async () => {
    if (!selectedDateTime || isInvalidDate) {
      if (isInvalidDate) {
        toast({
          title: 'Data inválida',
          description: 'A data de vencimento não pode ser no passado.',
          variant: 'destructive',
        })
      }
      return
    }

    try {
      const isoDate = selectedDateTime.toISOString()

      // Optimistic update
      setLocalCard((prev: any) => ({ ...prev, due_date: isoDate }))
      setDatePopoverOpen(false)

      await pb.collection('cards').update(localCard.id, { due_date: isoDate })

      await pb.collection('activity_logs').create({
        card_id: localCard.id,
        user_id: user?.id,
        action_type: 'date_change',
        description: `alterou o prazo para ${format(selectedDateTime, 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      })
    } catch (err) {
      console.error('Failed to update time', err)
      setLocalCard(card)
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a data.',
        variant: 'destructive',
      })
    }
  }

  const handleRemoveDate = async () => {
    try {
      setLocalCard((prev: any) => ({ ...prev, due_date: null }))
      setDatePopoverOpen(false)

      await pb.collection('cards').update(localCard.id, { due_date: null })

      await pb.collection('activity_logs').create({
        card_id: localCard.id,
        user_id: user?.id,
        action_type: 'date_change',
        description: 'removeu o prazo',
      })
    } catch (err) {
      console.error('Failed to remove date', err)
      setLocalCard(card)
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a data.',
        variant: 'destructive',
      })
    }
  }

  const checklistCount = localCard.expand?.checklist_items_via_card_id?.length || 0
  const checklistCompleted =
    localCard.expand?.checklist_items_via_card_id?.filter((i: any) => i.completed)?.length || 0
  const progressPercentage =
    checklistCount > 0 ? Math.round((checklistCompleted / checklistCount) * 100) : 0

  return (
    <>
      <div
        onClick={() => navigate(`/boards/${boardId}/cards/${localCard.id}`)}
        className={cn(
          'group block w-full shrink-0 overflow-hidden p-4 rounded-lg border shadow-sm hover:border-primary/50 hover:bg-white/[0.12] hover:shadow-lg focus-within:shadow-lg transition-all duration-300 relative cursor-pointer backdrop-blur-md',
          isEffectivelyCompleted
            ? 'bg-white/5 opacity-70 border-transparent hover:bg-white/[0.08]'
            : 'bg-white/[0.08] border-white/[0.03]',
        )}
        draggable
        onDragStart={(e) => {
          e.stopPropagation()
          onDragStart(e, localCard)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          if (onDropCard) {
            e.stopPropagation()
            onDropCard(e, localCard)
          }
        }}
      >
        {(labels.length > 0 ||
          localCard.is_recurring ||
          (localCard.recurrence_days && localCard.recurrence_days.length > 0)) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {(localCard.is_recurring ||
              (localCard.recurrence_days && localCard.recurrence_days.length > 0)) && (
              <div
                className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white leading-none shadow-sm flex items-center gap-1 bg-indigo-500"
                title="Tarefa Recorrente"
              >
                <Repeat className="w-2.5 h-2.5" /> Recorrente
              </div>
            )}
            {labels.map(
              (l: any) =>
                l && (
                  <div
                    key={l.id}
                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white leading-none truncate max-w-full shadow-sm"
                    style={{ backgroundColor: l.color }}
                    title={l.name}
                  >
                    {l.name}
                  </div>
                ),
            )}
          </div>
        )}
        <div className="flex items-start gap-2 mb-2 w-full">
          {isEffectivelyCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <div
              className="w-2 h-2 rounded-full bg-yellow-500 shrink-0 mt-1.5"
              aria-hidden="true"
            />
          )}
          <h4
            className={cn(
              'text-sm font-medium break-words whitespace-normal leading-snug flex-1 min-w-0 pr-20 transition-all duration-300',
              isEffectivelyCompleted ? 'line-through text-gray-400' : 'text-gray-100',
            )}
          >
            {localCard.title}
          </h4>
        </div>

        {localCard.description && (
          <div className="mb-3 w-full pr-8">
            <div
              className={cn(
                'text-xs text-gray-400 prose prose-sm dark:prose-invert max-w-none break-words leading-tight [&>p]:mb-1 [&>p]:mt-0 [&>ul]:my-1 [&>ol]:my-1 [&>ul]:pl-4 [&>ol]:pl-4 [&>ul]:list-disc [&>ol]:list-decimal',
                !isExpanded && 'line-clamp-3',
              )}
              onClick={(e) => {
                if ((e.target as HTMLElement).tagName.toLowerCase() === 'a') {
                  e.stopPropagation()
                }
              }}
              dangerouslySetInnerHTML={{ __html: localCard.description }}
            />
            <div
              role="button"
              className="text-[10px] font-medium text-primary mt-1 hover:underline cursor-pointer inline-block"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
            >
              {isExpanded ? 'Ver menos' : 'Ver mais'}
            </div>
          </div>
        )}

        <div
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10"
          onClick={(e) => e.preventDefault()}
        >
          {!isEffectivelyCompleted && !isColumnInProgress && (
            <div
              role="button"
              className="flex items-center justify-center h-7 w-7 rounded bg-background border border-border shadow-sm hover:bg-muted cursor-pointer transition-colors"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onQuickMove?.('in_progress')
              }}
              title="Mover para Em Andamento"
            >
              <Play className="w-3.5 h-3.5 text-blue-500 fill-current" />
            </div>
          )}
          {!isEffectivelyCompleted && (
            <div
              role="button"
              className="flex items-center justify-center h-7 w-7 rounded bg-background border border-border shadow-sm hover:bg-muted cursor-pointer transition-colors"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onQuickMove?.('done')
              }}
              title="Mover para Concluído"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                role="button"
                className="flex items-center justify-center h-7 w-7 rounded bg-background border border-border shadow-sm hover:bg-muted cursor-pointer transition-colors"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                title="Mais ações"
              >
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                className="text-red-500 focus:text-red-500 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDeleteAlertOpen(true)
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400 mt-3 w-full">
          <div className="flex flex-wrap items-center gap-3">
            {!isEffectivelyCompleted ? (
              <Popover open={isDatePopoverOpen} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={cn(
                      'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer',
                      dateBadgeClass,
                      !localCard.due_date && 'hover:bg-muted/80',
                    )}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>{dateText}</span>
                    {localCard.due_date && hasTime && (
                      <Clock className="w-3 h-3 opacity-50 ml-0.5" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-4 z-50"
                  align="start"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSave()
                    }
                  }}
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col space-y-1">
                      <span className="text-sm font-medium text-gray-100">Prazo de Entrega</span>
                    </div>
                    <CalendarComponent
                      mode="single"
                      selected={tempDate}
                      onSelect={setTempDate}
                      disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date()))}
                      initialFocus
                      className="p-0 border rounded-md"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={user?.time_format === '12h' ? 1 : 0}
                        max={user?.time_format === '12h' ? 12 : 23}
                        value={tempHour}
                        onChange={(e) => setTempHour(e.target.value)}
                        className="h-8 w-16 text-center"
                        placeholder="HH"
                      />
                      <span className="text-gray-400 font-bold">:</span>
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        value={tempMinute}
                        onChange={(e) => setTempMinute(e.target.value)}
                        className="h-8 w-16 text-center"
                        placeholder="MM"
                      />
                      {user?.time_format === '12h' && (
                        <Select value={tempAmPm} onValueChange={setTempAmPm}>
                          <SelectTrigger className="h-8 w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="AM">AM</SelectItem>
                            <SelectItem value="PM">PM</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    {isInvalidDate && (
                      <span className="text-xs text-red-500 font-medium">
                        A data/hora não pode ser no passado.
                      </span>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                      {localCard.due_date ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-red-500 hover:text-red-500 hover:bg-red-500/10 px-2"
                          onClick={handleRemoveDate}
                        >
                          Remover
                        </Button>
                      ) : (
                        <div />
                      )}
                      <Button
                        size="sm"
                        className="h-8 px-4"
                        disabled={!tempDate || isInvalidDate}
                        onClick={handleSave}
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <div
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
                  dateBadgeClass,
                )}
              >
                <Calendar className="w-3 h-3" />
                <span>{dateText}</span>
                {localCard.due_date && hasTime && <Clock className="w-3 h-3 opacity-50 ml-0.5" />}
              </div>
            )}
            {localCard.expand?.comments_via_card_id && (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{localCard.expand.comments_via_card_id.length}</span>
              </div>
            )}
            {localCard.expand?.attachments_via_card_id && (
              <div className="flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5" />
                <span>{localCard.expand.attachments_via_card_id.length}</span>
              </div>
            )}
          </div>
          <div className="flex -space-x-1.5">
            {members.map(
              (m: any) =>
                m && (
                  <div
                    key={m.id}
                    className="w-6 h-6 rounded-full bg-primary/20 border border-background flex items-center justify-center text-[10px] font-bold text-primary"
                    title={m.name}
                  >
                    {m.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                ),
            )}
          </div>
        </div>

        {checklistCount > 0 && (
          <div className="mt-3 space-y-1.5 w-full">
            <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
              <span className="flex items-center gap-1">
                <CheckSquare className="w-3 h-3" />
                {checklistCompleted}/{checklistCount}
              </span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-1.5" />
          </div>
        )}

        <div className="mt-3 text-[10px] text-gray-400 flex items-center justify-between border-t border-border/50 pt-2 w-full truncate">
          <span className="truncate pr-2">
            Criado por {localCard.expand?.created_by?.name || 'Sistema'}
          </span>
          <span className="shrink-0">
            {localCard.created ? format(new Date(localCard.created), 'dd/MM/yyyy HH:mm') : ''}
          </span>
        </div>
      </div>

      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cartão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este card? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
