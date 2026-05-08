import pb from '@/lib/pocketbase/client'

export const getBoardCalendarSync = async (boardId: string) => {
  try {
    const result = await pb.collection('calendar_sync').getList(1, 1, {
      filter: `board_id = '${boardId}'`,
    })
    return result.items.length > 0 ? result.items[0] : null
  } catch (error) {
    return null
  }
}
