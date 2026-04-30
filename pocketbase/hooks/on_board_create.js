onRecordAfterCreateSuccess((e) => {
  const boardId = e.record.id
  const columns = $app.findCollectionByNameOrId('columns')

  const defaults = ['A fazer', 'Em andamento', 'Concluído']
  defaults.forEach((name, i) => {
    const col = new Record(columns)
    col.set('board_id', boardId)
    col.set('name', name)
    col.set('sort_order', i)
    col.set('color', '#e2e8f0')
    $app.save(col)
  })

  e.next()
}, 'boards')
