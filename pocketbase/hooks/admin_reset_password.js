routerAdd(
  'POST',
  '/backend/v1/admin/reset-password',
  (e) => {
    const adminUser = e.auth
    if (!adminUser || adminUser.getString('role') !== 'admin') {
      return e.json(403, { message: 'Apenas administradores podem redefinir senhas.' })
    }

    const body = e.requestInfo().body || {}
    const targetUserId = body.userId
    const newPassword = body.password
    const passwordConfirm = body.passwordConfirm

    if (!targetUserId || typeof targetUserId !== 'string') {
      return e.json(400, { message: 'ID do usuário é obrigatório.' })
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return e.json(400, { message: 'Nova senha é obrigatória.' })
    }

    if (newPassword.length < 8) {
      return e.json(400, { message: 'A senha deve ter no mínimo 8 caracteres.' })
    }

    if (newPassword !== passwordConfirm) {
      return e.json(400, { message: 'As senhas não coincidem.' })
    }

    let targetRecord
    try {
      targetRecord = $app.findCollectionByNameOrId('users')
      targetRecord = $app.findFirstRecordByData('users', 'id', targetUserId)
    } catch (err) {
      return e.json(404, { message: 'Usuário não encontrado.' })
    }

    try {
      targetRecord.setPassword(newPassword)
      $app.save(targetRecord)
    } catch (err) {
      return e.json(500, { message: 'Erro ao redefinir a senha do usuário.' })
    }

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
