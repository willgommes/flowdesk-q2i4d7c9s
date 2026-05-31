import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, FilterX, Clock } from 'lucide-react'

import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { getHistoryLogs, ActivityFilter } from '@/services/activity_logs'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const ACTION_LABELS: Record<string, string> = {
  creation: 'Criou o cartão',
  move: 'Moveu o cartão',
  edit_title: 'Editou o título',
  edit_desc: 'Editou a descrição',
  label_add: 'Adicionou uma etiqueta',
  label_remove: 'Removeu uma etiqueta',
  assignment_add: 'Atribuiu um membro',
  assignment_remove: 'Removeu um membro',
  attachment_add: 'Adicionou um anexo',
  comment_add: 'Adicionou um comentário',
  date_change: 'Alterou a data de entrega',
  completion: 'Marcou como concluído',
  briefing_read: 'Leu o briefing',
  briefing_pending: 'Briefing marcado como pendente',
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  const [userId, setUserId] = useState<string>('_all')
  const [actionType, setActionType] = useState<string>('_all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [quickDate, setQuickDate] = useState<string>('custom')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setCurrentPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await pb.collection('users').getFullList({ sort: 'name' })
        setUsers(res)
      } catch (err) {
        console.error('Error fetching users:', err)
      }
    }
    fetchUsers()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const filters: ActivityFilter = {}
      if (userId && userId !== '_all') filters.userId = userId
      if (actionType && actionType !== '_all') filters.actionType = actionType
      if (startDate) {
        filters.startDate = new Date(startDate + 'T00:00:00').toISOString()
      }
      if (endDate) {
        const d = new Date(endDate + 'T00:00:00')
        d.setHours(23, 59, 59, 999)
        filters.endDate = d.toISOString()
      }
      if (debouncedSearch) filters.search = debouncedSearch

      const res = await getHistoryLogs(currentPage, 20, filters)
      setLogs(res.items)
      setTotalPages(res.totalPages)
    } catch (err) {
      console.error('Error fetching logs:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentPage, userId, actionType, startDate, endDate, debouncedSearch])

  useRealtime('activity_logs', () => {
    if (currentPage === 1) {
      loadData()
    }
  })

  const clearFilters = () => {
    setUserId('_all')
    setActionType('_all')
    setStartDate('')
    setEndDate('')
    setQuickDate('custom')
    setSearch('')
    setDebouncedSearch('')
    setCurrentPage(1)
  }

  const handleQuickDate = (val: string) => {
    setQuickDate(val)
    setCurrentPage(1)
    if (val === '7days') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      setStartDate(format(d, 'yyyy-MM-dd'))
      setEndDate('')
    } else if (val === '30days') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      setStartDate(format(d, 'yyyy-MM-dd'))
      setEndDate('')
    } else {
      setStartDate('')
      setEndDate('')
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-[calc(100vh-4rem)] md:h-screen overflow-y-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Histórico de Atividades</h2>
      </div>

      <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição ou nome do cartão..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select
          value={userId}
          onValueChange={(val) => {
            setUserId(val)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Usuário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todos os usuários</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name || u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={actionType}
          onValueChange={(val) => {
            setActionType(val)
            setCurrentPage(1)
          }}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Tipo de Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas as ações</SelectItem>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex space-x-2 items-center flex-wrap gap-y-2">
          <Select value={quickDate} onValueChange={handleQuickDate}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Personalizado</SelectItem>
              <SelectItem value="7days">Últimos 7 dias</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>

          {quickDate === 'custom' && (
            <>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-[140px]"
              />
              <span className="flex items-center text-muted-foreground">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-[140px]"
              />
            </>
          )}
        </div>

        <Button variant="outline" onClick={clearFilters} title="Limpar Filtros">
          <FilterX className="h-4 w-4" />
        </Button>
      </div>

      <div className="border border-white/10 rounded-md bg-white/5 backdrop-blur-xl text-gray-100 shadow-sm">
        <div className="p-0">
          {isLoading && logs.length === 0 ? (
            <div className="p-8 text-center text-gray-400 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mr-2"></div>
              Carregando histórico...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Nenhuma atividade encontrada com os filtros selecionados.
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {logs.map((log) => {
                const user = log.expand?.user_id
                const card = log.expand?.card_id
                const avatarUrl = user?.avatar ? pb.files.getURL(user, user.avatar) : ''

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 hover:bg-white/10 transition-colors"
                  >
                    <Avatar className="h-10 w-10 border border-white/10">
                      <AvatarImage src={avatarUrl} alt={user?.name || 'User'} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {(user?.name || 'U').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium leading-none">
                          <span className="font-semibold text-gray-100">
                            {user?.name || 'Usuário Desconhecido'}
                          </span>{' '}
                          <span className="text-gray-400">
                            {ACTION_LABELS[log.action_type] || log.action_type}
                          </span>{' '}
                          {card && <span className="font-medium text-gray-100">{card.title}</span>}
                        </p>
                        <div className="flex items-center text-xs text-gray-400 whitespace-nowrap ml-4">
                          <Clock className="mr-1 h-3 w-3" />
                          {format(parseISO(log.created), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                      {log.description && (
                        <p className="text-sm text-gray-400 mt-1 bg-white/5 p-2 rounded border border-white/10">
                          {log.description}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>
          <div className="text-sm text-muted-foreground px-4">
            Página {currentPage} de {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}
    </div>
  )
}
