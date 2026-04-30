migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('cards')
    if (!col.fields.getByName('archived')) {
      col.fields.add(new BoolField({ name: 'archived' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('cards')
    col.fields.removeByName('archived')
    app.save(col)
  },
)
