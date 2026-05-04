import React from 'react'
import { usePushNotifications } from '@/hooks/use-push-notifications'

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  usePushNotifications()
  return <>{children}</>
}
