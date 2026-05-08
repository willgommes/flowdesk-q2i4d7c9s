cronAdd('google_calendar_sync', '*/30 * * * *', () => {
  const clientId = $secrets.get('GOOGLE_CLIENT_ID')
  const clientSecret = $secrets.get('GOOGLE_CLIENT_SECRET')

  if (!clientId || !clientSecret) {
    $app.logger().error('Google Calendar Sync: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET')
    return
  }

  const syncRecords = $app.findRecordsByFilter('calendar_sync', 'is_active = true', '', 100, 0)
  if (syncRecords.length === 0) return

  let accessToken = ''
  try {
    const tokenRes = $http.send({
      url: 'https://oauth2.googleapis.com/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    })
    if (tokenRes.statusCode === 200) {
      accessToken = tokenRes.json.access_token
    } else {
      $app
        .logger()
        .warn(
          'Google Calendar Sync: Failed to get OAuth token, will fallback to API key.',
          'status',
          tokenRes.statusCode,
        )
    }
  } catch (err) {
    $app.logger().error('Google Calendar Sync: Token request error', 'error', err.message)
  }

  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const timeMin = d.toISOString()

  for (const sync of syncRecords) {
    try {
      const calendarId = sync.getString('calendar_id')
      const boardId = sync.getString('board_id')
      const columnId = sync.getString('target_column_id')

      let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime`

      if (!accessToken && clientSecret) {
        url += `&key=${clientSecret}`
      }

      const headers = {}
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const res = $http.send({
        url: url,
        method: 'GET',
        headers: headers,
        timeout: 30,
      })

      if (res.statusCode !== 200) {
        $app
          .logger()
          .error(`Google Calendar Sync: Fetch failed for ${calendarId}`, 'status', res.statusCode)
        continue
      }

      const events = res.json.items || []
      let importedCount = 0

      for (const event of events) {
        if (!event.id) continue

        const title = event.summary || 'Sem Título'
        const description = event.description || ''
        const dueDate = event.start?.dateTime || event.start?.date || null
        const googleEventId = event.id

        let card
        try {
          const existing = $app.findRecordsByFilter(
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

        if (card) {
          card.set('title', title)
          card.set('description', description)
          if (dueDate) card.set('due_date', dueDate)
          $app.save(card)
        } else {
          const cardsCol = $app.findCollectionByNameOrId('cards')
          card = new Record(cardsCol)
          card.set('title', title)
          card.set('description', description)
          if (dueDate) card.set('due_date', dueDate)
          card.set('google_event_id', googleEventId)
          card.set('board_id', boardId)
          card.set('column_id', columnId)
          card.set('sort_order', 0)
          $app.save(card)
        }
        importedCount++
      }

      sync.set('last_synced_at', new Date().toISOString())
      $app.save(sync)
      $app.logger().info(`Google Calendar Sync: Synced ${importedCount} events for ${calendarId}`)
    } catch (err) {
      $app
        .logger()
        .error('Google Calendar Sync: Error processing', 'syncId', sync.id, 'error', err.message)
    }
  }
})
