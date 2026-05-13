cronAdd('cron_google_calendar_sync', '0 1 * * *', () => {
  const syncs = $app.findRecordsByFilter('calendar_sync', 'is_active = true', '', 100, 0)

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

  for (const sync of syncs) {
    const boardId = sync.getString('board_id')
    const targetColId = sync.getString('target_column_id')
    const syncId = sync.id

    const mockData = [
      { id: `mock-${syncId}-1`, title: 'Dia das Mães - Campanha', days: 5 },
      { id: `mock-${syncId}-2`, title: 'Black Friday - Preparação', days: 8 },
      { id: `mock-${syncId}-3`, title: 'Natal - Especial', days: 20 },
      { id: `mock-${syncId}-4`, title: 'Ano Novo - Planejamento', days: 25 },
    ]

    for (const m of mockData) {
      if (ignoredEvents.includes(m.id)) continue
      if (existingCards.includes(m.id)) continue

      if (m.days <= 7) {
        try {
          const cardsCol = $app.findCollectionByNameOrId('cards')
          const card = new Record(cardsCol)
          card.set('title', m.title)
          card.set('board_id', boardId)
          card.set('column_id', targetColId)
          card.set('google_event_id', m.id)
          card.set('completed', false)
          card.set('archived', false)

          const eventDate = new Date(now.getTime() + m.days * 24 * 60 * 60 * 1000)
          card.set('due_date', eventDate.toISOString())

          $app.save(card)
          existingCards.push(m.id)

          let board
          try {
            board = $app.findRecordById('boards', boardId)
          } catch (e) {}
          if (board) {
            const members = board.get('members') || []
            let colName = 'Coluna'
            try {
              const c = $app.findRecordById('columns', targetColId)
              colName = c.getString('name')
            } catch (e) {}

            const notifCol = $app.findCollectionByNameOrId('notifications')
            for (const userId of members) {
              const notif = new Record(notifCol)
              notif.set('user_id', userId)
              notif.set(
                'message',
                `Nova tarefa sazonal "${m.title}" foi criada na coluna "${colName}"`,
              )
              notif.set('is_read', false)
              notif.set('related_card_id', card.id)
              $app.save(notif)
            }
          }
        } catch (err) {
          $app.logger().error('Error creating seasonal card', 'error', err.message)
        }
      }
    }

    sync.set('last_synced_at', now.toISOString())
    try {
      $app.save(sync)
    } catch (e) {}
  }
})
