migrate(
  (app) => {
    const collections = ['columns', 'cards']

    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        const field = col.fields.getByName('sort_order')
        if (field) {
          field.required = false
          app.save(col)
        }
      } catch (e) {
        console.log('Migration 0006 warning: could not update required flag for', name, e)
      }
    }
  },
  (app) => {
    const collections = ['columns', 'cards']
    for (const name of collections) {
      try {
        const col = app.findCollectionByNameOrId(name)
        const field = col.fields.getByName('sort_order')
        if (field) {
          field.required = true
          app.save(col)
        }
      } catch (e) {}
    }
  },
)
