migrate(
  (app) => {
    const users = app.findRecordsByFilter('users', '1=1', '', 1000, 0)
    for (const user of users) {
      let layout = user.get('dashboard_layout')
      if (layout && Array.isArray(layout)) {
        if (!layout.includes('analytics_trends')) layout.push('analytics_trends')
        if (!layout.includes('analytics_distribution')) layout.push('analytics_distribution')
        user.set('dashboard_layout', layout)
        app.saveNoValidate(user)
      }
    }
  },
  (app) => {
    const users = app.findRecordsByFilter('users', '1=1', '', 1000, 0)
    for (const user of users) {
      let layout = user.get('dashboard_layout')
      if (layout && Array.isArray(layout)) {
        layout = layout.filter((id) => id !== 'analytics_trends' && id !== 'analytics_distribution')
        user.set('dashboard_layout', layout)
        app.saveNoValidate(user)
      }
    }
  },
)
