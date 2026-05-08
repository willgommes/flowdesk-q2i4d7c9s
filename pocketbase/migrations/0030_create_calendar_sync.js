migrate(
  (app) => {
    const collection = new Collection({
      name: 'calendar_sync',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        { name: 'calendar_id', type: 'text', required: true },
        {
          name: 'board_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('boards').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'target_column_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('columns').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'is_active', type: 'bool' },
        { name: 'last_synced_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('calendar_sync')
    app.delete(collection)
  },
)
