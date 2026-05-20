import pb from '@/lib/pocketbase/client'

export const getRecentActivities = async (boardIds?: string[], memberId?: string) => {
  const filterParts = []

  if (boardIds && boardIds.length > 0) {
    const bFilter = boardIds.map((id) => `card_id.board_id='${id}'`).join('||')
    filterParts.push(`(${bFilter})`)
  }

  if (memberId) {
    filterParts.push(`user_id='${memberId}'`)
  }

  const filter = filterParts.join(' && ')

  return await pb.collection('activity_logs').getList(1, 50, {
    filter: filter || undefined,
    sort: '-created',
    expand: 'user_id,card_id',
  })
}

export interface ActivityFilter {
  userId?: string
  actionType?: string
  startDate?: string
  endDate?: string
  search?: string
}

export const getHistoryLogs = async (page: number, limit: number, filters: ActivityFilter) => {
  const filterParts = []

  if (filters.userId) {
    filterParts.push(`user_id='${filters.userId}'`)
  }

  if (filters.actionType) {
    filterParts.push(`action_type='${filters.actionType}'`)
  }

  if (filters.startDate) {
    filterParts.push(`created >= '${filters.startDate}'`)
  }

  if (filters.endDate) {
    filterParts.push(`created <= '${filters.endDate}'`)
  }

  if (filters.search) {
    const s = filters.search.replace(/'/g, "\\'")
    filterParts.push(`(description ~ '${s}' || card_id.title ~ '${s}')`)
  }

  const filter = filterParts.join(' && ')

  return await pb.collection('activity_logs').getList(page, limit, {
    filter: filter || undefined,
    sort: '-created',
    expand: 'user_id,card_id',
  })
}
