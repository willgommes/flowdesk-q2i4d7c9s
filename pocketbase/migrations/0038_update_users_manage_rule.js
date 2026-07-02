migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.manageRule = "@request.auth.role = 'admin'"
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.manageRule = null
    app.save(users)
  },
)
