import React from 'react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useSoundAlerts } from '@/hooks/use-sound-alerts'
import { useBrowserNotifications } from '@/hooks/use-browser-notifications'

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  usePushNotifications()
  useSoundAlerts()
  useBrowserNotifications()
  return <>{children}</>
}
