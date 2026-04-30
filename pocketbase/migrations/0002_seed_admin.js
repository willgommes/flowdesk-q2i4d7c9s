migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'eu@willgommes.com')
      return
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('eu@willgommes.com')
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('name', 'Admin')
    record.set('role', 'admin')
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', 'eu@willgommes.com')
      app.delete(record)
    } catch (_) {}
  },
)
