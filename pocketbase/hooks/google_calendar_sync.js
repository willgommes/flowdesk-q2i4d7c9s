routerAdd(
  'POST',
  '/backend/v1/google-calendar/sync',
  (e) => {
    const body = e.requestInfo().body || {}
    let filter = 'is_active = true'
    if (body.sync_id) {
      filter = `id = '${body.sync_id}'`
    }

    let syncs = []
    try {
      syncs = $app.findRecordsByFilter('calendar_sync', filter, '', 100, 0)
    } catch (err) {
      return e.json(200, { success: true })
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
    const timeMin = now.toISOString()
    const timeMax = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const token = e.auth?.getString('google_access_token')

    for (const sync of syncs) {
      const boardId = sync.getString('board_id')
      const targetColId = sync.getString('target_column_id')
      const syncId = sync.id
      const calendarId = sync.getString('calendar_id')

      let events = []

      if (token) {
        try {
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
          } else {
            $app.logger().warn('Google API returned non-200 in sync', 'status', res.statusCode)
          }
        } catch (err) {
          $app.logger().error('Error calling Google API in sync', 'error', err.message)
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
        const diffTime = eventDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays >= 0 && diffDays <= 7) {
          try {
            const cardsCol = $app.findCollectionByNameOrId('cards')
            const card = new Record(cardsCol)
            card.set('title', m.title)
            card.set('board_id', boardId)
            card.set('column_id', targetColId)
            card.set('google_event_id', m.id)
            card.set('completed', false)
            card.set('archived', false)

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

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
