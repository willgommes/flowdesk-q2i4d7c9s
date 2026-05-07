migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('cards')
    if (!col.fields.getByName('is_paused')) {
      col.fields.add(new BoolField({ name: 'is_paused' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('cards')
    if (col.fields.getByName('is_paused')) {
      col.fields.removeByName('is_paused')
      app.save(col)
    }
  },
)
