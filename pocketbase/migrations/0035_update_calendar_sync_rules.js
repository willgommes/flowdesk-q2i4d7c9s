migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('calendar_sync')

    collection.listRule = "@request.auth.id != ''"
    collection.viewRule = "@request.auth.id != ''"
    collection.createRule = "@request.auth.role = 'admin'"
    collection.updateRule = "@request.auth.role = 'admin'"
    collection.deleteRule = "@request.auth.role = 'admin'"

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('calendar_sync')

    collection.listRule = "@request.auth.id != ''"
    collection.viewRule = "@request.auth.id != ''"
    collection.createRule = "@request.auth.role = 'admin'"
    collection.updateRule = "@request.auth.role = 'admin'"
    collection.deleteRule = "@request.auth.role = 'admin'"

    app.save(collection)
  },
)
