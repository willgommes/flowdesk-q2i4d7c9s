migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const boards = app.findCollectionByNameOrId('boards')
    const columns = app.findCollectionByNameOrId('columns')

    const cards = new Collection({
      name: 'cards',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'column_id',
          type: 'relation',
          required: true,
          collectionId: columns.id,
          maxSelect: 1,
        },
        {
          name: 'board_id',
          type: 'relation',
          required: true,
          collectionId: boards.id,
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'editor' },
        { name: 'due_date', type: 'date' },
        { name: 'sort_order', type: 'number', required: true },
        { name: 'created_by', type: 'relation', collectionId: users.id, maxSelect: 1 },
        { name: 'completed', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(cards)

    const labels = new Collection({
      name: 'labels',
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
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'color', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(labels)

    const card_labels = new Collection({
      name: 'card_labels',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'card_id', type: 'relation', required: true, collectionId: cards.id, maxSelect: 1 },
        {
          name: 'label_id',
          type: 'relation',
          required: true,
          collectionId: labels.id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(card_labels)

    const card_members = new Collection({
      name: 'card_members',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'card_id', type: 'relation', required: true, collectionId: cards.id, maxSelect: 1 },
        { name: 'user_id', type: 'relation', required: true, collectionId: users.id, maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(card_members)

    const attachments = new Collection({
      name: 'attachments',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'card_id', type: 'relation', required: true, collectionId: cards.id, maxSelect: 1 },
        { name: 'file', type: 'file', maxSelect: 1, maxSize: 10485760 },
        { name: 'name', type: 'text' },
        { name: 'type', type: 'text' },
        { name: 'size', type: 'number' },
        { name: 'user_id', type: 'relation', collectionId: users.id, maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(attachments)

    const checklist_items = new Collection({
      name: 'checklist_items',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'card_id', type: 'relation', required: true, collectionId: cards.id, maxSelect: 1 },
        { name: 'text', type: 'text', required: true },
        { name: 'completed', type: 'bool' },
        { name: 'sort_order', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(checklist_items)

    const comments = new Collection({
      name: 'comments',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'card_id', type: 'relation', required: true, collectionId: cards.id, maxSelect: 1 },
        { name: 'user_id', type: 'relation', required: true, collectionId: users.id, maxSelect: 1 },
        { name: 'content', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(comments)

    const activity_logs = new Collection({
      name: 'activity_logs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'card_id', type: 'relation', required: true, collectionId: cards.id, maxSelect: 1 },
        { name: 'user_id', type: 'relation', required: true, collectionId: users.id, maxSelect: 1 },
        {
          name: 'action_type',
          type: 'select',
          values: [
            'creation',
            'move',
            'edit_title',
            'edit_desc',
            'label_add',
            'label_remove',
            'assignment_add',
            'assignment_remove',
            'attachment_add',
            'comment_add',
            'date_change',
            'completion',
          ],
          required: true,
          maxSelect: 1,
        },
        { name: 'description', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(activity_logs)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('activity_logs'))
    app.delete(app.findCollectionByNameOrId('comments'))
    app.delete(app.findCollectionByNameOrId('checklist_items'))
    app.delete(app.findCollectionByNameOrId('attachments'))
    app.delete(app.findCollectionByNameOrId('card_members'))
    app.delete(app.findCollectionByNameOrId('card_labels'))
    app.delete(app.findCollectionByNameOrId('labels'))
    app.delete(app.findCollectionByNameOrId('cards'))
  },
)
