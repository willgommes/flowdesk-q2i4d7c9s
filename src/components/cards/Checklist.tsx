import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'

export function Checklist({ cardId, items, onChange }: any) {
  const [newItem, setNewItem] = useState('')

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
            <div key={item.id} className="flex items-center gap-2">
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
