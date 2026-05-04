migrate(
  (app) => {
    const boards = app.findCollectionByNameOrId('boards')
    const clients = app.findCollectionByNameOrId('clients')
    boards.fields.add(
      new RelationField({
        name: 'client_id',
        collectionId: clients.id,
        cascadeDelete: false,
        maxSelect: 1,
      }),
    )
    app.save(boards)
  },
  (app) => {
    const boards = app.findCollectionByNameOrId('boards')
    boards.fields.removeByName('client_id')
    app.save(boards)
  },
)
