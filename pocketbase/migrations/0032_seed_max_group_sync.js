migrate(
  (app) => {
    const boardsCol = app.findCollectionByNameOrId('boards')
    const columnsCol = app.findCollectionByNameOrId('columns')
    const syncCol = app.findCollectionByNameOrId('calendar_sync')

    let adminId = ''
    try {
      const admin = app.findFirstRecordByData('_pb_users_auth_', 'email', 'eu@willgommes.com')
      adminId = admin.id
    } catch (_) {
      try {
        const admins = app.findRecordsByFilter('_pb_users_auth_', "role = 'admin'", '', 1, 0)
        if (admins.length > 0) adminId = admins[0].id
      } catch (_) {}
    }

    let board
    try {
      board = app.findFirstRecordByData('boards', 'name', 'Max Group')
    } catch (_) {
      if (!adminId) throw new Error('Cannot create board Max Group because no admin user exists.')
      board = new Record(boardsCol)
      board.set('name', 'Max Group')
      board.set('color', '#64748b')
      board.set('created_by', adminId)
      app.save(board)
    }

    let column
    try {
      const records = app.findRecordsByFilter(
        'columns',
        `board_id = '${board.id}'`,
        'sort_order',
        1,
        0,
      )
      if (records.length > 0) {
        column = records[0]
      } else {
        throw new Error('No column')
      }
    } catch (_) {
      column = new Record(columnsCol)
      column.set('board_id', board.id)
      column.set('name', 'Eventos do Calendário')
      column.set('sort_order', 1)
      app.save(column)
    }

    try {
      app.findFirstRecordByData(
        'calendar_sync',
        'calendar_id',
        'c24c1b21c259ea5dbbe56785aaf9142573af175a0dca7bd01aeca40b9ed89b9d@group.calendar.google.com',
      )
    } catch (_) {
      const sync = new Record(syncCol)
      sync.set(
        'calendar_id',
        'c24c1b21c259ea5dbbe56785aaf9142573af175a0dca7bd01aeca40b9ed89b9d@group.calendar.google.com',
      )
      sync.set('board_id', board.id)
      sync.set('target_column_id', column.id)
      sync.set('is_active', true)
      app.save(sync)
    }
  },
  (app) => {
    try {
      const sync = app.findFirstRecordByData(
        'calendar_sync',
        'calendar_id',
        'c24c1b21c259ea5dbbe56785aaf9142573af175a0dca7bd01aeca40b9ed89b9d@group.calendar.google.com',
      )
      app.delete(sync)
    } catch (_) {}
  },
)
