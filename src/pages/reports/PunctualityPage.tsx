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
import {
  subDays,
  isAfter,
  parseISO,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from 'date-fns'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { useRealtime } from '@/hooks/use-realtime'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function PunctualityPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  })

  const [logs, setLogs] = useState<{ completionLogs: any[]; incompleteCards: any[] }>({
    completionLogs: [],
    incompleteCards: [],
  })
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    if (!dateRange?.from || !dateRange?.to) return
    try {
      setLoading(true)
      const fromStr = startOfDay(dateRange.from).toISOString()
      const toStr = endOfDay(dateRange.to).toISOString()
      const now = new Date().toISOString()

      const completionLogs = await pb.collection('activity_logs').getFullList({
        filter: `action_type = 'completion' && created >= '${fromStr}' && created <= '${toStr}'`,
        expand: 'card_id,card_id.board_id,card_id.board_id.client_id,user_id',
      })

      const incompleteCards = await pb.collection('cards').getFullList({
        filter: `completed = false && due_date != '' && due_date < '${now}' && due_date >= '${fromStr}'`,
        expand: 'board_id,board_id.client_id',
      })

      setLogs({ completionLogs, incompleteCards })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [dateRange])

  useRealtime('activity_logs', () => fetchLogs())
  useRealtime('cards', () => fetchLogs())

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

  const leaderboard = useMemo(() => {
    const userStats: Record<string, { user: any; onTime: number; delayed: number }> = {}

    logs.completionLogs?.forEach((log) => {
      const card = log.expand?.card_id
      const user = log.expand?.user_id
      if (!card || !user || !card.due_date) return

      if (!userStats[user.id]) {
        userStats[user.id] = { user, onTime: 0, delayed: 0 }
      }

      const completionDate = parseISO(log.created)
      const dueDate = parseISO(card.due_date)
      const isDelayed = isAfter(completionDate, dueDate)

      if (isDelayed) userStats[user.id].delayed++
      else userStats[user.id].onTime++
    })

    return Object.values(userStats)
      .map((stat) => {
        const total = stat.onTime + stat.delayed
        const rate = total > 0 ? (stat.onTime / total) * 100 : 0
        return { ...stat, total, rate }
      })
      .sort((a, b) => b.rate - a.rate)
  }, [logs])

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
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <h2 className="text-3xl font-display font-bold tracking-tight">
          Pontualidade e Desempenho
        </h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
            >
              7 Dias
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
            >
              30 Dias
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })
              }
            >
              Mês Atual
            </Button>
          </div>
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
        </div>
      </div>

      {loading && stats.onTime === 0 && stats.delayed === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Geral</CardTitle>
                <CardDescription>
                  Tarefas concluídas no prazo vs atrasadas no período.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                {stats.onTime === 0 && stats.delayed === 0 ? (
                  <div className="h-[250px] w-full flex items-center justify-center text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                    Sem dados no período
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
                <CardDescription>
                  Desempenho de entrega agrupado por cliente no período.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.byClient.length === 0 ? (
                  <div className="h-[250px] w-full flex items-center justify-center text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                    Sem dados no período
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className="w-full h-[250px]">
                    <BarChart
                      data={stats.byClient}
                      margin={{ top: 20, right: 0, left: 0, bottom: 0 }}
                    >
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
                <CardTitle>Ranking de Produtividade</CardTitle>
                <CardDescription>
                  Membros da equipe com melhores taxas de entrega no prazo para o período.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                    Nenhuma tarefa com prazo definido foi concluída no período selecionado.
                  </div>
                ) : (
                  <div className="rounded-md border shadow-subtle overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Membro</TableHead>
                          <TableHead className="text-right">Taxa de Pontualidade</TableHead>
                          <TableHead className="text-right">No Prazo</TableHead>
                          <TableHead className="text-right">Atrasadas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderboard.map((stat) => (
                          <TableRow key={stat.user.id}>
                            <TableCell className="flex items-center gap-3 py-3">
                              <Avatar className="h-8 w-8 shadow-sm">
                                <AvatarImage
                                  src={
                                    stat.user.avatar
                                      ? pb.files.getURL(stat.user, stat.user.avatar)
                                      : ''
                                  }
                                />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                  {stat.user.name?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{stat.user.name}</span>
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              {stat.rate.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right text-emerald-600 font-medium">
                              {stat.onTime}
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-medium">
                              {stat.delayed}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
