import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal, Plus, Settings, Archive, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getBoard, updateBoard } from '@/services/boards'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppHeader } from '@/components/AppHeader'
import pb from '@/lib/pocketbase/client'

import { Outlet, useOutletContext } from 'react-router-dom'

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

  const [draggedColId, setDraggedColId] = useState<string | null>(null)
  const isDraggingRef = useRef(false)

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
      await createColumn({
        board_id: id,
        name: 'Nova Coluna',
        sort_order: columns.length,
      })
    } catch (err: any) {
      toast({ title: 'Erro ao adicionar coluna', description: err.message, variant: 'destructive' })
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

      const temp = newCols[draggedIdx]
      newCols[draggedIdx] = newCols[targetIdx]
      newCols[targetIdx] = temp

      return newCols.map((c, idx) => ({ ...c, sort_order: idx }))
    })
  }

  const handleDragEnd = async (e: React.DragEvent, colId: string) => {
    setDraggedColId(null)
    isDraggingRef.current = false
    const el = document.getElementById(`col-${colId}`)
    if (el) el.style.opacity = '1'

    try {
      await updateColumnOrder(columns.map((c) => ({ id: c.id, sort_order: c.sort_order })))
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading || !board)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )

  const isAdmin = user?.role === 'admin'

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
            <h1 className="text-2xl font-display font-semibold tracking-tight flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: board.color || '#FFC300' }}
              />
              {board.name}
            </h1>
            {board.client_name && (
              <p className="text-sm text-muted-foreground">{board.client_name}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
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
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)}>
                <Settings className="w-4 h-4 mr-2" /> Editar
              </Button>
              <Button variant="outline" size="sm" onClick={handleArchive}>
                <Archive className="w-4 h-4 mr-2" /> Arquivar
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 animate-fade-in">
        <div className="flex gap-6 h-full items-start">
          {columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              cards={cards.filter((c) => c.column_id === col.id)}
              onDragStart={(e: any) => handleDragStart(e, col.id)}
              onDragEnter={(e: any) => handleDragEnter(e, col.id)}
              onDragEnd={(e: any) => handleDragEnd(e, col.id)}
              onDelete={async () => {
                if (confirm('Excluir coluna?')) {
                  await deleteColumn(col.id)
                }
              }}
              onUpdate={async (data: any) => {
                await updateColumn(col.id, data)
              }}
              onCardDrop={async (cardId: string, colId: string) => {
                try {
                  const card = cards.find((c) => c.id === cardId)
                  if (!card || card.column_id === colId) return
                  setCards((prev) =>
                    prev.map((c) => (c.id === cardId ? { ...c, column_id: colId } : c)),
                  )
                  await pb.collection('cards').update(cardId, { column_id: colId })
                  await pb.collection('activity_logs').create({
                    card_id: cardId,
                    user_id: user?.id,
                    action_type: 'move',
                    description: `Moveu o cartão para outra coluna`,
                  })
                } catch {
                  /* intentionally ignored */
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
      <Outlet context={{ cards, board, loadData }} />
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
      className="shrink-0 w-[300px] max-h-full flex flex-col bg-background/50 rounded-xl border border-border/50 shadow-subtle cursor-grab active:cursor-grabbing transition-colors hover:border-border"
    >
      <div
        className="p-3 flex items-center justify-between group border-b border-border/50"
        style={{
          borderTop: `4px solid ${column.color || '#e5e7eb'}`,
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
              {['#e5e7eb', '#FFC300', '#AA1677', '#3b82f6', '#10b981'].map((c) => (
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
                      sort_order: cards.length,
                      created_by: authId,
                      completed: false,
                    })
                    await pb.collection('activity_logs').create({
                      card_id: newCard.id,
                      user_id: authId,
                      action_type: 'creation',
                      description: 'Criou este cartão',
                    })
                  } catch {
                    /* intentionally ignored */
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
