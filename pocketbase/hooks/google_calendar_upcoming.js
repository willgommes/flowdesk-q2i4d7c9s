routerAdd(
  'GET',
  '/backend/v1/google-calendar/upcoming',
  (e) => {
    const syncs = $app.findRecordsByFilter('calendar_sync', 'is_active = true', '-created', 100, 0)

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

    const events = []
    const now = new Date()

    for (const sync of syncs) {
      const boardId = sync.getString('board_id')
      const targetColId = sync.getString('target_column_id')
      const syncId = sync.id
      const calendarId = sync.getString('calendar_id')

      let boardName = 'Quadro'
      try {
        const b = $app.findRecordById('boards', boardId)
        boardName = b.getString('name')
      } catch (e) {}

      let colName = 'Coluna'
      try {
        const c = $app.findRecordById('columns', targetColId)
        colName = c.getString('name')
      } catch (e) {}

      const mockData = [
        { id: `mock-${syncId}-1`, title: 'Dia das Mães - Campanha', days: 5 },
        { id: `mock-${syncId}-2`, title: 'Black Friday - Preparação', days: 8 },
        { id: `mock-${syncId}-3`, title: 'Natal - Especial', days: 20 },
        { id: `mock-${syncId}-4`, title: 'Ano Novo - Planejamento', days: 25 },
      ]

      for (const m of mockData) {
        if (ignoredEvents.includes(m.id)) continue
        if (existingCards.includes(m.id)) continue

        const eventDate = new Date(now.getTime() + m.days * 24 * 60 * 60 * 1000)
        events.push({
          id: m.id,
          title: m.title,
          date: eventDate.toISOString(),
          board_id: boardId,
          board_name: boardName,
          column_id: targetColId,
          column_name: colName,
          sync_id: syncId,
          calendar_id: calendarId,
        })
      }
    }

    return e.json(200, events)
  },
  $apis.requireAuth(),
)
