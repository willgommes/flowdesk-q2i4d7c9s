migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('activity_logs')

    const actionTypeField = col.fields.getByName('action_type')
    if (actionTypeField && !actionTypeField.values.includes('attachment_remove')) {
      actionTypeField.values.push('attachment_remove')
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('activity_logs')

    const actionTypeField = col.fields.getByName('action_type')
    if (actionTypeField) {
      actionTypeField.values = actionTypeField.values.filter((v) => v !== 'attachment_remove')
    }

    app.save(col)
  },
)
