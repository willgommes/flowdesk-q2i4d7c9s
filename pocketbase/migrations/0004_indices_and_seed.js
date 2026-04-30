migrate(
  (app) => {
    const boards = app.findCollectionByNameOrId('boards')
    boards.addIndex('idx_boards_archived', false, 'archived', '')
    app.save(boards)

    const columns = app.findCollectionByNameOrId('columns')
    columns.addIndex('idx_columns_board_order', false, 'board_id, sort_order', '')
    app.save(columns)

    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'eu@willgommes.com')
      try {
        app.findFirstRecordByData('boards', 'name', 'Campanha de Lançamento')
      } catch (_) {
        const board = new Record(boards)
        board.set('name', 'Campanha de Lançamento')
        board.set('client_name', 'Acme Corp')
        board.set('created_by', admin.id)
        board.set('members', [admin.id])
        app.save(board)

        const colNames = ['A fazer', 'Em andamento', 'Concluído']
        for (let i = 0; i < colNames.length; i++) {
          const col = new Record(columns)
          col.set('board_id', board.id)
          col.set('name', colNames[i])
          col.set('sort_order', i)
          app.save(col)
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const boards = app.findCollectionByNameOrId('boards')
      boards.removeIndex('idx_boards_archived')
      app.save(boards)

      const columns = app.findCollectionByNameOrId('columns')
      columns.removeIndex('idx_columns_board_order')
      app.save(columns)
    } catch (_) {}
  },
)
