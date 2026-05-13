routerAdd(
  'POST',
  '/backend/v1/google-calendar/sync',
  (e) => {
    const body = e.requestInfo().body || {}
    const syncId = body.sync_id
    if (!syncId) return e.badRequestError('Missing sync_id')

    let sync
    try {
      sync = $app.findRecordById('calendar_sync', syncId)
    } catch (_) {
      return e.notFoundError('Sync configuration not found')
    }

    const user = e.auth
    let accessToken = user.getString('google_access_token')
    let refreshToken = user.getString('google_refresh_token')
    let expiry = user.getInt('google_token_expiry')

    if (!accessToken) {
      return e.badRequestError('Not connected to Google')
    }

    if (expiry && Date.now() > expiry) {
      const clientId = $secrets.get('GOOGLE_CLIENT_ID')
      const clientSecret = $secrets.get('GOOGLE_CLIENT_SECRET')

      if (!refreshToken) {
        return e.badRequestError('No refresh token available. Please reconnect Google account.')
      }

      const refreshRes = $http.send({
        url: 'https://oauth2.googleapis.com/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token&refresh_token=${refreshToken}`,
        timeout: 15,
      })

      if (refreshRes.statusCode === 200) {
        accessToken = refreshRes.json.access_token
        if (refreshRes.json.refresh_token) {
          refreshToken = refreshRes.json.refresh_token
        }
        expiry = Date.now() + refreshRes.json.expires_in * 1000 - 60000

        user.set('google_access_token', accessToken)
        if (refreshRes.json.refresh_token) {
          user.set('google_refresh_token', refreshToken)
        }
        user.set('google_token_expiry', expiry)
        $app.save(user)
      } else {
        return e.badRequestError('Failed to refresh Google token. Please disconnect and reconnect.')
      }
    }

    const calendarId = sync.getString('calendar_id')
    const boardId = sync.getString('board_id')
    const columnId = sync.getString('target_column_id')

    const d = new Date()
    d.setHours(0, 0, 0, 0)
    const timeMin = d.toISOString()

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime`

    const res = $http.send({
      url: url,
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 30,
    })

    if (res.statusCode !== 200) {
      $app
        .logger()
        .error('Sync events fetch failed', 'status', res.statusCode, 'calendar', calendarId)
      return e.badRequestError(
        'Failed to fetch events from Google Calendar. Check if the calendar is accessible.',
      )
    }

    const events = res.json.items || []
    let importedCount = 0

    $app.runInTransaction((txApp) => {
      for (const event of events) {
        if (!event.id || event.status === 'cancelled') continue

        const title = event.summary || 'Sem Título'
        const description = event.description || ''
        const dueDate = event.start?.dateTime || event.start?.date || null
        const googleEventId = event.id

        let card
        try {
          const existing = txApp.findRecordsByFilter(
            'cards',
            `google_event_id = '${googleEventId}' && board_id = '${boardId}'`,
            '',
            1,
            0,
          )
          if (existing.length > 0) {
            card = existing[0]
          }
        } catch (_) {}

        const now = new Date()
        now.setHours(0, 0, 0, 0)
        let eventDate = now
        if (dueDate) {
          eventDate = new Date(dueDate)
          eventDate.setHours(0, 0, 0, 0)
        }
        const diffDays = Math.round((eventDate.getTime() - now.getTime()) / (1000 * 3600 * 24))

        if (card) {
          let changed = false
          if (card.getString('title') !== title) {
            card.set('title', title)
            changed = true
          }
          if (card.getString('description') !== description) {
            card.set('description', description)
            changed = true
          }

          const currentDueDate = card.getString('due_date')
          if (dueDate) {
            const dStr = dueDate.length > 10 ? dueDate.substring(0, 19).replace('T', ' ') : dueDate
            if (!currentDueDate || currentDueDate.substring(0, 10) !== dStr.substring(0, 10)) {
              card.set('due_date', dueDate)
              changed = true
            }
          }

          if (changed) {
            txApp.save(card)
          }
        } else {
          if (diffDays <= 7 && diffDays >= -1) {
            const cardsCol = txApp.findCollectionByNameOrId('cards')
            card = new Record(cardsCol)
            card.set('title', title)
            card.set('description', description)
            if (dueDate) card.set('due_date', dueDate)
            card.set('google_event_id', googleEventId)
            card.set('board_id', boardId)
            card.set('column_id', columnId)
            card.set('sort_order', 0)
            card.set('created_by', user.id)
            card.set('is_recurring', false)
            txApp.save(card)
            importedCount++
          }
        }
      }

      sync.set('last_synced_at', new Date().toISOString())
      txApp.save(sync)
    })

    return e.json(200, { success: true, imported: importedCount })
  },
  $apis.requireAuth(),
)
