import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { PieChart, Pie, Cell } from 'recharts'

export function AnalyticsDistributionWidget({
  cards,
  priorityCards,
  loading,
}: {
  cards: any[]
  priorityCards: any[]
  loading: boolean
}) {
  const chartData = useMemo(() => {
    if (!cards || !priorityCards) return []
    const completed = cards.filter((c) => c.completed).length
    const priority = priorityCards.filter((c) => !c.completed).length
    const pendingNormal = cards.filter((c) => !c.completed).length - priority

    return [
      { name: 'Concluídas', value: completed, fill: 'var(--color-completed)' },
      { name: 'Alta Prioridade', value: priority, fill: 'var(--color-priority)' },
      { name: 'Pendentes', value: pendingNormal, fill: 'var(--color-pending)' },
    ].filter((item) => item.value > 0) // Hide empty segments completely
  }, [cards, priorityCards])

  const config = {
    completed: { label: 'Concluídas', color: 'hsl(var(--primary))' },
    priority: { label: 'Alta Prioridade', color: 'hsl(var(--destructive))' },
    pending: { label: 'Pendentes', color: 'hsl(var(--muted-foreground))' },
  }

  if (loading) {
    return (
      <Card className="h-full min-h-[300px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Distribuição de Produtividade</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px] flex items-center justify-center">
        {chartData.length > 0 ? (
          <ChartContainer config={config} className="w-full h-full max-h-[250px]">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={2}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <ChartLegend content={<ChartLegendContent />} className="flex-wrap" />
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="text-sm text-muted-foreground italic flex h-full items-center justify-center">
            Nenhuma tarefa encontrada
          </div>
        )}
      </CardContent>
    </Card>
  )
}
