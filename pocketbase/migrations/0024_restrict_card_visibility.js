migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('cards')
    col.listRule =
      "@request.auth.role = 'admin' || @collection.card_members.card_id ?= id && @collection.card_members.user_id ?= @request.auth.id"
    col.viewRule =
      "@request.auth.role = 'admin' || @collection.card_members.card_id ?= id && @collection.card_members.user_id ?= @request.auth.id"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('cards')
    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"
    app.save(col)
  },
)
