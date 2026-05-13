routerAdd(
  'POST',
  '/backend/v1/google-calendar/disconnect',
  (e) => {
    const user = e.auth
    if (!user) return e.unauthorizedError('Não autenticado')

    user.set('google_access_token', '')
    user.set('google_refresh_token', '')
    user.set('google_token_expiry', 0)

    $app.save(user)

    return e.json(200, { success: true, message: 'Desconectado com sucesso' })
  },
  $apis.requireAuth(),
)
