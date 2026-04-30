migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (!col.fields.getByName('theme')) {
      col.fields.add(
        new SelectField({
          name: 'theme',
          values: ['light', 'dark'],
          maxSelect: 1,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (col.fields.getByName('theme')) {
      col.fields.removeByName('theme')
      app.save(col)
    }
  },
)
