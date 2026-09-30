onRecordAfterCreateSuccess((e) => {
  const attachment = e.record

  // Ignorar automação quando o anexo for criado pelo usuário neo@artistica.online
  const userId = attachment.get('user_id')
  if (userId) {
    try {
      const user = $app.findRecordById('users', userId)
      const email = (user.getString('email') || user.get('email') || '').toLowerCase().trim()
      if (email === 'neo@artistica.online') {
        return e.next()
      }
    } catch (userErr) {
      $app.logger().error('Failed to lookup attachment creator user', 'error', userErr.message)
    }
  }

  const cardId = attachment.get('card_id')
  if (!cardId) return e.next()

  try {
    const card = $app.findRecordById('cards', cardId)
    const boardId = card.get('board_id')

    const columns = $app.findRecordsByFilter(
      'columns',
      "board_id = '" + boardId + "' && name = 'Concluído'",
      '',
      1,
      0,
    )

    if (columns && columns.length > 0) {
      const targetColumn = columns[0]

      if (card.get('column_id') !== targetColumn.id) {
        card.set('column_id', targetColumn.id)
        card.set('completed', true)
        $app.save(card)

        try {
          const logCol = $app.findCollectionByNameOrId('activity_logs')
          const log = new Record(logCol)
          log.set('card_id', card.id)

          let userId = attachment.get('user_id') || card.get('created_by')
          if (!userId && e.auth) {
            userId = e.auth.id
          }
          if (userId) {
            log.set('user_id', userId)
          }

          log.set('action_type', 'move')
          log.set('description', 'Movido automaticamente para Concluído devido a anexo.')
          $app.save(log)
        } catch (logErr) {
          $app
            .logger()
            .error('Failed to create log for attachment automation', 'error', logErr.message)
        }
      }
    }
  } catch (err) {
    $app.logger().error('Attachment automation failed', 'error', err.message)
  }

  return e.next()
}, 'attachments')
