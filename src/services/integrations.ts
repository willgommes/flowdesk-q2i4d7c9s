import pb from '@/lib/pocketbase/client'

export const getGoogleAuthUrl = async (redirectUri: string) => {
  const res = await pb.send(
    `/backend/v1/google-calendar/auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`,
    { method: 'GET' },
  )
  return res.url
}

export const sendGoogleTokenCode = async (code: string, redirectUri: string) => {
  return pb.send('/backend/v1/google-calendar/token', {
    method: 'POST',
    body: JSON.stringify({ code, redirect_uri: redirectUri }),
  })
}

export const getGoogleConnectionStatus = async () => {
  return pb.send('/backend/v1/google-calendar/status', { method: 'GET' })
}

export const disconnectGoogle = async () => {
  return pb.send('/backend/v1/google-calendar/disconnect', { method: 'POST' })
}

export const getGoogleCalendars = async () => {
  return pb.send('/backend/v1/google-calendar/list', { method: 'GET' })
}

export const syncGoogleCalendar = async (syncId: string) => {
  return pb.send('/backend/v1/google-calendar/sync', {
    method: 'POST',
    body: JSON.stringify({ sync_id: syncId }),
  })
}
