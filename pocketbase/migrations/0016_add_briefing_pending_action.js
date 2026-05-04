migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('activity_logs')
    const field = col.fields.getByName('action_type')
    if (!field.values.includes('briefing_pending')) {
      field.values.push('briefing_pending')
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('activity_logs')
    const field = col.fields.getByName('action_type')
    field.values = field.values.filter((v) => v !== 'briefing_pending')
    app.save(col)
  },
)
