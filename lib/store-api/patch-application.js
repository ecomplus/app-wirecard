'use strict'

module.exports = (appSkd, storeId) => {
  return (body, hiddenData = false) => {
    return appSkd.getAuth(storeId)
      .then(auth => {
        const appId = auth.row.application_id
        let url = 'applications/' + appId

        if (hiddenData) {
          url += '/hidden_data.json'
        } else {
          url += '/data.json'
        }

        return appSkd.apiRequest(storeId, url, 'patch', body, auth)
      })
  }
}
