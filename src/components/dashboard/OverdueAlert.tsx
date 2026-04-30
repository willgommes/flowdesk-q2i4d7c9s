import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircleIcon } from 'lucide-react'
import { isPast } from 'date-fns'

export function OverdueAlert({ cards }: { cards: any[] }) {
  const overdueTasks = cards.filter(
    (c) => c.due_date && !c.completed && !c.archived && isPast(new Date(c.due_date)),
  )

  if (overdueTasks.length === 0) return null

  return (
    <Alert
      variant="destructive"
      className="mb-6 border-red-500/50 bg-red-500/5 dark:bg-red-500/10 text-red-600 dark:text-red-400"
    >
      <AlertCircleIcon className="h-5 w-5" />
      <AlertTitle className="text-base font-semibold">Tarefas Atrasadas</AlertTitle>
      <AlertDescription>
        Você tem {overdueTasks.length} tarefa{overdueTasks.length > 1 ? 's' : ''} com o prazo
        expirado:
        <ul className="mt-2 list-disc list-inside pl-2 text-sm space-y-1">
          {overdueTasks.slice(0, 3).map((t) => (
            <li key={t.id}>
              <span className="font-medium">{t.title}</span>{' '}
              <span className="opacity-80 text-xs">({t.expand?.board_id?.name})</span>
            </li>
          ))}
          {overdueTasks.length > 3 && (
            <li className="text-xs opacity-80 pt-1">... e mais {overdueTasks.length - 3}</li>
          )}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
