migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('notifications_enabled')) {
      users.fields.add(
        new BoolField({
          name: 'notifications_enabled',
        }),
      )
      app.save(users)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (users.fields.getByName('notifications_enabled')) {
      users.fields.removeByName('notifications_enabled')
      app.save(users)
    }
  },
)
