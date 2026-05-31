import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'

export function ActivityLog({ cardId }: { cardId: string }) {
  const { user } = useAuth()
  const [logs, setLogs] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  const timeFormatStr = user?.time_format === '12h' ? 'hh:mm a' : 'HH:mm'

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
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full bg-white/5 hover:bg-white/10 border-white/10 hover:border-emerald-500/30 text-gray-300 transition-all"
      >
        Mostrar histórico ({logs.length})
      </Button>
    )

  return (
    <div className="space-y-3 bg-white/5 border border-white/10 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-semibold text-gray-300">Histórico de Atividades</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          className="h-6 px-2 text-xs hover:bg-white/10 hover:text-white"
        >
          Ocultar
        </Button>
      </div>
      <div className="space-y-5 max-h-[300px] overflow-y-auto pl-3 border-l border-white/10 ml-1">
        {logs.map((log) => (
          <div key={log.id} className="relative flex gap-3 text-sm items-start group">
            <div className="absolute -left-[17.5px] top-1.5 w-2 h-2 rounded-full border-2 border-emerald-500/50 bg-background group-hover:border-emerald-500 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all" />
            <div className="flex flex-col">
              <div className="flex gap-1.5 items-center">
                <span className="font-semibold text-gray-100">
                  {log.expand?.user_id?.name || 'Alguém'}
                </span>
                <span className="text-gray-400">{log.description}</span>
              </div>
              <span className="text-xs text-gray-400 mt-0.5">
                {format(new Date(log.created), `dd/MM/yyyy ${timeFormatStr}`)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
