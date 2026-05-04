migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('labels')

    try {
      app.findFirstRecordByData('labels', 'name', 'Urgente')
    } catch (_) {
      const record = new Record(col)
      record.set('name', 'Urgente')
      record.set('color', '#ef4444')
      record.set('is_system', true)
      app.save(record)
    }

    try {
      app.findFirstRecordByData('labels', 'name', 'Alta Prioridade')
    } catch (_) {
      const record = new Record(col)
      record.set('name', 'Alta Prioridade')
      record.set('color', '#f59e0b')
      record.set('is_system', true)
      app.save(record)
    }
  },
  (app) => {
    try {
      const urgente = app.findFirstRecordByData('labels', 'name', 'Urgente')
      app.delete(urgente)
    } catch (_) {}

    try {
      const alta = app.findFirstRecordByData('labels', 'name', 'Alta Prioridade')
      app.delete(alta)
    } catch (_) {}
  },
)
