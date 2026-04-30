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
  const labels: any[] = []

  for (let i = 0; i < boardIds.length; i += chunkSize) {
    const chunk = boardIds.slice(i, i + chunkSize)
    const boardsFilter = chunk.map((id) => `board_id='${id}'`).join('||')

    const chunkCards = await pb.collection('cards').getFullList({
      filter: `archived != true && (${boardsFilter})`,
      expand: 'board_id',
    })
    cards.push(...chunkCards)

    const chunkLabels = await pb.collection('labels').getFullList({
      filter: `(name='Urgente' || name='Alta Prioridade') && (${boardsFilter})`,
    })
    labels.push(...chunkLabels)
  }

  if (memberId) {
    cards = cards.filter((c) => assignedCardIds.has(c.id))
  }

  let priorityCards: any[] = []
  if (labels.length > 0) {
    const labelChunks = []
    for (let i = 0; i < labels.length; i += chunkSize) {
      labelChunks.push(labels.slice(i, i + chunkSize))
    }

    const cardLabels: any[] = []
    for (const chunk of labelChunks) {
      const labelsIds = chunk.map((l) => `label_id='${l.id}'`).join('||')
      const chunkCL = await pb.collection('card_labels').getFullList({
        filter: labelsIds,
        expand: 'card_id,card_id.board_id,label_id',
      })
      cardLabels.push(...chunkCL)
    }

    const pCardsRaw = cardLabels
      .map((cl) => {
        const card = cl.expand?.card_id
        if (!card) return null
        return { ...card, label: cl.expand?.label_id }
      })
      .filter((c) => c && c.archived !== true && boardIds.includes(c.board_id))

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

  return { cards, priorityCards }
}
