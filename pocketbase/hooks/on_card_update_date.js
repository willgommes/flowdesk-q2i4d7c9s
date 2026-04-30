onRecordUpdate((e) => {
  const title = e.record.getString('title')
  const originalTitle = e.record.original().getString('title')

  if (title && title !== originalTitle) {
    let year, month, day
    let match = title.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/)
    if (match) {
      day = parseInt(match[1], 10)
      month = parseInt(match[2], 10)
      year = parseInt(match[3], 10)
    } else {
      match = title.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
      if (match) {
        year = parseInt(match[1], 10)
        month = parseInt(match[2], 10)
        day = parseInt(match[3], 10)
      }
    }

    if (year && month && day) {
      const d = new Date(year, month - 1, day)
      if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
        const yStr = year.toString().padStart(4, '0')
        const mStr = month.toString().padStart(2, '0')
        const dStr = day.toString().padStart(2, '0')
        e.record.set('due_date', `${yStr}-${mStr}-${dStr} 12:00:00.000Z`)
      }
    }
  }

  return e.next()
}, 'cards')
