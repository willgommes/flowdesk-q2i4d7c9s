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
