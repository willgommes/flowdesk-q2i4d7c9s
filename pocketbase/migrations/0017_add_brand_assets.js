migrate(
  (app) => {
    const clients = app.findCollectionByNameOrId('clients')

    // Add new brand_assets field
    if (!clients.fields.getByName('brand_assets')) {
      clients.fields.add(
        new FileField({
          name: 'brand_assets',
          maxSelect: 99,
          maxSize: 52428800, // 50MB
          mimeTypes: [
            'image/jpeg',
            'image/png',
            'image/svg+xml',
            'image/gif',
            'image/webp',
            'application/pdf',
          ],
        }),
      )
    }

    // Ensure contract field is multi-select
    const contractField = clients.fields.getByName('contract')
    if (contractField) {
      contractField.maxSelect = 99
    }

    app.save(clients)
  },
  (app) => {
    const clients = app.findCollectionByNameOrId('clients')
    clients.fields.removeByName('brand_assets')
    app.save(clients)
  },
)
