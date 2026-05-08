migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (!col.fields.getByName('google_tokens')) {
      col.fields.add(new JSONField({ name: 'google_tokens', hidden: true }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (col.fields.getByName('google_tokens')) {
      col.fields.removeByName('google_tokens')
    }
    app.save(col)
  },
)
