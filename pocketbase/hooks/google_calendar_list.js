routerAdd(
  'GET',
  '/backend/v1/google-calendar/list',
  (e) => {
    const user = e.auth
    let tokens = user.get('google_tokens')

    if (!tokens || !tokens.access_token) {
      return e.badRequestError('Not connected to Google')
    }

    if (tokens.expiry && Date.now() > tokens.expiry) {
      const clientId = $secrets.get('GOOGLE_CLIENT_ID')
      const clientSecret = $secrets.get('GOOGLE_CLIENT_SECRET')

      if (!tokens.refresh_token) {
        return e.badRequestError('No refresh token available. Please reconnect Google account.')
      }

      const refreshRes = $http.send({
        url: 'https://oauth2.googleapis.com/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token&refresh_token=${tokens.refresh_token}`,
        timeout: 15,
      })

      if (refreshRes.statusCode === 200) {
        tokens.access_token = refreshRes.json.access_token
        if (refreshRes.json.refresh_token) {
          tokens.refresh_token = refreshRes.json.refresh_token
        }
        tokens.expiry = Date.now() + refreshRes.json.expires_in * 1000 - 60000
        user.set('google_tokens', tokens)
        $app.save(user)
      } else {
        $app.logger().error('Token refresh failed', 'status', refreshRes.statusCode)
        return e.badRequestError('Failed to refresh Google token')
      }
    }

    const res = $http.send({
      url: 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      timeout: 15,
    })

    if (res.statusCode !== 200) {
      $app.logger().error('Fetch calendars failed', 'status', res.statusCode)
      return e.badRequestError('Failed to fetch calendars')
    }

    const items = res.json.items || []
    return e.json(
      200,
      items.map((c) => ({ id: c.id, summary: c.summary, primary: c.primary })),
    )
  },
  $apis.requireAuth(),
)
