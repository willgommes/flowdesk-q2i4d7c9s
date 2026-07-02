migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')

    col.fields.add(
      new BoolField({
        name: 'briefing_required',
      }),
    )

    app.save(col)

    // Set default to true for existing users
    app.db().newQuery('UPDATE users SET briefing_required = 1').execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')

    col.fields.removeByName('briefing_required')

    app.save(col)
  },
)
