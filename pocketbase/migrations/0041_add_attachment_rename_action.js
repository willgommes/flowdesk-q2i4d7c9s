migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('activity_logs')

    const actionTypeField = col.fields.getByName('action_type')
    if (actionTypeField && !actionTypeField.values.includes('attachment_rename')) {
      actionTypeField.values.push('attachment_rename')
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('activity_logs')

    const actionTypeField = col.fields.getByName('action_type')
    if (actionTypeField) {
      actionTypeField.values = actionTypeField.values.filter((v) => v !== 'attachment_rename')
    }

    app.save(col)
  },
)
