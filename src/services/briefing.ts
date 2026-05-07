import pb from '@/lib/pocketbase/client'
import { isBefore, isToday, addHours, parseISO } from 'date-fns'

export async function getBriefingCards(userId: string, role: string) {
  const boards = await pb.collection('boards').getFullList({
    filter: role === 'admin' ? 'archived != true' : `members ~ "${userId}" && archived != true`,
  })
  const boardIds = boards.map((b) => b.id)

  if (boardIds.length === 0) return { overdue: [], today: [], next24hCards: [] }

  const boardFilter = boardIds.map((id) => `board_id = "${id}"`).join(' || ')

  const cards = await pb.collection('cards').getFullList({
    filter: `(${boardFilter}) && completed = false && archived != true && is_recurring != true && due_date != ""`,
    expand: 'board_id,board_id.client_id,column_id',
  })

  const now = new Date()
  const next24h = addHours(now, 24)

  const overdue: any[] = []
  const today: any[] = []
  const next24hCards: any[] = []

  cards.forEach((card) => {
    const dueDate = parseISO(card.due_date)
    if (isBefore(dueDate, now)) {
      overdue.push(card)
    } else if (isToday(dueDate)) {
      today.push(card)
    } else if (isBefore(dueDate, next24h)) {
      next24hCards.push(card)
    }
  })

  return { overdue, today, next24hCards }
}
