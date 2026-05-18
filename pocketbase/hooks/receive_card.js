routerAdd('POST', '/backend/v1/receive-card', (e) => {
  const authHeader = e.request.header.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '').trim()

  if (token !== 'sk-flowdesk-prod-8f2c-9a4b-55e1-x9zq') {
    throw new UnauthorizedError('Invalid or missing API key.')
  }

  const body = e.requestInfo().body
  if (!body) {
    throw new BadRequestError('Missing request body.')
  }

  const clientName = body.client_name
  const boardName = body.board_name
  const columnName = body.column_name
  const cardName = body.card_name
  const dueDate = body.due_date

  if (!clientName || !boardName || !columnName || !cardName) {
    throw new BadRequestError(
      'Missing required fields: client_name, board_name, column_name, card_name.',
    )
  }

  // Find Client
  let client
  try {
    client = $app.findFirstRecordByFilter('clients', 'name = {:name}', { name: clientName })
  } catch (err) {
    throw new NotFoundError(`Client not found: ${clientName}`)
  }

  // Find Board
  let board
  try {
    board = $app.findFirstRecordByFilter('boards', 'name = {:name} && client_id = {:clientId}', {
      name: boardName,
      clientId: client.id,
    })
  } catch (err) {
    throw new NotFoundError(`Board not found: ${boardName} for client ${clientName}`)
  }

  // Find Column
  let column
  try {
    column = $app.findFirstRecordByFilter('columns', 'name = {:name} && board_id = {:boardId}', {
      name: columnName,
      boardId: board.id,
    })
  } catch (err) {
    throw new NotFoundError(`Column not found: ${columnName} for board ${boardName}`)
  }

  // Get sort order
  let sortOrder = 1
  try {
    const lastCards = $app.findRecordsByFilter(
      'cards',
      'column_id = {:columnId}',
      '-sort_order',
      1,
      0,
      { columnId: column.id },
    )
    if (lastCards && lastCards.length > 0) {
      sortOrder = (lastCards[0].getInt('sort_order') || 0) + 1
    }
  } catch (err) {
    // Ignore error, fallback to 1
  }

  // Get admin user to set created_by
  let adminId = null
  try {
    const admin = $app.findAuthRecordByEmail('users', 'eu@willgommes.com')
    adminId = admin.id
  } catch (err) {
    // Admin not found
  }

  const collection = $app.findCollectionByNameOrId('cards')
  const record = new Record(collection)

  record.set('title', cardName)
  record.set('board_id', board.id)
  record.set('column_id', column.id)
  record.set('sort_order', sortOrder)
  record.set('archived', false)
  record.set('completed', false)
  record.set('is_recurring', false)

  if (dueDate) {
    record.set('due_date', dueDate)
  }

  if (adminId) {
    record.set('created_by', adminId)
  }

  $app.save(record)

  return e.json(201, {
    id: record.id,
    title: record.getString('title'),
    board_id: record.getString('board_id'),
    column_id: record.getString('column_id'),
  })
})
