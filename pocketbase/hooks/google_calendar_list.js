routerAdd(
  'GET',
  '/backend/v1/google-calendar/list',
  (e) => {
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
        $app.logger().error('Token refresh failed', 'status', refreshRes.statusCode)
        return e.badRequestError('Failed to refresh Google token')
      }
    }

    const res = $http.send({
      url: 'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
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
