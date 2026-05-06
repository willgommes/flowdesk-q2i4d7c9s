import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { useNavigate } from 'react-router-dom'
import { useRef, useEffect } from 'react'

type NotificationEvent = {
  boardId: string
  boardName?: string
  cardId: string
  cardTitle: string
  actionType: string
  actionDesc: string
  columnName?: string
  dueDate?: string
  actorName: string
}

export function useBrowserNotifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const bufferRef = useRef<NotificationEvent[]>([])
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleNotificationClick = (boardId: string, cardId: string) => {
    window.focus()
    navigate(`/boards/${boardId}/cards/${cardId}`)
  }

  const showNotification = (title: string, body: string, boardId: string, cardId: string) => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    if (!user?.notifications_enabled) return

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
    })

    notification.onclick = () => {
      handleNotificationClick(boardId, cardId)
      notification.close()
    }
  }

  const processBuffer = () => {
    const events = bufferRef.current
    bufferRef.current = []
    if (events.length === 0) return

    if (events.length > 3) {
      showNotification(
        'Múltiplas atualizações',
        `Você tem ${events.length} novas atualizações em seus quadros.`,
        events[events.length - 1].boardId,
        events[events.length - 1].cardId,
      )
    } else {
      events.forEach((ev) => {
        let title = 'Tarefa Atualizada'
        if (ev.actionType === 'comment_add') title = 'Novo Comentário'
        else if (ev.actionType === 'move') title = 'Tarefa Movida'
        else if (ev.actionType === 'assignment_add' || ev.actionType === 'assigned_to_you')
          title = 'Nova Atribuição'
        else if (ev.actionType === 'creation') title = 'Nova Tarefa'

        let body = ev.cardTitle
        if (ev.columnName) body += `\nStatus: ${ev.columnName}`
        if (ev.dueDate) {
          try {
            const date = new Date(ev.dueDate)
            const formattedDate = new Intl.DateTimeFormat('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: user?.time_format === '24h' ? '2-digit' : 'numeric',
              minute: '2-digit',
              hour12: user?.time_format === '12h',
            }).format(date)
            body += `\nPrazo: ${formattedDate}`
          } catch {
            /* intentionally ignored */
          }
        }

        if (ev.actorName && !body.includes(ev.actorName)) {
          body = `${ev.actorName} ${ev.actionDesc}\n${body}`
        }

        showNotification(title, body, ev.boardId, ev.cardId)
      })
    }
  }

  const queueNotification = (event: NotificationEvent) => {
    bufferRef.current.push(event)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(processBuffer, 5000)
  }

  useEffect(() => {
    if (
      user?.notifications_enabled &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      Notification.requestPermission()
    }
  }, [user?.notifications_enabled])

  useRealtime(
    'activity_logs',
    async (e) => {
      if (e.action === 'create') {
        const log = e.record
        if (log.user_id === user?.id) return
        if (!log.card_id) return

        try {
          const card = await pb
            .collection('cards')
            .getOne(log.card_id, { expand: 'board_id,column_id' })

          const isBoardMember = card.expand?.board_id?.members?.includes(user?.id)

          const memberList = await pb
            .collection('card_members')
            .getList(1, 1, { filter: `card_id="${log.card_id}" && user_id="${user?.id}"` })
          const isCardMember = memberList.items.length > 0

          if (isBoardMember || isCardMember) {
            const actor = await pb.collection('users').getOne(log.user_id)

            let actionDesc = log.description || ''
            if (!actionDesc) {
              switch (log.action_type) {
                case 'move':
                  actionDesc = 'moveu o card'
                  break
                case 'edit_title':
                  actionDesc = 'editou o título'
                  break
                case 'edit_desc':
                  actionDesc = 'editou a descrição'
                  break
                case 'comment_add':
                  actionDesc = 'adicionou um comentário'
                  break
                case 'attachment_add':
                  actionDesc = 'adicionou um anexo'
                  break
                case 'assignment_add':
                  actionDesc = 'adicionou um membro'
                  break
                case 'assignment_remove':
                  actionDesc = 'removeu um membro'
                  break
                case 'label_add':
                  actionDesc = 'adicionou uma etiqueta'
                  break
                case 'label_remove':
                  actionDesc = 'removeu uma etiqueta'
                  break
                case 'date_change':
                  actionDesc = 'alterou a data'
                  break
                case 'completion':
                  actionDesc = 'alterou o status de conclusão'
                  break
                default:
                  actionDesc = 'atualizou o card'
              }
            }

            queueNotification({
              boardId: card.board_id,
              boardName: card.expand?.board_id?.name,
              cardId: card.id,
              cardTitle: card.title,
              actionType: log.action_type,
              actionDesc,
              columnName: card.expand?.column_id?.name,
              dueDate: card.due_date,
              actorName: actor.name,
            })
          }
        } catch (err) {
          console.error('Error in activity log realtime check', err)
        }
      }
    },
    !!user?.notifications_enabled,
  )

  useRealtime(
    'card_members',
    async (e) => {
      if (e.action === 'create') {
        const member = e.record
        if (member.user_id === user?.id) {
          try {
            const card = await pb
              .collection('cards')
              .getOne(member.card_id, { expand: 'board_id,column_id' })
            queueNotification({
              boardId: card.board_id,
              boardName: card.expand?.board_id?.name,
              cardId: card.id,
              cardTitle: card.title,
              actionType: 'assigned_to_you',
              actionDesc: 'Você foi adicionado a este card',
              columnName: card.expand?.column_id?.name,
              dueDate: card.due_date,
              actorName: '',
            })
          } catch (err) {
            console.error('Error fetching card for new member notification', err)
          }
        }
      }
    },
    !!user?.notifications_enabled,
  )

  useRealtime(
    'cards',
    async (e) => {
      // Just listen to fulfill tracking criteria, though we use activity_logs for rich notifications
      if (e.action === 'update' || e.action === 'delete') {
        // Silently processed as activity logs provide the needed contextual data and actor verification
      }
    },
    !!user?.notifications_enabled,
  )
}
