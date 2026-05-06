migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.add(
      new SelectField({
        name: 'time_format',
        values: ['12h', '24h'],
        maxSelect: 1,
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.removeByName('time_format')
    app.save(col)
  },
)
