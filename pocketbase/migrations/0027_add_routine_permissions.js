migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    usersCol.fields.add(
      new BoolField({
        name: 'can_manage_routines',
      }),
    )
    app.save(usersCol)

    const cardsCol = app.findCollectionByNameOrId('cards')
    cardsCol.createRule =
      "@request.auth.id != '' && (@request.body.is_recurring != true || @request.auth.role = 'admin' || @request.auth.can_manage_routines = true)"
    cardsCol.updateRule =
      "@request.auth.id != '' && (is_recurring != true || @request.auth.role = 'admin' || @request.auth.can_manage_routines = true) && (@request.body.is_recurring != true || @request.auth.role = 'admin' || @request.auth.can_manage_routines = true)"
    cardsCol.deleteRule =
      "@request.auth.id != '' && (is_recurring != true || @request.auth.role = 'admin' || @request.auth.can_manage_routines = true)"
    app.save(cardsCol)
  },
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    usersCol.fields.removeByName('can_manage_routines')
    app.save(usersCol)

    const cardsCol = app.findCollectionByNameOrId('cards')
    cardsCol.createRule = "@request.auth.id != ''"
    cardsCol.updateRule = "@request.auth.id != ''"
    cardsCol.deleteRule = "@request.auth.id != ''"
    app.save(cardsCol)
  },
)
