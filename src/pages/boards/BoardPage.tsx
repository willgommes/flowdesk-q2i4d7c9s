import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, Link, useNavigate, Outlet, useOutletContext } from 'react-router-dom'
import {
  ArrowLeft,
  MoreHorizontal,
  Plus,
  Settings,
  Archive,
  Trash2,
  FilterX,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  ArrowDownUp,
} from 'lucide-react'
import { startOfDay, isBefore, isToday, addDays } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getBoard, updateBoard, deleteBoard } from '@/services/boards'
import {
  getBoardColumns,
  createColumn,
  updateColumn,
  deleteColumn,
  updateColumnOrder,
} from '@/services/columns'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { BoardModal } from '@/components/boards/BoardModal'
import { CardItem } from '@/components/cards/CardItem'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AppHeader } from '@/components/AppHeader'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function BoardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [board, setBoard] = useState<any>(null)
  const [columns, setColumns] = useState<any[]>([])
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const [isEditingName, setIsEditingName] = useState(false)
  const [boardName, setBoardName] = useState('')

  const [draggedColId, setDraggedColId] = useState<string | null>(null)
  const isDraggingRef = useRef(false)

  const [dateFilter, setDateFilter] = useState<string>('all')

  const isAdmin = user?.role === 'admin'

  const stats = useMemo(() => {
    const today = startOfDay(new Date())
    let completed = 0
    let overdue = 0

    cards.forEach((card) => {
      if (card.completed) {
        completed++
      } else if (card.due_date && isBefore(startOfDay(new Date(card.due_date)), today)) {
        overdue++
      }
    })

    return { total: cards.length, completed, overdue }
  }, [cards])

  const handleSortByDueDate = async () => {
    if (!cards.length) return

    const newCards = [...cards]
    const updatedCards: any[] = []

    columns.forEach((col) => {
      const colCards = newCards.filter((c) => c.column_id === col.id)

      colCards.sort((a, b) => {
        if (!a.due_date && !b.due_date) return a.sort_order - b.sort_order
        if (!a.due_date) return 1
        if (!b.due_date) return -1

        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      })

      colCards.forEach((c, idx) => {
        if (c.sort_order !== idx) {
          c.sort_order = idx
          updatedCards.push(c)
        }
      })
    })

    if (updatedCards.length === 0) {
      toast({ title: 'Cartões já estão ordenados' })
      return
    }

    setCards(newCards)

    try {
      await Promise.all(
        updatedCards.map((c) => pb.collection('cards').update(c.id, { sort_order: c.sort_order })),
      )
      toast({ title: 'Cartões ordenados por prazo' })
    } catch (err) {
      toast({ title: 'Erro ao ordenar cartões', variant: 'destructive' })
      loadData()
    }
  }

  const filteredCards = useMemo(() => {
    if (dateFilter === 'all') return cards

    const today = startOfDay(new Date())

    return cards.filter((card) => {
      if (!card.due_date) return false
      const cardDate = startOfDay(new Date(card.due_date))

      if (dateFilter === 'overdue') {
        return !card.completed && isBefore(cardDate, today)
      }
      if (dateFilter === 'today') {
        return isToday(cardDate)
      }
      if (dateFilter === 'week') {
        return cardDate >= today && cardDate <= addDays(today, 7)
      }
      return true
    })
  }, [cards, dateFilter])

  const loadData = async () => {
    if (!id) return
    try {
      const b = await getBoard(id)
      setBoard(b)
      const cols = await getBoardColumns(id)
      setColumns(cols)

      const c = await pb.collection('cards').getFullList({
        filter: `board_id = '${id}'`,
        expand:
          'card_labels_via_card_id.label_id,card_members_via_card_id.user_id,comments_via_card_id,checklist_items_via_card_id,attachments_via_card_id',
        sort: 'sort_order',
      })
      setCards(c)
    } catch (err) {
      toast({ title: 'Erro ao carregar quadro', variant: 'destructive' })
      navigate('/boards')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime('boards', (e) => {
    if (e.record.id === id) {
      if (e.action === 'delete') navigate('/boards')
      else loadData()
    }
  })

  useRealtime('columns', (e) => {
    if (e.record.board_id === id && !isDraggingRef.current) {
      loadData()
    }
  })

  useRealtime('cards', () => loadData())
  useRealtime('card_labels', () => loadData())
  useRealtime('card_members', () => loadData())
  useRealtime('comments', () => loadData())
  useRealtime('checklist_items', () => loadData())
  useRealtime('attachments', () => loadData())

  const handleAddColumn = async () => {
    try {
      const maxOrder =
        columns.length > 0
          ? Math.max(
              ...columns.map((c) => {
                const val = Number(c.sort_order)
                return isNaN(val) ? 0 : val
              }),
            )
          : -1
      await createColumn({
        board_id: id,
        name: 'Nova Coluna',
        sort_order: Math.floor(maxOrder + 1),
        color: '#e2e8f0',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao adicionar coluna',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const handleArchive = async () => {
    if (!confirm('Deseja arquivar este quadro?')) return
    try {
      await updateBoard(id!, { archived: true })
      toast({ title: 'Quadro arquivado' })
      navigate('/boards')
    } catch (err) {
      toast({ title: 'Erro ao arquivar', variant: 'destructive' })
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este quadro? Esta ação não pode ser desfeita.'))
      return
    if (!confirm('Dupla confirmação: Excluir permanentemente?')) return
    try {
      await deleteBoard(id!)
      toast({ title: 'Quadro excluído com sucesso' })
      navigate('/boards')
    } catch (err) {
      toast({ title: 'Erro ao excluir quadro', variant: 'destructive' })
    }
  }

  const handleBoardNameUpdate = async () => {
    setIsEditingName(false)
    if (boardName !== board.name && boardName.trim()) {
      try {
        await updateBoard(id!, { name: boardName })
        setBoard((prev: any) => ({ ...prev, name: boardName }))
        toast({ title: 'Nome atualizado' })
      } catch (err) {
        toast({ title: 'Erro ao atualizar nome', variant: 'destructive' })
        setBoardName(board.name)
      }
    } else {
      setBoardName(board.name)
    }
  }

  const handleDragStart = (e: React.DragEvent, colId: string) => {
    setDraggedColId(colId)
    isDraggingRef.current = true
    e.dataTransfer.effectAllowed = 'move'
    setTimeout(() => {
      const el = document.getElementById(`col-${colId}`)
      if (el) el.style.opacity = '0.5'
    }, 0)
  }

  const handleDragEnter = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedColId || draggedColId === targetId) return

    setColumns((prev) => {
      const newCols = [...prev]
      const draggedIdx = newCols.findIndex((c) => c.id === draggedColId)
      const targetIdx = newCols.findIndex((c) => c.id === targetId)

      if (draggedIdx === -1 || targetIdx === -1) return prev

      const temp = newCols[draggedIdx]
      newCols[draggedIdx] = newCols[targetIdx]
      newCols[targetIdx] = temp

      return newCols.map((c, idx) => ({ ...c, sort_order: idx }))
    })
  }

  const handleDragEnd = async (e: React.DragEvent, colId: string) => {
    setDraggedColId(null)
    const el = document.getElementById(`col-${colId}`)
    if (el) el.style.opacity = '1'

    try {
      await updateColumnOrder(columns.map((c) => ({ id: c.id, sort_order: c.sort_order })))
      await loadData()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao reordenar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      isDraggingRef.current = false
    }
  }

  if (loading || !board)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/10">
      <AppHeader />

      <div className="bg-background border-b px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/boards">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            {isEditingName && isAdmin ? (
              <Input
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                onBlur={handleBoardNameUpdate}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleBoardNameUpdate()
                  if (e.key === 'Escape') {
                    setIsEditingName(false)
                    setBoardName(board.name)
                  }
                }}
                autoFocus
                className="h-8 text-xl font-semibold w-64"
              />
            ) : (
              <h1
                className={`text-2xl font-display font-semibold tracking-tight flex items-center gap-2 ${isAdmin ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                onClick={() => {
                  if (isAdmin) {
                    setIsEditingName(true)
                    setBoardName(board.name)
                  }
                }}
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: board.color || '#e2e8f0' }}
                />
                {board.name}
              </h1>
            )}

            {board.client_name && (
              <p className="text-sm text-muted-foreground">{board.client_name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSortByDueDate}
            className="h-8 text-xs bg-background/50 hidden sm:flex"
          >
            <ArrowDownUp className="w-3.5 h-3.5 mr-2" />
            Ordenar por Prazo
          </Button>

          <div className="flex items-center gap-2 mr-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs bg-background/50">
                <SelectValue placeholder="Filtrar por data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tarefas</SelectItem>
                <SelectItem value="today">Vencendo hoje</SelectItem>
                <SelectItem value="week">Vencendo esta semana</SelectItem>
                <SelectItem value="overdue">Atrasadas</SelectItem>
              </SelectContent>
            </Select>
            {dateFilter !== 'all' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setDateFilter('all')}
                title="Limpar filtros"
              >
                <FilterX className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex -space-x-2 mr-4">
            {board.expand?.members?.map((m: any) => (
              <Avatar key={m.id} className="w-8 h-8 border-2 border-background">
                <AvatarImage src={m.avatar ? pb.files.getURL(m, m.avatar) : ''} />
                <AvatarFallback className="text-xs bg-primary/10">
                  {m.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditModalOpen(true)}>
                  <Settings className="w-4 h-4 mr-2" /> Editar Quadro
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="w-4 h-4 mr-2" /> Arquivar Quadro
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir Quadro
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="bg-background/60 border-b px-6 py-2.5 flex items-center gap-6 shrink-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] text-sm">
        <div className="flex items-center gap-2 min-w-max">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-muted-foreground">Total de Tarefas:</span>
          <span className="font-semibold">{stats.total}</span>
        </div>

        <div className="w-px h-4 bg-border shrink-0"></div>

        <div className="flex items-center gap-2 min-w-max">
          <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-muted-foreground">Concluídas:</span>
          <span className="font-semibold text-emerald-600">{stats.completed}</span>
        </div>

        <div className="w-px h-4 bg-border shrink-0"></div>

        <div className="flex items-center gap-2 min-w-max">
          <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-3.5 h-3.5 text-destructive" />
          </div>
          <span className="text-muted-foreground">Atrasadas:</span>
          <span className="font-semibold text-destructive">{stats.overdue}</span>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 animate-fade-in">
        <div className="flex gap-6 h-full items-start">
          {columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              cards={filteredCards.filter((c) => c.column_id === col.id)}
              onDragStart={(e: any) => handleDragStart(e, col.id)}
              onDragEnter={(e: any) => handleDragEnter(e, col.id)}
              onDragEnd={(e: any) => handleDragEnd(e, col.id)}
              onDelete={async () => {
                if (confirm('Excluir coluna?')) {
                  try {
                    await deleteColumn(col.id)
                  } catch (err) {
                    toast({
                      title: 'Erro ao excluir',
                      description: getErrorMessage(err),
                      variant: 'destructive',
                    })
                  }
                }
              }}
              onUpdate={async (data: any) => {
                try {
                  await updateColumn(col.id, data)
                } catch (err) {
                  toast({
                    title: 'Erro ao atualizar',
                    description: getErrorMessage(err),
                    variant: 'destructive',
                  })
                }
              }}
              onCardDrop={async (cardId: string, colId: string, targetCardId?: string) => {
                try {
                  const card = cards.find((c) => c.id === cardId)
                  if (!card) return

                  const currentCards = [...cards]
                  const oldColId = card.column_id

                  // Move card to new column
                  card.column_id = colId

                  // Filter cards for the target column
                  let colCards = currentCards
                    .filter((c) => c.column_id === colId && c.id !== cardId)
                    .sort((a, b) => a.sort_order - b.sort_order)

                  if (targetCardId) {
                    const targetIdx = colCards.findIndex((c) => c.id === targetCardId)
                    if (targetIdx >= 0) {
                      colCards.splice(targetIdx, 0, card)
                    } else {
                      colCards.push(card)
                    }
                  } else {
                    colCards.push(card)
                  }

                  // Update sort_order locally
                  colCards.forEach((c, idx) => {
                    c.sort_order = idx
                  })

                  setCards((prev) =>
                    prev.map((c) => {
                      const updated = colCards.find((cc) => cc.id === c.id)
                      return updated
                        ? { ...c, column_id: updated.column_id, sort_order: updated.sort_order }
                        : c
                    }),
                  )

                  if (oldColId !== colId) {
                    await pb.collection('cards').update(cardId, { column_id: colId })
                    await pb.collection('activity_logs').create({
                      card_id: cardId,
                      user_id: user?.id,
                      action_type: 'move',
                      description: 'Moveu o cartão para outra coluna',
                    })
                  }

                  // Sync sort_orders sequentially
                  await Promise.all(
                    colCards.map((c) =>
                      pb.collection('cards').update(c.id, { sort_order: c.sort_order }),
                    ),
                  )
                } catch (err) {
                  console.error(err)
                  toast({
                    title: 'Erro ao mover cartão',
                    description: getErrorMessage(err),
                    variant: 'destructive',
                  })
                }
              }}
            />
          ))}

          <Button
            variant="ghost"
            className="shrink-0 w-[280px] h-[50px] bg-background/50 border border-dashed border-border/60 hover:bg-background justify-start"
            onClick={handleAddColumn}
          >
            <Plus className="w-4 h-4 mr-2" /> Adicionar coluna
          </Button>
        </div>
      </div>

      <BoardModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        board={board}
        onSuccess={loadData}
      />
      <Outlet context={{ cards, board, columns, loadData }} />
    </div>
  )
}

function Column({
  column,
  cards = [],
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDelete,
  onUpdate,
  onCardDrop,
}: any) {
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(column.name)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [editing])

  const handleSave = () => {
    setEditing(false)
    if (name !== column.name && name.trim()) {
      onUpdate({ name })
    } else {
      setName(column.name)
    }
  }

  return (
    <div
      id={`col-${column.id}`}
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      className="shrink-0 w-[300px] max-h-full flex flex-col bg-background/50 rounded-xl border border-border/50 shadow-subtle cursor-grab active:cursor-grabbing transition-all duration-200 hover:border-border"
    >
      <div
        className="p-3 flex items-center justify-between group border-b border-border/50"
        style={{
          borderTop: `4px solid ${column.color || '#e2e8f0'}`,
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px',
        }}
      >
        {editing ? (
          <Input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') {
                setEditing(false)
                setName(column.name)
              }
            }}
            className="h-7 text-sm font-semibold"
          />
        ) : (
          <div
            className="flex items-center gap-2 flex-1 cursor-pointer"
            onClick={() => setEditing(true)}
          >
            <h3 className="font-semibold text-sm truncate">{column.name}</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {cards.length}
            </span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditing(true)}>Renomear</DropdownMenuItem>
            <div className="flex p-2 gap-1 justify-center">
              {['#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b'].map((c) => (
                <button
                  key={c}
                  className="w-5 h-5 rounded-full border border-black/10"
                  style={{ backgroundColor: c }}
                  onClick={() => onUpdate({ color: c })}
                />
              ))}
            </div>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        className="p-3 flex-1 overflow-y-auto min-h-[100px] flex flex-col gap-2"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const cardId = e.dataTransfer.getData('cardId')
          if (cardId) onCardDrop(cardId, column.id)
        }}
      >
        {cards
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((card: any) => (
            <CardItem
              key={card.id}
              card={card}
              boardId={column.board_id}
              onDragStart={(e: any) => {
                e.dataTransfer.setData('cardId', card.id)
              }}
              onDropCard={(e: any, targetCard: any) => {
                const cardId = e.dataTransfer.getData('cardId')
                if (cardId && cardId !== targetCard.id) {
                  onCardDrop(cardId, column.id, targetCard.id)
                }
              }}
            />
          ))}

        {isAdding ? (
          <div className="bg-background p-2 rounded-lg border border-border mt-1 shadow-sm">
            <Input
              autoFocus
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Título do cartão..."
              className="h-8 mb-2 text-sm shadow-none focus-visible:ring-1"
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && newCardTitle.trim()) {
                  const title = newCardTitle.trim()
                  setNewCardTitle('')
                  setIsAdding(false)
                  try {
                    const authId = pb.authStore.record?.id
                    const newCard = await pb.collection('cards').create({
                      board_id: column.board_id,
                      column_id: column.id,
                      title,
                      sort_order: Math.floor(cards.length),
                      created_by: authId,
                      completed: false,
                    })
                    await pb.collection('activity_logs').create({
                      card_id: newCard.id,
                      user_id: authId,
                      action_type: 'creation',
                      description: 'Criou este cartão',
                    })
                  } catch (err: any) {
                    toast({
                      title: 'Erro ao criar cartão',
                      description: getErrorMessage(err),
                      variant: 'destructive',
                    })
                  }
                }
                if (e.key === 'Escape') setIsAdding(false)
              }}
              onBlur={() => setIsAdding(false)}
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setIsAdding(true)}
            className="w-full text-muted-foreground justify-start text-sm h-8 border border-dashed hover:bg-muted shrink-0 mt-1"
          >
            <Plus className="w-4 h-4 mr-2" /> Adicionar cartão
          </Button>
        )}
      </div>
    </div>
  )
}
