cronAdd('recurring_tasks_worker', '1 0 * * *', () => {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.

  // Fetch all recurring templates
  let templates
  try {
    templates = $app.findRecordsByFilter('cards', 'is_recurring = true', '-created', 1000, 0)
  } catch (e) {
    // collection might be empty or error
    templates = []
  }

  for (const tpl of templates) {
    const daysRaw = tpl.get('recurrence_days')
    let days = []
    try {
      if (typeof daysRaw === 'string') {
        days = JSON.parse(daysRaw) || []
      } else {
        days = daysRaw || []
      }
    } catch (e) {}

    if (!Array.isArray(days)) days = []

    if (days.includes(dayOfWeek)) {
      try {
        const newCard = new Record($app.findCollectionByNameOrId('cards'))
        newCard.set('title', tpl.getString('title'))
        newCard.set('description', tpl.getString('description'))
        newCard.set('board_id', tpl.getString('board_id'))
        newCard.set('column_id', tpl.getString('column_id'))
        newCard.set('created_by', tpl.getString('created_by'))
        newCard.set('sort_order', tpl.getInt('sort_order'))
        newCard.set('completed', false)
        newCard.set('archived', false)
        newCard.set('is_recurring', false)
        newCard.set('recurrence_days', tpl.get('recurrence_days'))
        newCard.set('recurrence_time', tpl.getString('recurrence_time'))

        const timeStr = tpl.getString('recurrence_time') // HH:mm
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth() + 1).padStart(2, '0')
        const dd = String(today.getDate()).padStart(2, '0')

        if (timeStr && timeStr.includes(':')) {
          newCard.set('due_date', `${yyyy}-${mm}-${dd} ${timeStr}:00.000Z`)
        } else {
          newCard.set('due_date', `${yyyy}-${mm}-${dd} 23:59:59.999Z`)
        }

        $app.save(newCard)

        // Copy relations
        try {
          const labels = $app.findRecordsByFilter(
            'card_labels',
            `card_id = '${tpl.id}'`,
            '',
            100,
            0,
          )
          for (const lbl of labels) {
            const newLbl = new Record($app.findCollectionByNameOrId('card_labels'))
            newLbl.set('card_id', newCard.id)
            newLbl.set('label_id', lbl.getString('label_id'))
            $app.save(newLbl)
          }
        } catch (e) {
          /* ignore if no labels */
        }

        try {
          const members = $app.findRecordsByFilter(
            'card_members',
            `card_id = '${tpl.id}'`,
            '',
            100,
            0,
          )
          for (const mbr of members) {
            const newMbr = new Record($app.findCollectionByNameOrId('card_members'))
            newMbr.set('card_id', newCard.id)
            newMbr.set('user_id', mbr.getString('user_id'))
            $app.save(newMbr)
          }
        } catch (e) {
          /* ignore if no members */
        }
      } catch (err) {
        $app
          .logger()
          .error(
            'Failed to generate recurring task for template',
            'templateId',
            tpl.id,
            'error',
            err.message,
          )
      }
    }
  }
})
