onRecordCreateRequest((e) => {
  const total = $app.countRecords('_pb_users_auth_')
  if (total === 0) {
    e.record.set('role', 'admin')
  } else if (!e.auth || e.auth.getString('role') !== 'admin') {
    e.record.set('role', 'membro')
  }
  e.next()
}, '_pb_users_auth_')

onRecordUpdateRequest((e) => {
  const body = e.requestInfo().body
  if (body.role !== undefined && (!e.auth || e.auth.getString('role') !== 'admin')) {
    e.record.set('role', e.record.original().getString('role'))
  }
  e.next()
}, '_pb_users_auth_')
