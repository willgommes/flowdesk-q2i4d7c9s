routerAdd(
  'GET',
  '/backend/v1/google-calendar/auth-url',
  (e) => {
    const clientId = $secrets.get('GOOGLE_CLIENT_ID')
    if (!clientId) return e.badRequestError('Missing GOOGLE_CLIENT_ID secret')

    const redirectUri = e.request.url.query().get('redirect_uri')
    if (!redirectUri) return e.badRequestError('Missing redirect_uri')

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly')}&access_type=offline&prompt=consent`

    return e.json(200, { url })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/google-calendar/token',
  (e) => {
    const body = e.requestInfo().body || {}
    const code = body.code
    const redirectUri = body.redirect_uri

    if (!code || !redirectUri) return e.badRequestError('Missing code or redirect_uri')

    const clientId = $secrets.get('GOOGLE_CLIENT_ID')
    const clientSecret = $secrets.get('GOOGLE_CLIENT_SECRET')

    const res = $http.send({
      url: 'https://oauth2.googleapis.com/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `client_id=${clientId}&client_secret=${clientSecret}&code=${encodeURIComponent(code)}&grant_type=authorization_code&redirect_uri=${encodeURIComponent(redirectUri)}`,
      timeout: 15,
    })

    if (res.statusCode !== 200) {
      $app
        .logger()
        .error('Google token exchange failed', 'status', res.statusCode, 'body', res.json)
      return e.badRequestError('Failed to exchange code')
    }

    const user = e.auth

    if (res.json.access_token) {
      user.set('google_access_token', res.json.access_token)
      user.set('google_token_expiry', Date.now() + res.json.expires_in * 1000 - 60000)
    }

    if (res.json.refresh_token) {
      user.set('google_refresh_token', res.json.refresh_token)
    }

    // fallback support for the legacy `google_tokens` field if it's there
    let tokens = user.get('google_tokens')
    if (typeof tokens === 'string') {
      try {
        tokens = JSON.parse(tokens)
      } catch (e) {
        tokens = {}
      }
    }
    tokens = tokens || {}

    const newTokens = {
      access_token: res.json.access_token,
      refresh_token: res.json.refresh_token || tokens.refresh_token,
      expiry: Date.now() + res.json.expires_in * 1000 - 60000,
    }
    user.set('google_tokens', newTokens)

    $app.save(user)

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/google-calendar/disconnect',
  (e) => {
    const user = e.auth
    user.set('google_access_token', '')
    user.set('google_refresh_token', '')
    user.set('google_token_expiry', 0)
    user.set('google_tokens', null)
    $app.save(user)
    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/google-calendar/status',
  (e) => {
    const user = e.auth
    const accessToken = user.getString('google_access_token')
    const refreshToken = user.getString('google_refresh_token')

    let tokens = user.get('google_tokens')
    if (typeof tokens === 'string') {
      try {
        tokens = JSON.parse(tokens)
      } catch (e) {
        tokens = null
      }
    }

    const connected = !!(accessToken || (tokens && tokens.refresh_token))
    return e.json(200, { connected })
  },
  $apis.requireAuth(),
)
