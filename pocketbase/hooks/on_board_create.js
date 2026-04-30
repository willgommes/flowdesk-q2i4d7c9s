onRecordAfterCreateSuccess((e) => {
  const cols = ['A fazer', 'Em andamento', 'Concluído']
  const columnsCol = $app.findCollectionByNameOrId('columns')
  for (let i = 0; i < cols.length; i++) {
    const col = new Record(columnsCol)
    col.set('board_id', e.record.id)
    col.set('name', cols[i])
    col.set('sort_order', i)
    $app.save(col)
  }
  return e.next()
}, 'boards')
