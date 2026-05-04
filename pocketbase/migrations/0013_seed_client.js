migrate(
  (app) => {
    const clients = app.findCollectionByNameOrId('clients')
    try {
      app.findFirstRecordByData('clients', 'name', 'Projetos Internos')
      return
    } catch (_) {}

    const record = new Record(clients)
    record.set('name', 'Projetos Internos')
    record.set('status', 'active')
    record.set('palette', [
      { hex: '#000000', rgb: '0, 0, 0', name: 'Preto' },
      { hex: '#FFFFFF', rgb: '255, 255, 255', name: 'Branco' },
      { hex: '#3B82F6', rgb: '59, 130, 246', name: 'Azul Primário' },
    ])
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findFirstRecordByData('clients', 'name', 'Projetos Internos')
      app.delete(record)
    } catch (_) {}
  },
)
