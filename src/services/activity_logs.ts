import pb from '@/lib/pocketbase/client'

export const getRecentActivities = (boardIds?: string[], limit = 10) => {
  let filter = ''
  if (boardIds) {
    if (boardIds.length === 0) {
      filter = `id = 'none'`
    } else {
      filter = boardIds.map((id) => `card_id.board_id = '${id}'`).join(' || ')
    }
  }

  return pb.collection('activity_logs').getList(1, limit, {
    sort: '-created',
    expand: 'user_id,card_id',
    filter,
  })
}
