import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'

import { GripVertical } from 'lucide-react'

export function Checklist({ cardId, items, onChange }: any) {
  const [newItem, setNewItem] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!newItem.trim()) return
    await pb.collection('checklist_items').create({
      card_id: cardId,
      text: newItem,
      completed: false,
      sort_order: items.length,
    })
    setNewItem('')
    onChange()
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) return

    const newItems = [...items].sort((a, b) => a.sort_order - b.sort_order)
    const draggedIdx = newItems.findIndex((i) => i.id === draggedId)
    const targetIdx = newItems.findIndex((i) => i.id === targetId)

    const [draggedItem] = newItems.splice(draggedIdx, 1)
    newItems.splice(targetIdx, 0, draggedItem)

    // Optimistic update logic could go here if we had local state for items,
    // but we can just update backend and call onChange
    await Promise.all(
      newItems.map((item, idx) =>
        pb.collection('checklist_items').update(item.id, { sort_order: idx }),
      ),
    )
    setDraggedId(null)
    onChange()
  }

  const toggle = async (id: string, current: boolean) => {
    await pb.collection('checklist_items').update(id, { completed: !current })
    onChange()
  }

  const remove = async (id: string) => {
    await pb.collection('checklist_items').delete(id)
    onChange()
  }

  const percent = items.length
    ? Math.round((items.filter((i: any) => i.completed).length / items.length) * 100)
    : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Progresso {percent}%</span>
        <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>
      <div className="space-y-2">
        {items
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((item: any) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 p-1 rounded-md transition-colors ${draggedId === item.id ? 'opacity-50 bg-muted' : 'hover:bg-muted/50'}`}
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, item.id)}
            >
              <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                <GripVertical className="w-4 h-4" />
              </div>
              <Checkbox
                checked={item.completed}
                onCheckedChange={() => toggle(item.id, item.completed)}
              />
              <span
                className={`text-sm flex-1 ${item.completed ? 'line-through text-muted-foreground' : ''}`}
              >
                {item.text}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => remove(item.id)}
              >
                ×
              </Button>
            </div>
          ))}
      </div>
      <Input
        value={newItem}
        onChange={(e) => setNewItem(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        placeholder="Adicionar item..."
        className="h-8 text-sm"
      />
    </div>
  )
}
