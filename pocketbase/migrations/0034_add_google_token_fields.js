migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')

    if (!col.fields.getByName('google_access_token')) {
      col.fields.add(new TextField({ name: 'google_access_token' }))
    }
    if (!col.fields.getByName('google_refresh_token')) {
      col.fields.add(new TextField({ name: 'google_refresh_token' }))
    }
    if (!col.fields.getByName('google_token_expiry')) {
      col.fields.add(new NumberField({ name: 'google_token_expiry' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.removeByName('google_access_token')
    col.fields.removeByName('google_refresh_token')
    col.fields.removeByName('google_token_expiry')
    app.save(col)
  },
)
