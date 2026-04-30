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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppHeader } from '@/components/AppHeader'
import pb from '@/lib/pocketbase/client'

export default function BoardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [board, setBoard] = useState<any>(null)
  const [columns, setColumns] = useState<any[]>([])
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
    </div>
  )
}

function Column({ column, onDragStart, onDragEnter, onDragEnd, onDelete, onUpdate }: any) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(column.name)
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
              0
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

      <div className="p-3 flex-1 overflow-y-auto min-h-[100px] flex flex-col gap-2">
        <Button
          variant="ghost"
          className="w-full text-muted-foreground justify-start text-sm h-8 border border-dashed hover:bg-muted"
        >
          <Plus className="w-4 h-4 mr-2" /> Adicionar cartão
        </Button>
      </div>
    </div>
  )
}
