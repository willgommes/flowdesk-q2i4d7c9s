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
      <div className="space-y-4 max-h-[300px] overflow-y-auto pl-2 border-l-2 border-border/50 ml-2">
        {logs.map((log) => (
          <div key={log.id} className="relative flex gap-3 text-sm items-start">
            <div className="absolute -left-[17px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary/50 border-2 border-background" />
            <div className="flex flex-col">
              <div className="flex gap-1.5 items-center">
                <span className="font-semibold text-foreground">
                  {log.expand?.user_id?.name || 'Alguém'}
                </span>
                <span className="text-muted-foreground">{log.description}</span>
              </div>
              <span className="text-xs text-muted-foreground mt-0.5">
                {new Date(log.created).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
