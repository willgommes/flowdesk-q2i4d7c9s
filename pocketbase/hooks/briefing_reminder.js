cronAdd('briefing_reminder', '0 10 * * *', () => {
  try {
    const users = $app.findRecordsByFilter('users', "role = 'membro'", '')
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    users.forEach((user) => {
      const lastBriefing = user.getString('last_briefing_at')
      if (!lastBriefing || lastBriefing < startOfToday) {
        const col = $app.findCollectionByNameOrId('activity_logs')
        const log = new Record(col)
        log.set('user_id', user.id)
        log.set('action_type', 'briefing_pending')
        log.set('description', 'Usuário não confirmou o briefing até o horário limite (10:00).')
        $app.save(log)
      }
    })
  } catch (err) {
    $app.logger().error('Error running briefing_reminder cron', 'error', err.message)
  }
})
