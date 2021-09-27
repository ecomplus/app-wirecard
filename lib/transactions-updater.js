const logger = require('console-files')
const { getStores, authentications } = require('./database')
const fetchPayment = require('./wirecard-api/fetch-payment')
const wirecardStatus = require('./parse-payment-status')
const getConfig = require('./store-api/get-config')

const handler = appSdk => {
  logger.log('Transactions updater init..')
  const job = () => getStores().then(listOfStores => {
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
          accessToken: auth.w_access_token,
          production: true
        }

        if (appConfig.sandbox && appConfig.sandbox === true) {
          wirecardConfig.production = false
        }

        const date = new Date()
        date.setDate(date.getDate() - 7) // 4
        const url = 'orders.json?fields=_id,transactions,payments_history,financial_status,number' +
          '&transactions.app.intermediator.code=wirecard' +
          `&created_at>=${date.toISOString()}` +
          '&sort=-financial_status.updated_at' + // &sort=-financial_status.updated_at
          '&limit=500'

        return appSdk
          .apiRequest(storeId, url)
          .then(({ response }) => {
            const { result } = response.data
            let index = 0
            const nextOrder = () => {
              index++
              return setTimeout(checkOrder, 1000)
            }

            const checkOrder = async () => {
              if (!result[index]) {
                return nextStore()
              }

              const order = result[index]
              if (order && order.financial_status && order.financial_status.current && order.transactions) {
                const orderTransaction = order.transactions.find(transaction => transaction.intermediator && transaction.intermediator.transaction_code)

                if (orderTransaction) {
                  // busca a transação no wirecard
                  const ecomStatus = order.financial_status.current
                  fetchPayment(orderTransaction.intermediator.transaction_code, wirecardConfig)
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
                } else {
                  nextOrder()
                }
              } else {
                nextOrder()
              }
            }

            checkOrder()
          })
      })
    }

    return checkStores()
  })

  const run = () => job().finally(() => {
    // call again after 12 hours
    setTimeout(run, 60 * 60 * 1000)
  })

  run() // setTimeout(run, 600000)
}

module.exports = handler
