import pb from '@/lib/pocketbase/client'

export const getDashboardData = async (boardIds: string[], memberId?: string) => {
  if (!boardIds || boardIds.length === 0) return { cards: [], priorityCards: [] }

  let assignedCardIds = new Set<string>()
  if (memberId) {
    try {
      const members = await pb.collection('card_members').getFullList({
        filter: `user_id='${memberId}'`,
      })
      members.forEach((m) => assignedCardIds.add(m.card_id))
    } catch (e) {
      console.error('Failed to fetch card members', e)
    }
  }

  const chunkSize = 30
  let cards: any[] = []
  let recurringCards: any[] = []

  for (let i = 0; i < boardIds.length; i += chunkSize) {
    const chunk = boardIds.slice(i, i + chunkSize)
    const boardsFilter = chunk.map((id) => `board_id='${id}'`).join('||')

    const chunkCards = await pb.collection('cards').getFullList({
      filter: `archived = false && (${boardsFilter})`,
      expand: 'board_id,board_id.client_id',
    })

    cards.push(...chunkCards.filter((c) => !c.is_recurring))
    recurringCards.push(
      ...chunkCards.filter(
        (c) =>
          c.is_recurring &&
          c.approval_status !== 'pending_approval' &&
          c.approval_status !== 'rejected',
      ),
    )
  }

  if (memberId) {
    cards = cards.filter((c) => assignedCardIds.has(c.id))
    recurringCards = recurringCards.filter((c) => assignedCardIds.has(c.id))
  }

  let priorityCards: any[] = []
  const priorityLabels = await pb.collection('labels').getFullList({
    filter: `is_system=true && (name='Urgente' || name='Alta Prioridade')`,
  })

  if (priorityLabels.length > 0) {
    const labelsIds = priorityLabels.map((l) => `label_id='${l.id}'`).join('||')
    const cardLabels = await pb.collection('card_labels').getFullList({
      filter: `(${labelsIds})`,
      expand: 'card_id,card_id.board_id,card_id.board_id.client_id,label_id',
    })

    const pCardsRaw = cardLabels
      .map((cl) => {
        const card = cl.expand?.card_id
        if (!card) return null
        return { ...card, label: cl.expand?.label_id }
      })
      .filter(
        (c) => c && c.archived !== true && c.is_recurring !== true && boardIds.includes(c.board_id),
      )

    const uniqueCards = new Map()
    for (const c of pCardsRaw) {
      if (c && !uniqueCards.has(c.id)) {
        if (!memberId || assignedCardIds.has(c.id)) {
          uniqueCards.set(c.id, c)
        }
      }
    }
    priorityCards = Array.from(uniqueCards.values())
  }

  return { cards, priorityCards, recurringCards }
}
