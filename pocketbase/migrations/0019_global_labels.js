migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('labels')

    const boardIdField = col.fields.getByName('board_id')
    if (boardIdField) {
      boardIdField.required = false
    }

    if (!col.fields.getByName('is_system')) {
      const { BoolField } = require('pocketbase/models/schema')
      col.fields.add(new BoolField({ name: 'is_system' }))
    }

    col.updateRule = "@request.auth.id != '' && is_system = false"
    col.deleteRule = "@request.auth.id != '' && is_system = false"

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('labels')

    const boardIdField = col.fields.getByName('board_id')
    if (boardIdField) {
      boardIdField.required = true
    }

    col.fields.removeByName('is_system')

    col.updateRule = "@request.auth.id != ''"
    col.deleteRule = "@request.auth.id != ''"

    app.save(col)
  },
)
