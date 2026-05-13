onRecordDelete((e) => {
  const syncId = e.record.id
  try {
    const ignoredEvents = $app.findRecordsByFilter(
      'ignored_google_events',
      `sync_id = '${syncId}'`,
      '',
      1000,
      0,
    )
    for (const ev of ignoredEvents) {
      $app.delete(ev)
    }
  } catch (err) {}
  e.next()
}, 'calendar_sync')
