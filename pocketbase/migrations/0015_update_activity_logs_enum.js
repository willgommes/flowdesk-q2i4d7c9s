migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('activity_logs')

    const cardIdField = col.fields.getByName('card_id')
    if (cardIdField) {
      cardIdField.required = false
    }

    const actionTypeField = col.fields.getByName('action_type')
    if (actionTypeField && !actionTypeField.values.includes('briefing_read')) {
      actionTypeField.values.push('briefing_read')
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('activity_logs')

    const cardIdField = col.fields.getByName('card_id')
    if (cardIdField) {
      cardIdField.required = true
    }

    const actionTypeField = col.fields.getByName('action_type')
    if (actionTypeField) {
      actionTypeField.values = actionTypeField.values.filter((v) => v !== 'briefing_read')
    }

    app.save(col)
  },
)
