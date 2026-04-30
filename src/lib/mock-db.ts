import { v4 as uuidv4 } from 'uuid'

export type Role = 'admin' | 'membro' | 'cliente'
export type Status = 'active' | 'inactive'

export interface User {
  id: string
  name: string
  email: string
  password?: string
  role: Role
  status: Status
  avatar?: string
  createdAt: string
  lastAccess: string
}

const DB_KEY = 'flowdesk_db_users'

export const mockDb = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(DB_KEY)
    return data ? JSON.parse(data) : []
  },

  saveUsers: (users: User[]) => {
    localStorage.setItem(DB_KEY, JSON.stringify(users))
  },

  getUserByEmail: (email: string): User | undefined => {
    return mockDb.getUsers().find((u) => u.email === email)
  },

  getUserById: (id: string): User | undefined => {
    return mockDb.getUsers().find((u) => u.id === id)
  },

  createUser: (
    userData: Omit<User, 'id' | 'role' | 'status' | 'createdAt' | 'lastAccess'>,
  ): User => {
    const users = mockDb.getUsers()
    const isFirstUser = users.length === 0

    const newUser: User = {
      ...userData,
      id: uuidv4(),
      role: isFirstUser ? 'admin' : 'membro',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastAccess: new Date().toISOString(),
      avatar: `https://img.usecurling.com/ppl/thumbnail?seed=${encodeURIComponent(userData.email)}`,
    }

    mockDb.saveUsers([...users, newUser])
    return newUser
  },

  updateUser: (id: string, updates: Partial<User>): User | null => {
    const users = mockDb.getUsers()
    const index = users.findIndex((u) => u.id === id)
    if (index === -1) return null

    users[index] = { ...users[index], ...updates }
    mockDb.saveUsers(users)
    return users[index]
  },
}
