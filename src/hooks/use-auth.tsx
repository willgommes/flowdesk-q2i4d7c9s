import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'membro' | 'cliente'
  avatar?: string
  created: string
  updated: string
  lastActive?: string
  collectionId: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: any }>
  loginWithGoogle: () => Promise<{ success: boolean; error?: any }>
  register: (
    name: string,
    email: string,
    password?: string,
  ) => Promise<{ success: boolean; error?: any }>
  logout: () => void
  recoverPassword: (email: string) => Promise<{ success: boolean; error?: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>((pb.authStore.record as unknown as User) || null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(false)
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser((record as unknown as User) || null)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email: string, password?: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password || '')
      if (authData.record) {
        await pb
          .collection('users')
          .update(authData.record.id, { lastActive: new Date().toISOString() })
      }
      return { success: true }
    } catch (error) {
      return { success: false, error }
    }
  }

  const loginWithGoogle = async () => {
    try {
      const authData = await pb.collection('users').authWithOAuth2({ provider: 'google' })
      if (authData.record) {
        await pb
          .collection('users')
          .update(authData.record.id, { lastActive: new Date().toISOString() })
      }
      return { success: true }
    } catch (error) {
      return { success: false, error }
    }
  }

  const register = async (name: string, email: string, password?: string) => {
    try {
      await pb.collection('users').create({
        name,
        email,
        password: password || '',
        passwordConfirm: password || '',
        role: 'membro',
      })
      const authData = await pb.collection('users').authWithPassword(email, password || '')
      if (authData.record) {
        await pb
          .collection('users')
          .update(authData.record.id, { lastActive: new Date().toISOString() })
      }
      return { success: true }
    } catch (error) {
      return { success: false, error }
    }
  }

  const logout = () => {
    pb.authStore.clear()
  }

  const recoverPassword = async (email: string) => {
    try {
      await pb.collection('users').requestPasswordReset(email)
      return { success: true }
    } catch (error) {
      return { success: false, error }
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, loginWithGoogle, register, logout, recoverPassword }}
    >
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
