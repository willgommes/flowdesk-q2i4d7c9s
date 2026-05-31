import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircleIcon } from 'lucide-react'
import { isPast, format } from 'date-fns'

export function OverdueAlert({ cards }: { cards: any[] }) {
  const overdueTasks = cards.filter(
    (c) => c.due_date && !c.completed && !c.archived && isPast(new Date(c.due_date)),
  )

  if (overdueTasks.length === 0) return null

  return (
    <Alert className="mb-6 backdrop-blur-xl border border-red-500/20 bg-red-500/10 text-red-400 [&>svg]:text-red-400 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
      <AlertCircleIcon className="h-5 w-5" />
      <AlertTitle className="text-base font-semibold">Tarefas Atrasadas</AlertTitle>
      <AlertDescription className="text-red-400/90">
        Você tem {overdueTasks.length} tarefa{overdueTasks.length > 1 ? 's' : ''} com o prazo
        expirado:
        <ul className="mt-2 list-disc list-inside pl-2 text-sm space-y-1">
          {overdueTasks.slice(0, 3).map((t) => (
            <li key={t.id}>
              <span className="font-medium">{t.title}</span>
              {t.due_date && (
                <span className="opacity-90"> | {format(new Date(t.due_date), 'dd/MM')}</span>
              )}{' '}
              <span className="opacity-70 text-xs uppercase">
                (
                {t.expand?.board_id?.expand?.client_id?.name ||
                  t.expand?.board_id?.client_name ||
                  'Interno'}{' '}
                - {t.expand?.board_id?.name})
              </span>
            </li>
          ))}
          {overdueTasks.length > 3 && (
            <li className="text-xs opacity-70 pt-1">... e mais {overdueTasks.length - 3}</li>
          )}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
