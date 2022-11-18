const logger = require('console-files')
const { getStores, authentications } = require('./database')
const fetchPayment = require('./wirecard-api/fetch-payment')
const wirecardStatus = require('./parse-payment-status')
const getConfig = require('./store-api/get-config')

const handler = appSdk => {
  const job = () => getStores().then(listOfStores => {
    logger.log('Transactions updater init..')
    let current = 0
    const nextStore = () => {
      current++
      return checkStores()
    }

    const checkStores = () => {
      if (!listOfStores[current]) {
        return Promise.resolve()
      }
      const storeId = listOfStores[current]
      return authentications.get(storeId).then(async auth => {
        const appConfig = await getConfig({ appSdk, storeId }, true)
        const wirecardConfig = {
          production: true
        }
        if (appConfig && appConfig.token && appConfig.key) {
          wirecardConfig.key = appConfig.key
          wirecardConfig.token = appConfig.token
        }
        if (!wirecardConfig.token) {
          wirecardConfig.accessToken = auth.w_access_token
        }

        if (appConfig.sandbox && appConfig.sandbox === true) {
          wirecardConfig.production = false
        }

        const date = new Date()
        date.setDate(date.getDate() - 4)
        const url = 'orders.json?fields=_id,transactions,payments_history,financial_status,number' +
          '&transactions.app.intermediator.code=wirecard' +
          `&created_at>=${date.toISOString()}` +
          '&sort=opened_at' +
          '&limit=200'

        return appSdk
          .apiRequest(storeId, url)
          .then(({ response }) => {
            const { result } = response.data
            logger.log(`@INFO: checking ${result} transactions of store ${storeId} to update`)
            let index = 0
            const nextOrder = (mustDelay = true) => {
              index++
              return setTimeout(checkOrder, mustDelay ? 1000 : 100)
            }

            const checkOrder = async () => {
              if (!result[index]) {
                return nextStore()
              }

              const order = result[index]
              if (order && order.transactions) {
                const orderTransaction = order.transactions.find(({ app, intermediator }) => {
                  if (app && app.intermediator && app.intermediator.code === 'wirecard') {
                    return Boolean(intermediator && intermediator.transaction_code)
                  }
                  return false
                })
                const financialStatus = order.financial_status || {}
                if (orderTransaction && !(Date.now() - new Date(financialStatus.updated_at).getTime() < 65 * 60 * 1000)) {
                  const ecomStatus = financialStatus.current

                  // busca a transação no wirecard
                  return fetchPayment(orderTransaction.intermediator.transaction_code, wirecardConfig)
                    .then(({ body }) => {
                      if (wirecardStatus(body.status) !== ecomStatus) {
                        const paymentsHistory = {
                          transaction_id: orderTransaction._id,
                          date_time: new Date().toISOString(),
                          status: wirecardStatus(body.status),
                          flags: [
                            'wirecard',
                            'transactions:updater'
                          ]
                        }
                        const url = `orders/${order._id}/payments_history.json`
                        const method = 'POST'
                        return appSdk.apiRequest(storeId, url, method, paymentsHistory).then(() => {
                          logger.log('@INFO:', JSON.stringify({
                            event: 'transactions:update',
                            order_number: order.number,
                            status: {
                              old: ecomStatus,
                              current: wirecardStatus(body.status)
                            },
                            storeId,
                            success: true
                          }, undefined, 2))
                        })
                      }
                    })
                    .catch(error => {
                      logger.log('@ERROR:', JSON.stringify({
                        event: 'transactions:update',
                        order_number: order.number,
                        storeId,
                        success: false,
                        error: true,
                        errors: error
                      }, undefined, 2))
                    })
                    .finally(nextOrder)
                }
              }
              nextOrder(false)
            }

            checkOrder()
          })
      })
    }

    return checkStores()
  })

  const run = () => {
    job().finally(() => {
      // call again after 1 hour
      setTimeout(run, 60 * 60 * 1000)
    })
  }
  setTimeout(run, 10 * 60 * 1000)
}

module.exports = handler
