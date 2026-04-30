migrate(
  (app) => {
    const boards = new Collection({
      name: 'boards',
      type: 'base',
      listRule: "@request.auth.role = 'admin' || members ~ @request.auth.id",
      viewRule: "@request.auth.role = 'admin' || members ~ @request.auth.id",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: "@request.auth.role = 'admin'",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'color', type: 'text' },
        { name: 'icon', type: 'text' },
        { name: 'client_name', type: 'text' },
        {
          name: 'created_by',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'archived', type: 'bool' },
        {
          name: 'members',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 100,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(boards)

    const columns = new Collection({
      name: 'columns',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'board_id',
          type: 'relation',
          required: true,
          collectionId: boards.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'sort_order', type: 'number', required: true },
        { name: 'color', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(columns)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('columns'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('boards'))
    } catch (_) {}
  },
)
