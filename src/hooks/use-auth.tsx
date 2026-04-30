import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, mockDb } from '@/lib/mock-db'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password?: string) => Promise<boolean>
  register: (name: string, email: string, password?: string) => Promise<boolean>
  logout: () => void
  updateProfile: (updates: { name?: string; avatar?: string }) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUserId = localStorage.getItem('flowdesk_auth_user_id')
    if (storedUserId) {
      const foundUser = mockDb.getUserById(storedUserId)
      if (foundUser && foundUser.status === 'active') {
        setUser(foundUser)
      } else {
        localStorage.removeItem('flowdesk_auth_user_id')
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password?: string) => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    const foundUser = mockDb.getUserByEmail(email)

    if (foundUser && foundUser.status === 'active' && foundUser.password === password) {
      setUser(foundUser)
      localStorage.setItem('flowdesk_auth_user_id', foundUser.id)
      return true
    }

    // Fallback for simple mock testing if user doesn't check password
    if (foundUser && foundUser.status === 'active' && (!foundUser.password || !password)) {
      setUser(foundUser)
      localStorage.setItem('flowdesk_auth_user_id', foundUser.id)
      return true
    }

    return false
  }

  const register = async (name: string, email: string, password?: string) => {
    await new Promise((resolve) => setTimeout(resolve, 800))
    const existingUser = mockDb.getUserByEmail(email)
    if (existingUser) {
      return false
    }

    const newUser = mockDb.createUser({
      name,
      email,
      password,
    })

    setUser(newUser)
    localStorage.setItem('flowdesk_auth_user_id', newUser.id)
    return true
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('flowdesk_auth_user_id')
  }

  const updateProfile = (updates: { name?: string; avatar?: string }) => {
    if (!user) return
    const updatedUser = mockDb.updateUser(user.id, updates)
    if (updatedUser) {
      setUser(updatedUser)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
