onRecordAfterCreateSuccess((e) => {
  const boardId = e.record.id
  const columns = $app.findCollectionByNameOrId('columns')

  const defaults = ['EM ABERTO', 'EM ANDAMENTO', 'CONCLUÍDO']
  defaults.forEach((name, i) => {
    const col = new Record(columns)
    col.set('board_id', boardId)
    col.set('name', name)
    col.set('sort_order', i + 1)
    col.set('color', '#e2e8f0')
    $app.saveNoValidate(col)
  })

  e.next()
}, 'boards')
