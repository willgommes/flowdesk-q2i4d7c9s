onRecordDelete((e) => {
  const collections = [
    'card_labels',
    'card_members',
    'attachments',
    'checklist_items',
    'comments',
    'activity_logs',
  ]

  for (const col of collections) {
    try {
      const records = $app.findRecordsByFilter(col, 'card_id = {:id}', '', 10000, 0, {
        id: e.record.id,
      })
      for (const r of records) {
        $app.delete(r)
      }
    } catch (err) {
      // Ignore if records are not found or collection doesn't exist
    }
  }

  e.next()
}, 'cards')
