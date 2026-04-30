import pb from '@/lib/pocketbase/client'

export const getBoardColumns = (boardId: string) => {
  return pb.collection('columns').getFullList({
    filter: `board_id = '${boardId}'`,
    sort: 'sort_order',
  })
}

export const createColumn = (data: any) => {
  return pb.collection('columns').create(data)
}

export const updateColumn = (id: string, data: any) => {
  return pb.collection('columns').update(id, data)
}

export const deleteColumn = (id: string) => {
  return pb.collection('columns').delete(id)
}

export const updateColumnOrder = async (updates: { id: string; sort_order: number }[]) => {
  const promises = updates.map((u) =>
    pb.collection('columns').update(u.id, { sort_order: u.sort_order }),
  )
  await Promise.all(promises)
}
