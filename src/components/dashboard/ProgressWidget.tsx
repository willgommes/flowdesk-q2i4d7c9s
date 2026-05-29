import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, GripVertical } from 'lucide-react'

export function ProgressWidget({ cards, loading }: { cards: any[]; loading: boolean }) {
  const totalCards = cards.length
  const completedCards = cards.filter((c) => c.completed).length
  const progressPercentage = totalCards === 0 ? 0 : Math.round((completedCards / totalCards) * 100)

  return (
    <Card className="flex flex-col h-full group/widget">
      <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0 cursor-grab active:cursor-grabbing">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Progresso Global
          </CardTitle>
          <CardDescription className="text-xs">Taxa de conclusão de tarefas</CardDescription>
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover/widget:text-foreground transition-colors" />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-3 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <div className="text-4xl font-display font-bold tracking-tight text-primary">
                {progressPercentage}%
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{completedCards}</span> de{' '}
                <span className="font-medium text-foreground">{totalCards}</span> tarefas concluídas
              </div>
            </div>
            <Progress value={progressPercentage} className="h-2.5" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
