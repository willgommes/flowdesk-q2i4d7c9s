cronAdd('cron_google_calendar_sync', '0 1 * * *', () => {
  const refreshGoogleToken = (user) => {
    let accessToken = user.getString('google_access_token')
    let refreshToken = user.getString('google_refresh_token')
    let expiry = user.getInt('google_token_expiry')

    if (!accessToken) {
      return { ok: false, reason: 'no_access_token' }
    }

    if (expiry && Date.now() > expiry) {
      if (!refreshToken) {
        $app.logger().error('Google refresh token missing in cron', 'user_id', user.id)
        return { ok: false, reason: 'no_refresh_token' }
      }

      const clientId = $secrets.get('GOOGLE_CLIENT_ID')
      const clientSecret = $secrets.get('GOOGLE_CLIENT_SECRET')

      const refreshRes = $http.send({
        url: 'https://oauth2.googleapis.com/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token&refresh_token=${refreshToken}`,
        timeout: 15,
      })

      if (refreshRes.statusCode === 200) {
        accessToken = refreshRes.json.access_token
        let newRefreshToken = refreshToken
        if (refreshRes.json.refresh_token) {
          newRefreshToken = refreshRes.json.refresh_token
        }
        const newExpiry = Date.now() + refreshRes.json.expires_in * 1000 - 60000

        user.set('google_access_token', accessToken)
        if (refreshRes.json.refresh_token) {
          user.set('google_refresh_token', newRefreshToken)
        }
        user.set('google_token_expiry', newExpiry)
        $app.save(user)
      } else {
        $app
          .logger()
          .error(
            'Google token refresh failed in cron sync',
            'status',
            refreshRes.statusCode,
            'user_id',
            user.id,
          )

        if (
          refreshRes.statusCode === 400 ||
          refreshRes.statusCode === 401 ||
          refreshRes.statusCode === 403
        ) {
          const notifCol = $app.findCollectionByNameOrId('notifications')
          const notif = new Record(notifCol)
          notif.set('user_id', user.id)
          notif.set(
            'message',
            'Sua conexão com o Google expirou. Reconecte sua conta nas Integrações para retomar a sincronização.',
          )
          notif.set('is_read', false)
          $app.save(notif)
        }

        return { ok: false, reason: 'refresh_failed' }
      }
    }

    return { ok: true, token: accessToken }
  }

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

  let adminUser = null
  try {
    adminUser = $app.findFirstRecordByFilter('users', "role = 'admin' && google_access_token != ''")
  } catch (e) {}

  let token = null
  if (adminUser) {
    const refreshResult = refreshGoogleToken(adminUser)
    token = refreshResult.ok ? refreshResult.token : null
  }

  const now = new Date()
  const timeMin = now.toISOString()
  const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  for (const sync of syncs) {
    const boardId = sync.getString('board_id')
    const targetColId = sync.getString('target_column_id')
    const syncId = sync.id
    const calendarId = sync.getString('calendar_id')

    let events = []

    if (token) {
      try {
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=250`
        let pageToken = ''
        do {
          let fetchUrl = url
          if (pageToken) {
            fetchUrl += `&pageToken=${encodeURIComponent(pageToken)}`
          }
          const res = $http.send({
            url: fetchUrl,
            method: 'GET',
            headers: { Authorization: 'Bearer ' + token },
            timeout: 15,
          })
          if (res.statusCode === 200 && res.json) {
            if (res.json.items) {
              events = events.concat(
                res.json.items.map((item) => ({
                  id: item.id,
                  title: item.summary || 'Evento sem título',
                  date: item.start?.dateTime || item.start?.date,
                })),
              )
            }
            pageToken = res.json.nextPageToken || ''
          } else {
            $app.logger().warn('Google API returned non-200 in cron sync', 'status', res.statusCode)
            break
          }
        } while (pageToken)
      } catch (err) {
        $app.logger().error('Error calling Google API in cron sync', 'error', err.message)
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
      if (!m.title || m.title.indexOf('❤️') === -1) continue
      if (ignoredEvents.includes(m.id)) continue
      if (existingCards.includes(m.id)) continue

      const dateStr = m.date ? m.date.substring(0, 10) : new Date().toISOString().substring(0, 10)
      const eventDate = new Date(`${dateStr}T20:00:00.000Z`)
      const diffTime = eventDate.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays >= 0 && diffDays <= 7) {
        try {
          let alreadyExists = false
          try {
            $app.findFirstRecordByData('cards', 'google_event_id', m.id)
            alreadyExists = true
          } catch (_) {}

          if (alreadyExists) {
            existingCards.push(m.id)
            continue
          }

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
})
