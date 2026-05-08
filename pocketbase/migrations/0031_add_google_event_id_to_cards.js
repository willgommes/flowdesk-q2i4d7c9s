migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('cards')
    if (!col.fields.getByName('google_event_id')) {
      col.fields.add(new TextField({ name: 'google_event_id' }))
    }
    col.addIndex('idx_cards_google_event_id', false, 'google_event_id', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('cards')
    col.removeIndex('idx_cards_google_event_id')
    col.fields.removeByName('google_event_id')
    app.save(col)
  },
)
