onRecordCreate((e) => {
  const title = e.record.getString('title')
  if (!title) return e.next()

  let year, month, day
  const currentYear = new Date().getFullYear()

  const matchFull = title.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/)
  const matchIso = title.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  const matchText = title.match(
    /\b(\d{1,2})\/(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i,
  )
  const matchShort = title.match(/\b(\d{1,2})\/(\d{1,2})\b/)

  if (matchFull) {
    day = parseInt(matchFull[1], 10)
    month = parseInt(matchFull[2], 10)
    year = parseInt(matchFull[3], 10)
  } else if (matchIso) {
    year = parseInt(matchIso[1], 10)
    month = parseInt(matchIso[2], 10)
    day = parseInt(matchIso[3], 10)
  } else if (matchText) {
    const ptMonths = {
      janeiro: 1,
      fevereiro: 2,
      março: 3,
      marco: 3,
      abril: 4,
      maio: 5,
      junho: 6,
      julho: 7,
      agosto: 8,
      setembro: 9,
      outubro: 10,
      novembro: 11,
      dezembro: 12,
    }
    day = parseInt(matchText[1], 10)
    month = ptMonths[matchText[2].toLowerCase()]
    year = currentYear
  } else if (matchShort) {
    day = parseInt(matchShort[1], 10)
    month = parseInt(matchShort[2], 10)
    year = currentYear
  }

  if (year && month && day) {
    const d = new Date(year, month - 1, day)
    if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
      const yStr = year.toString().padStart(4, '0')
      const mStr = month.toString().padStart(2, '0')
      const dStr = day.toString().padStart(2, '0')
      // Default to 23:59:59.000Z to prevent premature expiration
      e.record.set('due_date', `${yStr}-${mStr}-${dStr} 23:59:59.000Z`)
    }
  }

  return e.next()
}, 'cards')
