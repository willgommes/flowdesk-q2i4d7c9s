import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getBriefingCards } from '@/services/briefing'

export function usePushNotifications() {
  const { user } = useAuth()
  const intervalRef = useRef<any>(null)

  useEffect(() => {
    if (!user) return

    const requestPermission = async () => {
      if (!('Notification' in window)) return
      if (Notification.permission === 'default') {
        await Notification.requestPermission()
      }
    }

    const checkAndNotify = async () => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return

      try {
        const { overdue, today, next24hCards } = await getBriefingCards(user.id, user.role)
        const allCards = [...overdue, ...today, ...next24hCards]

        const notified = JSON.parse(localStorage.getItem('notified_cards') || '{}')
        let updated = false

        allCards.forEach((card) => {
          if (!notified[card.id]) {
            const dueDate = new Date(card.due_date).toLocaleString()
            new Notification('Tarefa Próxima do Vencimento', {
              body: `${card.title} vence em: ${dueDate}\nQuadro: ${card.expand?.board_id?.name || ''}`,
            })
            notified[card.id] = true
            updated = true
          }
        })

        if (updated) {
          localStorage.setItem('notified_cards', JSON.stringify(notified))
        }
      } catch (error) {
        console.error('Error checking for push notifications', error)
      }
    }

    requestPermission().then(() => {
      checkAndNotify()
      intervalRef.current = setInterval(checkAndNotify, 5 * 60 * 1000)
    })

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [user])
}
