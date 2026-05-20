migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('activity_logs')
    col.addIndex('idx_activity_logs_created', false, 'created', '')
    col.addIndex('idx_activity_logs_user_id', false, 'user_id', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('activity_logs')
    col.removeIndex('idx_activity_logs_created')
    col.removeIndex('idx_activity_logs_user_id')
    app.save(col)
  },
)
