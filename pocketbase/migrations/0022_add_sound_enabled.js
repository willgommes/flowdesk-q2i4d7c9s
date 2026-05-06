migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (!col.fields.getByName('sound_enabled')) {
      col.fields.add(new BoolField({ name: 'sound_enabled' }))
    }
    app.save(col)

    // Update existing users to have sound_enabled = true
    app.db().newQuery('UPDATE users SET sound_enabled = true').execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.removeByName('sound_enabled')
    app.save(col)
  },
)
