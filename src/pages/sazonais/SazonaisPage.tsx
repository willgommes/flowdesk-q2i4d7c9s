import { useState, useEffect, useMemo } from 'react'
import { Search, CalendarDays } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { AppHeader } from '@/components/AppHeader'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

export default function SazonaisPage() {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [monthFilter, setMonthFilter] = useState('all')

  useEffect(() => {
    const fetchCards = async () => {
      try {
        // Fetch all seasonal events (Google Calendar synced) without limiting to 15.
        // We use a high limit (5000) to act as a "fetch all" strategy for large datasets.
        const records = await pb.collection('cards').getFullList(5000, {
          filter: `google_event_id != ''`,
          sort: 'due_date',
          expand: 'board_id.client_id,column_id',
        })
        setCards(records)
      } catch (e) {
        console.error('Error fetching sazonais:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchCards()
  }, [])

  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))

      let matchesMonth = true
      if (monthFilter !== 'all' && c.due_date) {
        const date = new Date(c.due_date)
        const month = date.getMonth().toString()
        matchesMonth = month === monthFilter
      }

      return matchesSearch && matchesMonth
    })
  }, [cards, searchTerm, monthFilter])

  const months = [
    { value: '0', label: 'Janeiro' },
    { value: '1', label: 'Fevereiro' },
    { value: '2', label: 'Março' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Maio' },
    { value: '5', label: 'Junho' },
    { value: '6', label: 'Julho' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Setembro' },
    { value: '9', label: 'Outubro' },
    { value: '10', label: 'Novembro' },
    { value: '11', label: 'Dezembro' },
  ]

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/10">
      <AppHeader />
      <div className="flex-1 overflow-auto p-6 md:p-8 animate-fade-in">
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight">Sazonais</h1>
            <p className="text-muted-foreground mt-1">
              Visão global de todos os eventos e rotinas sazonais sincronizados do Google Calendar.
            </p>
          </div>

          <div className="bg-background rounded-xl border shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Mês da Sazonalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os meses</SelectItem>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4 mt-6 border rounded-md overflow-hidden bg-background">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium">Evento</th>
                      <th className="px-4 py-3 font-medium">Data</th>
                      <th className="px-4 py-3 font-medium">Cliente / Quadro</th>
                      <th className="px-4 py-3 font-medium">Coluna</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3">
                          <Skeleton className="h-5 w-[200px]" />
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-5 w-[100px]" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[150px]" />
                            <Skeleton className="h-3 w-[100px]" />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Skeleton className="h-5 w-[80px] rounded-full" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden bg-background shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium">Evento</th>
                      <th className="px-4 py-3 font-medium">Data</th>
                      <th className="px-4 py-3 font-medium">Cliente / Quadro</th>
                      <th className="px-4 py-3 font-medium">Status / Coluna</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCards.length > 0 ? (
                      filteredCards.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{c.title}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <CalendarDays className="w-4 h-4 text-primary" />
                              {c.due_date ? new Date(c.due_date).toLocaleDateString('pt-BR') : '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">
                                {c.expand?.board_id?.expand?.client_id?.name ||
                                  c.expand?.board_id?.client_name ||
                                  'Sem Cliente'}
                              </span>
                              <span className="text-xs text-muted-foreground mt-0.5">
                                Quadro: {c.expand?.board_id?.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {c.completed ? (
                                <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200">
                                  Concluído
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-background">
                                  {c.expand?.column_id?.name || 'Sem Coluna'}
                                </Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-muted-foreground">
                          Nenhum evento sazonal encontrado com os filtros atuais.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && (
              <div className="flex justify-between items-center text-sm text-muted-foreground border-t pt-4">
                <span>
                  Mostrando <strong className="text-foreground">{filteredCards.length}</strong>{' '}
                  {filteredCards.length === 1 ? 'evento' : 'eventos'}
                  {cards.length > 0 && ` de um total de ${cards.length} sincronizados`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
