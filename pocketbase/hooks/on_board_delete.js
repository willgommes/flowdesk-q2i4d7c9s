onRecordDelete((e) => {
  const boardId = e.record.id

  // 1. Delete attachments properly so physical files are removed from storage
  try {
    const cards = $app.findRecordsByFilter('cards', `board_id = '${boardId}'`, '', 10000, 0)
    for (const card of cards) {
      try {
        const atts = $app.findRecordsByFilter('attachments', `card_id = '${card.id}'`, '', 10000, 0)
        for (const att of atts) {
          $app.delete(att)
        }
      } catch (err) {}
    }
  } catch (err) {}

  // 2. Fast delete for related records without files
  const queries = [
    `DELETE FROM activity_logs WHERE card_id IN (SELECT id FROM cards WHERE board_id = {:boardId})`,
    `DELETE FROM card_labels WHERE card_id IN (SELECT id FROM cards WHERE board_id = {:boardId})`,
    `DELETE FROM card_members WHERE card_id IN (SELECT id FROM cards WHERE board_id = {:boardId})`,
    `DELETE FROM checklist_items WHERE card_id IN (SELECT id FROM cards WHERE board_id = {:boardId})`,
    `DELETE FROM comments WHERE card_id IN (SELECT id FROM cards WHERE board_id = {:boardId})`,
    `DELETE FROM cards WHERE board_id = {:boardId}`,
    `DELETE FROM columns WHERE board_id = {:boardId}`,
    `DELETE FROM labels WHERE board_id = {:boardId}`,
  ]

  for (const sql of queries) {
    try {
      $app.db().newQuery(sql).bind({ boardId: boardId }).execute()
    } catch (err) {}
  }

  e.next()
}, 'boards')
