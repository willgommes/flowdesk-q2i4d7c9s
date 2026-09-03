migrate(
  (app) => {
    // Sincronizar cards existentes na coluna 'CONCLUÍDO' para completed = 1
    app
      .db()
      .newQuery(
        "UPDATE cards SET completed = 1 WHERE column_id IN (SELECT id FROM columns WHERE UPPER(name) = 'CONCLUÍDO') AND (completed = 0 OR completed IS NULL)",
      )
      .execute()
  },
  () => {
    // Reversão opcional (não destrutiva)
  },
)
