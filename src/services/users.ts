import pb from '@/lib/pocketbase/client'

export const getUsers = () => pb.collection('users').getFullList({ sort: 'name' })

export async function resetUserPassword(userId: string, password: string, passwordConfirm: string) {
  return pb.send<{ success: boolean }>('/backend/v1/admin/reset-password', {
    method: 'POST',
    body: {
      userId,
      password,
      passwordConfirm,
    },
  })
}
