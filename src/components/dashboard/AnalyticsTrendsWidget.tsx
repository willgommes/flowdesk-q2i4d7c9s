import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { format, subDays, startOfDay } from 'date-fns'

export function AnalyticsTrendsWidget({ cards, loading }: { cards: any[]; loading: boolean }) {
  const chartData = useMemo(() => {
    if (!cards) return []
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i)
      return {
        date: startOfDay(d),
        label: format(d, 'dd/MM'),
        concluidas: 0,
      }
    })

    cards.forEach((c) => {
      if (c.completed && c.updated) {
        const ud = new Date(c.updated)
        const dayMatch = days.find((d) => d.date.getTime() === startOfDay(ud).getTime())
        if (dayMatch) {
          dayMatch.concluidas++
        }
      }
    })
    return days
  }, [cards])

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
        <CardTitle className="text-base font-semibold">
          Tarefas Concluídas (Últimos 7 Dias)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-[250px] p-0 px-4 pb-4">
        <ChartContainer
          config={{ concluidas: { label: 'Concluídas', color: 'hsl(var(--primary))' } }}
          className="w-full h-full"
        >
          <BarChart data={chartData} margin={{ top: 20, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} tickMargin={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={40}
              allowDecimals={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="concluidas"
              fill="var(--color-concluidas)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
