migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('last_briefing_at')) {
      users.fields.add(new DateField({ name: 'last_briefing_at' }))
    }
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('last_briefing_at')
    app.save(users)
  },
)
