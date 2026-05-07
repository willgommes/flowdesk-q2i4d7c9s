migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('cards')

    if (!col.fields.getByName('approval_status')) {
      col.fields.add(
        new SelectField({
          name: 'approval_status',
          values: ['active', 'pending_approval', 'rejected'],
          maxSelect: 1,
        }),
      )
    }

    // Update rules to support approval and management
    col.listRule =
      "@request.auth.role = 'admin' || (@request.auth.can_manage_routines = true && is_recurring = true) || @collection.card_members.card_id ?= id && @collection.card_members.user_id ?= @request.auth.id"
    col.viewRule = col.listRule
    col.createRule =
      "@request.auth.id != '' && (@request.body.is_recurring != true || @request.auth.role = 'admin' || @request.auth.can_manage_routines = true || @request.body.approval_status = 'pending_approval')"
    col.updateRule =
      "@request.auth.id != '' && (is_recurring != true || @request.auth.role = 'admin' || @request.auth.can_manage_routines = true || (@collection.card_members.card_id ?= id && @collection.card_members.user_id ?= @request.auth.id)) && (@request.body.is_recurring != true || @request.auth.role = 'admin' || @request.auth.can_manage_routines = true)"

    app.save(col)

    // Set existing to active
    app
      .db()
      .newQuery(
        `UPDATE cards SET approval_status = 'active' WHERE is_recurring = true AND (approval_status IS NULL OR approval_status = '')`,
      )
      .execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('cards')
    const f = col.fields.getByName('approval_status')
    if (f) {
      col.fields.removeById(f.id)
    }
    col.listRule =
      "@request.auth.role = 'admin' || @collection.card_members.card_id ?= id && @collection.card_members.user_id ?= @request.auth.id"
    col.viewRule = col.listRule
    col.createRule =
      "@request.auth.id != '' && (@request.body.is_recurring != true || @request.auth.role = 'admin' || @request.auth.can_manage_routines = true)"
    col.updateRule =
      "@request.auth.id != '' && (is_recurring != true || @request.auth.role = 'admin' || @request.auth.can_manage_routines = true) && (@request.body.is_recurring != true || @request.auth.role = 'admin' || @request.auth.can_manage_routines = true)"
    app.save(col)
  },
)
