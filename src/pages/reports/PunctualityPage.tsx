import { useEffect, useState, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, CartesianGrid } from 'recharts'
import { subDays, isAfter, parseISO } from 'date-fns'

export default function PunctualityPage() {
  const [logs, setLogs] = useState<{ completionLogs: any[]; incompleteCards: any[] }>({
    completionLogs: [],
    incompleteCards: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const sevenDaysAgo = subDays(new Date(), 7).toISOString()
        const now = new Date().toISOString()

        const completionLogs = await pb.collection('activity_logs').getFullList({
          filter: `action_type = 'completion' && created >= '${sevenDaysAgo}'`,
          expand: 'card_id,card_id.board_id,card_id.board_id.client_id',
        })

        const incompleteCards = await pb.collection('cards').getFullList({
          filter: `completed = false && due_date != '' && due_date < '${now}' && due_date >= '${sevenDaysAgo}'`,
          expand: 'board_id,board_id.client_id',
        })

        setLogs({ completionLogs, incompleteCards })
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [])

  const stats = useMemo(() => {
    let onTime = 0
    let delayed = 0
    const clientMap: Record<string, { onTime: number; delayed: number }> = {}
    const boardMap: Record<string, { onTime: number; delayed: number }> = {}

    const addStat = (isDelayed: boolean, boardName: string, clientName: string) => {
      if (isDelayed) delayed++
      else onTime++

      if (!boardMap[boardName]) boardMap[boardName] = { onTime: 0, delayed: 0 }
      if (!clientMap[clientName]) clientMap[clientName] = { onTime: 0, delayed: 0 }

      if (isDelayed) {
        boardMap[boardName].delayed++
        clientMap[clientName].delayed++
      } else {
        boardMap[boardName].onTime++
        clientMap[clientName].onTime++
      }
    }

    logs.completionLogs?.forEach((log) => {
      const card = log.expand?.card_id
      if (!card || !card.due_date) return

      const completionDate = parseISO(log.created)
      const dueDate = parseISO(card.due_date)

      const isDelayed = isAfter(completionDate, dueDate)

      const board = card.expand?.board_id
      const client = board?.expand?.client_id

      const boardName = board?.name || 'Desconhecido'
      const clientName = client?.name || board?.client_name || 'Sem Cliente'

      addStat(isDelayed, boardName, clientName)
    })

    logs.incompleteCards?.forEach((card) => {
      const board = card.expand?.board_id
      const client = board?.expand?.client_id

      const boardName = board?.name || 'Desconhecido'
      const clientName = client?.name || board?.client_name || 'Sem Cliente'

      addStat(true, boardName, clientName)
    })

    return {
      onTime,
      delayed,
      byClient: Object.entries(clientMap).map(([name, data]) => ({ name, ...data })),
      byBoard: Object.entries(boardMap).map(([name, data]) => ({ name, ...data })),
    }
  }, [logs])

  if (loading) {
    return (
      <div className="flex-1 p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const pieData = [
    { name: 'No Prazo', value: stats.onTime, fill: 'var(--color-onTime)' },
    { name: 'Atrasado', value: stats.delayed, fill: 'var(--color-delayed)' },
  ]

  const chartConfig = {
    onTime: { label: 'No Prazo', color: 'hsl(var(--chart-2))' },
    delayed: { label: 'Atrasado', color: 'hsl(var(--chart-1))' },
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-display font-bold tracking-tight">
          Pontualidade (Últimos 7 Dias)
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Geral</CardTitle>
            <CardDescription>Tarefas concluídas no prazo vs atrasadas.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {stats.onTime === 0 && stats.delayed === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="w-full h-[250px]">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Por Cliente</CardTitle>
            <CardDescription>Desempenho de entrega agrupado por cliente.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.byClient.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="w-full h-[250px]">
                <BarChart data={stats.byClient} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dashed" />}
                  />
                  <Bar dataKey="onTime" fill="var(--color-onTime)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="delayed" fill="var(--color-delayed)" radius={[4, 4, 0, 0]} />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Por Projeto (Quadro)</CardTitle>
            <CardDescription>Desempenho de entrega agrupado por quadro.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.byBoard.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="w-full h-[250px]">
                <BarChart data={stats.byBoard} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dashed" />}
                  />
                  <Bar dataKey="onTime" fill="var(--color-onTime)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="delayed" fill="var(--color-delayed)" radius={[4, 4, 0, 0]} />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
