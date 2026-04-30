migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (!col.fields.getByName('dashboard_layout')) {
      col.fields.add(new JSONField({ name: 'dashboard_layout', maxSize: 200000 }))
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (col.fields.getByName('dashboard_layout')) {
      col.fields.removeByName('dashboard_layout')
      app.save(col)
    }
  },
)
