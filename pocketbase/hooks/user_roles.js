onRecordCreateRequest((e) => {
  const total = $app.countRecords('_pb_users_auth_')
  const body = e.requestInfo().body
  if (total === 0) {
    body.role = 'admin'
  } else if (!e.auth || e.auth.getString('role') !== 'admin') {
    body.role = 'membro'
  }
  e.next()
}, '_pb_users_auth_')

onRecordUpdateRequest((e) => {
  const body = e.requestInfo().body
  if (body.role !== undefined && (!e.auth || e.auth.getString('role') !== 'admin')) {
    delete body.role
  }
  e.next()
}, '_pb_users_auth_')
