import React from 'react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useSoundAlerts } from '@/hooks/use-sound-alerts'

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  usePushNotifications()
  useSoundAlerts()
  return <>{children}</>
}
