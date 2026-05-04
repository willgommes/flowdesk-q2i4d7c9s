migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clients')
    col.fields.add(
      new SelectField({
        name: 'contract_status',
        values: ['active', 'expired', 'signed', 'pending_signature'],
        maxSelect: 1,
      }),
    )
    col.fields.add(
      new DateField({
        name: 'contract_expiration_date',
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clients')
    col.fields.removeByName('contract_status')
    col.fields.removeByName('contract_expiration_date')
    app.save(col)
  },
)
