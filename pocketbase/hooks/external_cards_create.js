routerAdd('POST', '/backend/v1/external/cards', (e) => {
  const apiKey = e.request.header.get('X-Api-Key')
  if (apiKey !== 'FD-7k9v-2mPq-8xYw-3nRt-5zLs-2024') {
    throw new UnauthorizedError('Invalid or missing API key.')
  }

  const body = e.requestInfo().body
  if (!body) {
    throw new BadRequestError('Missing request body.')
  }

  const boardId = body.board_id
  const columnId = body.column_id
  const title = body.title
  const description = body.description
  const dueDate = body.due_date

  if (!boardId || typeof boardId !== 'string') {
    throw new BadRequestError('board_id is required.')
  }
  if (!columnId || typeof columnId !== 'string') {
    throw new BadRequestError('column_id is required.')
  }
  if (!title || typeof title !== 'string') {
    throw new BadRequestError('title is required.')
  }

  // Get admin user
  let adminId = null
  try {
    const admin = $app.findAuthRecordByEmail('users', 'eu@willgommes.com')
    adminId = admin.id
  } catch (err) {
    // Admin not found
  }

  // Calculate sort_order
  let sortOrder = 1
  try {
    const safeColumnId = columnId.replace(/'/g, "''")
    const lastCards = $app.findRecordsByFilter(
      'cards',
      `column_id = '${safeColumnId}'`,
      '-sort_order',
      1,
      0,
    )
    if (lastCards && lastCards.length > 0) {
      sortOrder = (lastCards[0].getInt('sort_order') || 0) + 1
    }
  } catch (err) {
    // Ignore error, fallback to 1
  }

  const collection = $app.findCollectionByNameOrId('cards')
  const record = new Record(collection)

  record.set('board_id', boardId)
  record.set('column_id', columnId)
  record.set('title', title)

  if (description !== undefined && description !== null) {
    record.set('description', description)
  }

  if (dueDate !== undefined && dueDate !== null) {
    record.set('due_date', dueDate)
  }

  record.set('sort_order', sortOrder)
  record.set('archived', false)
  record.set('completed', false)

  if (adminId) {
    record.set('created_by', adminId)
  }

  $app.save(record)

  return e.json(200, { id: record.id })
})
