'use strict'
const logger = require('console-files')
const { internalApi } = require('./../../../lib/Api/Api')
module.exports = () => {
  return (req, res) => {
    const { application, params } = req.body
    const storeId = req.storeId
    internalApi

      .then(api => {
        return api.getWirecardAuth(storeId)
      })
      .then(auth => {
        if (auth) {
          if (!application.hasOwnProperty('hidden_data') ||
            (application.hasOwnProperty('hidden_data') && !application.hidden_data.hasOwnProperty('payment_options'))
          ) {
            res.send({
              payment_gateways: []
            })
          }

          return new Promise(resolve => {
            let list = application.hidden_data.payment_options.map(async paymentOption => {
              let item = {}
              if (!(item.discount = listPaymentSchema.discount(paymentOption, application))) {
                delete item.discount
              }
              if (!(item.installment_options = listPaymentSchema.installment_options(paymentOption, params))) {
                delete item.installment_options
              }
              if (!(item.intermediator = listPaymentSchema.intermediator(paymentOption))) {
                delete item.intermediator
              }
              if (!(item.icon = listPaymentSchema.icon(paymentOption))) {
                delete item.icon
              }
              if (paymentOption.type === 'credit_card') {
                if (!(item.js_client = await listPaymentSchema.js_client(application))) {
                  delete item.js_client
                }
              }
              if (!(item.label = listPaymentSchema.label(paymentOption))) {
                delete item.label
              }
              if (!(item.payment_method = listPaymentSchema.payment_method(paymentOption))) {
                delete item.payment_method
              }
              if (!(item.payment_url = listPaymentSchema.payment_url(paymentOption))) {
                delete item.payment_url
              }
              if (!(item.type = listPaymentSchema.type(paymentOption))) {
                delete item.type
              }
              return item
            })
            Promise.all(list).then((gateways) => {
              let options = listPaymentsOptions(application)
              let promise = {
                payment_gateways: gateways.sort(sortPayments(application)),
                discount_options: options.discount_options,
                interest_free_installments: options.interest_free_installments
              }
              res.send(promise)
            })
              .catch(e => {
                logger.error('LIST_PAYMENT_PARSE', e)
                return res.status(400).send(e)
              })
          })
        } else {
          res.status(401).send({
            error: 'Authentication not found for x-store-id'
          })
        }
      })
  }
}

