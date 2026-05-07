migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('cards')

    if (!col.fields.getByName('is_recurring')) {
      col.fields.add(new BoolField({ name: 'is_recurring' }))
    }
    if (!col.fields.getByName('recurrence_days')) {
      col.fields.add(new JSONField({ name: 'recurrence_days', maxSize: 2048 }))
    }
    if (!col.fields.getByName('recurrence_time')) {
      col.fields.add(new TextField({ name: 'recurrence_time', max: 5 }))
    }

    col.addIndex('idx_cards_is_recurring', false, 'is_recurring', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('cards')
    col.fields.removeByName('is_recurring')
    col.fields.removeByName('recurrence_days')
    col.fields.removeByName('recurrence_time')
    col.removeIndex('idx_cards_is_recurring')
    app.save(col)
  },
)
