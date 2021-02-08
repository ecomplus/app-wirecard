'use strict'
const logger = require('console-files')
// SQLite3 database abstracted
const { authentications, transactions } = require('./../../../lib/database')
// parse create transaction module request body to wirecard api reference
const parsePaymentBody = require('./../../../lib/parse-payment-body')
// convert payment status to store-api valid status
const parsePaymentStatus = require('./../../../lib/parse-payment-status')
// create new order in wirecard api
const createOrder = require('./../../../lib/wirecard-api/create-order')
// execute payment for wirecard orders
const executePayment = require('./../../../lib/wirecard-api/execute-payment')
// wirecard payment model
const newPayment = require('./../../../lib/wirecard-api/new-payment')

module.exports = () => (req, res) => {
  const { storeId, body } = req
  // body was already pre-validated on @/bin/web.js
  // treat module request body
  const { params, application } = body
  // app configured options
  const config = Object.assign({}, application.hidden_data, application.data)

  // wirecard app config
  const wConfig = {
    production: (process.env.WC_SANDBOX !== 'true')
  }

  return authentications.get(storeId).then(auth => {
    wConfig.accessToken = auth.w_access_token
    const newOrder = parsePaymentBody(body)
    return createOrder(newOrder, wConfig)
  }).then((response) => {
    logger.log(`[Wirecard] > New order: ${response.body.id} / ${params.order_id} / #${storeId}`)
    const order = response.body
    const payment = newPayment(params.payment_method.code, params, config, params.domain)
    return executePayment(order.id, payment, wConfig)
  }).then((response) => {
    logger.log(`[Wirecard] > Pay Order: ${response.body.id} / ${params.order_id} / #${storeId}`)
    const payment = response.body
    const model = moduleParse(payment)
    // saving in db
    res.send(model)
    return transactions.save(payment.id, payment.status, storeId)
  }).then(() => {
    logger.log(`[Wirecard] > Payment complete / ${params.order_id} / #${storeId}`)
  }).catch(err => {
    logger.log(`CREATE_TRANSACTION_ERR: ${err.message} / ${params.order_id} / #${storeId}`)
    if (err.name === 'AuthNotFound') {
      return res.status(409).send({
        error: 'AUTH_ERROR',
        message: 'Authentication not found, please install the application again.'
      })
    } else {
      if (err.response) {
        const payload = {
          message: err.message,
          config: err.response.toJSON(),
          order_id: params.order_id,
          order_number: params.order_number,
          store_id: storeId
        }
        logger.error('CREATE_TRANSACTION_ERR', JSON.stringify(payload, null, 2))
      } else {
        logger.error('CREATE_TRANSACTION_ERR', err)
      }
    }
    // return error status code
    res.status(409)
    return res.send({
      error: 'CREATE_TRANSACTION_ERR',
      message: `${(err.httpStatusCode || err.statusCode)}: ` + (err.response && err.response.message) || err.message
    })
  })
}

const moduleParse = (payment) => {
  switch (payment.fundingInstrument.method) {
    case 'BOLETO':
      return {
        redirect_to_payment: false,
        transaction: {
          amount: payment.amount.total / 100,
          banking_billet: {
            code: payment.fundingInstrument.boleto.lineCode,
            link: payment._links.payBoleto.printHref,
            text_lines: [
              payment.fundingInstrument.boleto.instructionLines.first || '',
              payment.fundingInstrument.boleto.instructionLines.second || '',
              payment.fundingInstrument.boleto.instructionLines.third || ''
            ],
            valid_thru: new Date(payment.fundingInstrument.boleto.expirationDate).toISOString()
          },
          creditor_fees: {
            installment: payment.installmentCount,
            intermediation: payment.fees[0].amount
          },
          currency_id: payment.amount.currency,
          installments: {
            number: payment.installmentCount
          },
          intermediator: {
            payment_method: {
              code: 'banking_billet',
              name: 'Boleto'
            },
            transaction_id: payment.id,
            transaction_code: payment.id,
            transaction_reference: payment._links.order.title
          },
          payment_link: payment._links.self.href,
          status: {
            current: parsePaymentStatus(payment.status)
          }
        }
      }
    case 'CREDIT_CARD':
      return {
        redirect_to_payment: false,
        transaction: {
          amount: payment.amount.total / 100,
          credit_card: {
            avs_result_code: null,
            company: payment.fundingInstrument.creditCard.brand,
            cvv_result_code: null,
            holder_name: payment.fundingInstrument.creditCard.holder.fullname,
            last_digits: payment.fundingInstrument.creditCard.last4,
            token: payment.fundingInstrument.creditCard.id
          },
          creditor_fees: {
            installment: payment.installmentCount,
            intermediation: payment.fees.amount
          },
          currency_id: payment.amount.currency,
          installments: {
            number: payment.installmentCount,
            tax: (payment.amount.fees > 0),
            total: payment.amount.total / 100,
            value: Number(Math.abs((payment.amount.total / payment.installmentCount) / 100).toFixed(2))
          },
          intermediator: {
            payment_method: {
              code: 'credit_card',
              name: 'Cartão de Crédito'
            },
            transaction_id: payment.id,
            transaction_code: payment.id,
            transaction_reference: payment._links.order.title
          },
          status: {
            current: parsePaymentStatus(payment.status)
          }
        }
      }
    case 'ONLINE_BANK_DEBIT':
      return {
        redirect_to_payment: false,
        transaction: {
          amount: (payment.amount.total / 100),
          payment_link: payment._links.payOnlineBankDebitItau.redirectHref
        }
      }
    default: return false
  }
}
