import { useState, useEffect } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'

export function ActivityLog({ cardId }: { cardId: string }) {
  const [logs, setLogs] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  const load = () => {
    pb.collection('activity_logs')
      .getFullList({ filter: `card_id='${cardId}'`, expand: 'user_id', sort: '-created' })
      .then(setLogs)
  }

  useEffect(() => {
    load()
  }, [cardId])
  useRealtime('activity_logs', () => load())

  if (!open)
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="w-full">
        Mostrar histórico ({logs.length})
      </Button>
    )

  return (
    <div className="space-y-3 bg-muted/30 p-3 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-muted-foreground">Histórico de Atividades</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          className="h-6 px-2 text-xs"
        >
          Ocultar
        </Button>
      </div>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 text-sm items-start">
            <span className="font-medium shrink-0">{log.expand?.user_id?.name || 'Alguém'}</span>
            <span className="text-muted-foreground">{log.description}</span>
            <span className="text-xs text-muted-foreground ml-auto shrink-0 pt-0.5">
              {new Date(log.created).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
