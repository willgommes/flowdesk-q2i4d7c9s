migrate(
  (app) => {
    // 1. Add attachment_folders (json) to cards
    const cardsCol = app.findCollectionByNameOrId('cards')
    if (!cardsCol.fields.getByName('attachment_folders')) {
      cardsCol.fields.add(
        new JSONField({
          name: 'attachment_folders',
          required: false,
        }),
      )
      app.save(cardsCol)
    }

    // 2. Add folder_id (text) to attachments
    const attCol = app.findCollectionByNameOrId('attachments')
    if (!attCol.fields.getByName('folder_id')) {
      attCol.fields.add(
        new TextField({
          name: 'folder_id',
          required: false,
        }),
      )
      app.save(attCol)
    }
  },
  (app) => {
    try {
      const cardsCol = app.findCollectionByNameOrId('cards')
      if (cardsCol.fields.getByName('attachment_folders')) {
        cardsCol.fields.removeByName('attachment_folders')
        app.save(cardsCol)
      }
    } catch (_) {}

    try {
      const attCol = app.findCollectionByNameOrId('attachments')
      if (attCol.fields.getByName('folder_id')) {
        attCol.fields.removeByName('folder_id')
        app.save(attCol)
      }
    } catch (_) {}
  },
)
