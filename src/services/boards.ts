import pb from '@/lib/pocketbase/client'

export const getBoards = (archived = false) => {
  return pb.collection('boards').getFullList({
    filter: `archived = ${archived}`,
    sort: '-updated',
    expand: 'members',
  })
}

export const getBoard = (id: string) => {
  return pb.collection('boards').getOne(id, {
    expand: 'members',
  })
}

export const createBoard = (data: any) => {
  return pb.collection('boards').create({ ...data, created_by: pb.authStore.record?.id })
}

export const updateBoard = (id: string, data: any) => {
  return pb.collection('boards').update(id, data)
}

export const deleteBoard = (id: string) => {
  return pb.collection('boards').delete(id)
}
