migrate(
  (app) => {
    const ignored = new Collection({
      name: 'ignored_google_events',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'google_event_id', type: 'text', required: true },
        {
          name: 'sync_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('calendar_sync').id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(ignored)

    const notifications = new Collection({
      name: 'notifications',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: null,
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'message', type: 'text', required: true },
        { name: 'is_read', type: 'bool', required: false },
        {
          name: 'related_card_id',
          type: 'relation',
          required: false,
          collectionId: app.findCollectionByNameOrId('cards').id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(notifications)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('ignored_google_events'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('notifications'))
    } catch (e) {}
  },
)
