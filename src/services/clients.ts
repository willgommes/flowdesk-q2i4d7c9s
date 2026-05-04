import pb from '@/lib/pocketbase/client'

export const getClients = (status?: string) => {
  let filter = ''
  if (status) filter = `status = '${status}'`
  return pb.collection('clients').getFullList({ filter, sort: 'name' })
}

export const getClient = (id: string) => {
  return pb.collection('clients').getOne(id)
}

export const deleteClient = (id: string) => {
  return pb.collection('clients').delete(id)
}
