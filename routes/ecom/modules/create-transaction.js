'use strict'
const logger = require('console-files')
const moment = require('moment')

// SQLite3 database abstracted
const { authentications, transactions } = require('./../../../lib/database')
// parse create transaction module request body to wirecard api reference
const parsePaymentBody = require('./../../../lib/parse-payment-body')
// convert payment status to store-api valid status
const parsePaymentStatus = require('./../../../lib/parse-payment-status')
// application default config
const configDefault = require('./../../../lib/payment-default')
// create new order in wirecard api
const createOrder = require('./../../../lib/wirecard-api/create-order')
// execute payment for wirecard orders
const executePayment = require('./../../../lib/wirecard-api/execute-payment')

module.exports = appSdk => {
  return (req, res) => {
    const { storeId, body } = req
    // body was already pre-validated on @/bin/web.js
    // treat module request body
    const { params, application } = body
    // app configured options
    const config = Object.assign({}, application.hidden_data, configDefault)

    // wirecard client options
    let options

    authentications.get(storeId)

      .then(auth => {
        return new Promise((resolve, reject) => {
          if (!auth || !auth.w_access_token) {
            const err = new Error(`Authentication not found for store #${storeId} `)
            reject(err)
          } else {
            options = {
              accessToken: auth.w_access_token,
              production: Boolean(config.sandbox && config.sandbox === true)
            }
            resolve({ options })
          }
        })
      })

      .then(({ options }) => {
        const paymentBody = parsePaymentBody(body)
        return createOrder(paymentBody, options).then(response => ({ wirecardOrder: response.body, options }))
      })

      .then(async ({ wirecardOrder, options }) => {
        logger.log(`[!] New Wirecard order ${wirecardOrder.id} for store #${storeId} /${params.order_id}`)
        const store = await appSdk.apiRequest(storeId, '/stores/me.json').then(resp => resp.response.data)

        // try to pay the order created
        let paymentBody
        switch (params.payment_method.code) {
          case 'online_debit':
            paymentBody = {
              fundingInstrument: {
                method: 'ONLINE_BANK_DEBIT',
                onlineBankDebit: {
                  bankNumber: 341,
                  expirationDate: new Date().toISOString().slice(0, 10)
                }
              }
            }
            break
          case 'banking_billet':
            const bankingBillet = config.payment_options.find(option => option.type === 'banking_billet')
            paymentBody = {
              statementDescriptor: config.statement_descriptor ? config.statement_descriptor.substr(0, 12) : store.name.substr(0, 12),
              fundingInstrument: {
                method: 'BOLETO',
                boleto: {
                  expirationDate: moment(new Date()).add(bankingBillet.expiration_date, 'days').toISOString().slice(0, 10),
                  instructionLines: {
                    first: bankingBillet.instruction_lines ? bankingBillet.instruction_lines.first : 'Atenção',
                    second: bankingBillet.instruction_lines ? bankingBillet.instruction_lines.second : 'fique atento à data de vencimento do boleto.',
                    third: bankingBillet.instruction_lines ? bankingBillet.instruction_lines.third : 'Pague em qualquer casa lotérica.'
                  },
                  logoUri: store.logo ? store.logo.url : 'https://developers.e-com.plus/src/assets/img/logo-dark.png'
                }
              }
            }
            break
          case 'credit_card':
            const { payer, buyer, to } = params
            paymentBody = {
              installmentCount: params.installments_number,
              statementDescriptor: config.statement_descriptor ? config.statement_descriptor.substr(0, 12) : store.name.substr(0, 12),
              fundingInstrument: {
                method: 'CREDIT_CARD',
                creditCard: {
                  hash: params.credit_card.hash,
                  store: true,
                  holder: {
                    fullname: payer ? payer.fullname : buyer.fullname,
                    birthdate: `${buyer.birth_date.year}-${buyer.birth_date.month}-${buyer.birth_date.day}`,
                    taxDocument: {
                      type: buyer.registry_type === 'p' ? 'CPF' : 'CNPJ',
                      number: payer ? payer.doc_number : buyer.doc_number
                    },
                    phone: {
                      countryCode: buyer.phone && buyer.phone.country_code ? buyer.phone.country_code : '55',
                      areaCode: buyer.phone && buyer.phone.number ? buyer.phone.number.substr(0, 2) : '',
                      number: buyer.phone.number
                    },
                    billingAddress: {
                      city: to.city,
                      district: to.borough,
                      street: to.street,
                      streetNumber: to.number,
                      zipCode: to.zip,
                      state: to.province_code ? to.province_code : to.province,
                      country: to.country_code || 'BRA'
                    }
                  }
                }
              }
            }
            break
          default: break
        }

        // try to pay the order created
        return executePayment(wirecardOrder.id, paymentBody, options).then(response => response.body)
      })

      .then(payment => {
        // parse response to module schema
        // https://apx-mods.e-com.plus/api/v1/create_transaction/response_schema.json?store_id=100
        let response
        switch (payment.fundingInstrument.method) {
          case 'BOLETO':
            response = {
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
            break
          case 'CREDIT_CARD':
            response = {
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
            break
          case 'ONLINE_BANK_DEBIT':
            response = {
              redirect_to_payment: false,
              transaction: {
                amount: (payment.amount.total / 100),
                payment_link: payment._links.payOnlineBankDebitItau.redirectHref
              }
            }
            break
          default: break
        }

        res.send(response)
        return {
          transactionId: payment.id,
          status: payment.status
        }
      })

      .then(({ transactionId, status }) => {
        return transactions.save(transactionId, status, storeId)
      })

      .catch(err => {
        console.log(err)
        logger.error(`[X] Error creating transaction for order ${params.order_number} | store #${storeId} | ${err}`)
        res.status(400)
        return res.send({
          error: 'CREATE_TRANSACTION_ERR',
          message: 'Unexpected Error Try Later'
        })
      })
  }
}