const listPaymentSchema = {
  discount: (payment, application) => {
    if (payment.discount) {
      let discount = application.hidden_data.payment_options.filter(paymentOption => (paymentOption.hasOwnProperty('discount')))
        .reduce(service => {
          return {
            type: service.discount.type,
            value: service.discount.value
          }
        })
      return discount
    }
    return false
  },
  icon: (payment) => {
    if (payment.hasOwnProperty('icon') && payment.icon.hasOwnProperty('show') && payment.icon.show === true) {
      return payment.icon.url
    } else if (!payment.hasOwnProperty('icon') && payment.type === 'credit_card') {
      return 'https://ecom.nyc3.digitaloceanspaces.com/plus/assets/img/stamps/wirecard.png'
    } else if (payment.hasOwnProperty('icon') && payment.icon.hasOwnProperty('show') && payment.icon.show === false) {
      return false
    }
  },
  installment_options: (payment, params) => {
    if (payment.installments) {
      let parcelasSemJuros
      let parcelasComJuros
      let valorJuros
      payment.installments.map(installment => {
        if (installment.tax === true) {
          parcelasComJuros = installment.number
          valorJuros = installment.tax_value / 100
        } else {
          parcelasSemJuros = installment.number
        }
      })

      let items = []
      for (let i = 1; i <= parcelasSemJuros; i++) {
        if (i > 1) {
          let item = {
            number: i,
            tax: false,
            value: Math.abs((params.amount.total / i).toFixed(2))
          }
          items.push(item)
        }
      }
      for (let j = parcelasSemJuros + 1; j <= parcelasComJuros; j++) {
        let finalValue = params.amount.total / j
        let item = {
          number: j,
          tax: true,
          value: Math.abs(((finalValue * valorJuros) + finalValue).toFixed(2))
        }
        items.push(item)
      }
      return items
    }
    return false
  },
  intermediator: (payment) => {
    if (payment.intermediator) {
      return {
        code: payment.intermediator.code,
        link: payment.intermediator.link,
        name: payment.intermediator.name
      }
    }
  },
  js_client: async (application) => {
    let pubk = `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn0mscV3nv2CC7\/T9TcMy\nqpc\/kDLtiZ\/35kJnxjvebg+q4r25426Fa1RHmE7Xhyn\/L9CJ1tm8SIeUzJ9jhnOS\n7LsyA5h8Iv9LnZzefmbtCo4B3h799yr4RDPKqI+zCdeBt3cp2pHk0tNPULDIH+uk\nosGYFbRZKfHAIHpfz\/EDtIPbk\/uK26W7ObqEF4RMwUfT843kNINo0Ua8hKWtmrRH\nvDp42FlzPD+vyh5aahLKjr7ynJbX9fssS4HQWnfWILeftrg4nLEopx45J7yQh3gN\nJyw0pxufwXrrFpRFjFI9emVLe2I5Xf17NW8+DWovzdOXeEEhF0jiIUrWP2D6QY\/d\nxQIDAQAB\n-----END PUBLIC KEY-----\n`
    return new Promise(resolve => {
      let onloadFunction = 'window.wirecardHash=function(n){return MoipSdkJs.MoipCreditCard.setPubKey(' + JSON.stringify(pubk) + ').setCreditCard({number:n.number,cvc:n.cvc,expirationMonth:n.month,expirationYear:n.year}).hash()},window.wirecardBrand=function(n){return MoipValidator.cardType(n.number)};'
      let schema = {
        cc_brand: {
          function: 'wirecardBrand',
          is_promise: false
        },
        cc_hash: {
          function: 'wirecardHash',
          is_promise: true
        },
        fallback_script_uri: 'https://ecom.nyc3.digitaloceanspaces.com/plus/assets/js/apps/moip-sdk-js.js',
        onload_expression: onloadFunction,
        script_uri: 'https://cdn.jsdelivr.net/gh/wirecardBrasil/moip-sdk-js@2/dist/moip-sdk-js.js'
      }
      return resolve(schema)
    })
  },
  label: (payment) => {
    if (payment.name) {
      return payment.name
    }
    return false
  },
  payment_method: (payment) => {
    if (payment.type) {
      return {
        code: payment.type,
        name: payment.name
      }
    }
  },
  payment_url: (payment) => {
    if (payment.url) {
      return payment.url
    }
    return false
  },
  type: (payment) => {
    return payment.payment_type || 'payment'
  }
}

const listPaymentsOptions = application => {
  let freeInstallments
  let discount
  application.hidden_data.payment_options.forEach(data => {
    if (typeof data.installments !== 'undefined') {
      data.installments.filter(option => {
        if (option.tax === false) {
          freeInstallments = option.number
        }
      })
    }
  })
  //
  discount = application.hidden_data.payment_options.find(hidden => (hidden.type === 'banking_billet' || hidden.type === 'online_debit') && (hidden.hasOwnProperty('discount') && hidden.discount.hasOwnProperty('default') && (hidden.discount.default === true)))

  if (!discount) {
    discount = application.hidden_data.payment_options.find(hidden => hidden.type === 'banking_billet')
  }

  let discountOptions = {}

  if (discount) {
    discountOptions = {
      discount_options: {
        label: discount.name,
        type: discount.discount.type,
        value: discount.discount.value
      },
      interest_free_installments: freeInstallments
    }
  }
  return discountOptions
}

const sortPayments = (application) => {
  if (application.hidden_data.hasOwnProperty('sort')) {
    return function (a, b) {
      return application.hidden_data.sort.indexOf(a.payment_method.code) - application.hidden_data.sort.indexOf(b.payment_method.code)
    }
  }
}
