import { useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'

const ACTION_TYPES = [
  'creation',
  'move',
  'edit_title',
  'edit_desc',
  'label_add',
  'assignment_add',
  'comment_add',
  'date_change',
]

export function playPing() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    // A nice soft notification ping
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1) // A4

    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02) // attack
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3) // release

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch (e) {
    // Ignore autoplay or audio API errors gracefully
  }
}

export function useSoundAlerts() {
  const { user } = useAuth()

  // We use a ref to throttle identical or very rapid alerts
  const lastAlertRef = useRef<number>(0)

  useRealtime(
    'activity_logs',
    async (e) => {
      const isEnabled = user?.sound_enabled ?? true
      if (!user || !isEnabled) return
      if (e.action !== 'create') return

      const record = e.record
      if (record.user_id === user.id) return // Ignore actions made by the current user
      if (!ACTION_TYPES.includes(record.action_type)) return // Ignore untracked activities
      if (!record.card_id) return // Activity must be associated with a card

      try {
        // Validate if the current user is a member of this card
        const isMember = await pb
          .collection('card_members')
          .getFirstListItem(`card_id = "${record.card_id}" && user_id = "${user.id}"`)

        if (isMember) {
          const now = Date.now()
          // Prevent audio flooding: Limit to 1 ping per second maximum
          if (now - lastAlertRef.current > 1000) {
            playPing()
            lastAlertRef.current = now
          }
        }
      } catch (err) {
        // Fails silently if user is not a member of the card or there is a network error
      }
    },
    !!user,
  )
}
