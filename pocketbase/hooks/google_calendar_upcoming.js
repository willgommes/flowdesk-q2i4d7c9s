routerAdd(
  'GET',
  '/backend/v1/google-calendar/upcoming',
  (e) => {
    let syncs = []
    try {
      syncs = $app.findRecordsByFilter('calendar_sync', 'is_active = true', '', 100, 0)
    } catch (err) {
      return e.json(200, [])
    }

    let ignoredEvents = []
    try {
      ignoredEvents = $app
        .findRecordsByFilter('ignored_google_events', '1=1', '', 1000, 0)
        .map((r) => r.getString('google_event_id'))
    } catch (err) {}

    let existingCards = []
    try {
      existingCards = $app
        .findRecordsByFilter('cards', "google_event_id != ''", '', 1000, 0)
        .map((r) => r.getString('google_event_id'))
    } catch (err) {}

    const now = new Date()
    const upcoming = []

    const token = e.auth?.getString('google_access_token')

    for (const sync of syncs) {
      const syncId = sync.id
      const calendarId = sync.getString('calendar_id')
      let boardName = 'Desconhecido'
      let colName = 'Desconhecida'

      try {
        const board = $app.findRecordById('boards', sync.getString('board_id'))
        boardName = board.getString('name')
      } catch (err) {}

      try {
        const col = $app.findRecordById('columns', sync.getString('target_column_id'))
        colName = col.getString('name')
      } catch (err) {}

      let events = []

      if (token) {
        try {
          const timeMin = now.toISOString()
          const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
          const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`
          const res = $http.send({
            url: url,
            method: 'GET',
            headers: {
              Authorization: 'Bearer ' + token,
            },
            timeout: 15,
          })
          if (res.statusCode === 200 && res.json && res.json.items) {
            events = res.json.items.map((item) => ({
              id: item.id,
              title: item.summary || 'Evento sem título',
              date: item.start?.dateTime || item.start?.date,
            }))
          }
        } catch (err) {
          $app.logger().error('Error calling Google API for upcoming', 'error', err.message)
        }
      }

      if (events.length === 0 && !token) {
        events = [
          {
            id: `mock-${syncId}-1`,
            title: 'Dia das Mães - Campanha',
            date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: `mock-${syncId}-2`,
            title: 'Black Friday - Preparação',
            date: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: `mock-${syncId}-3`,
            title: 'Natal - Especial',
            date: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: `mock-${syncId}-4`,
            title: 'Ano Novo - Planejamento',
            date: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ]
      }

      for (const m of events) {
        if (!m.id) continue
        if (ignoredEvents.includes(m.id)) continue
        if (existingCards.includes(m.id)) continue

        const eventDate = new Date(m.date)
        if (eventDate.getTime() < now.getTime()) continue

        upcoming.push({
          id: m.id,
          sync_id: syncId,
          title: m.title,
          date: m.date,
          board_name: boardName,
          column_name: colName,
        })
      }
    }

    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return e.json(200, upcoming.slice(0, 50))
  },
  $apis.requireAuth(),
)
