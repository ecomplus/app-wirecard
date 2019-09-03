'use strict'
const logger = require('console-files')
const { getWirecardAuth } = require('./../../../lib/Api/Api')

module.exports = () => {
  return (req, res) => {
    const { params, application } = req.body
    const storeId = req.get('x-store-id')
    //  
    getWirecardAuth(storeId).then(() => {
      // parse params from body
      const hiddenData = application.hidden_data || {}

      // load application default config
      let { payment_options, sort } = require('./../../../lib/payment-default')

      // array to merge config
      let configMerged = []

      // empty payload
      let response = {
        payment_gateways: []
      }
      // merge application default config with
      // configuration sent at application.hidden_data
      payment_options.forEach(defaultOption => {
        // if the application not has payments config setted up, uses default.
        if (!application.hasOwnProperty('hidden_data') || !hiddenData.hasOwnProperty('payment_options')) {
          configMerged.push(defaultOption)
        } else {
          // Checks if default payment option is set in application.hidden_data
          const applicationConfiguration = hiddenData.payment_options.find(applicationOption => applicationOption.type === defaultOption.type)

          if (applicationConfiguration) {
            // check if payment options is enabled to list at list_payments
            if (applicationConfiguration.enabled === true) {
              configMerged.push({
                ...defaultOption,
                ...applicationConfiguration
              })
            }
          } else {
            // uses payment_option default if option is not setted up at hiddenData.payment_options
            configMerged.push(defaultOption)
          }
        }
      })

      if (params && params.hasOwnProperty('items') && params.hasOwnProperty('amount')) {
        // create payment option list for list_payment
        // with merged configuration
        configMerged.forEach(config => {
          let paymentGateways = {}
          paymentGateways.discount = listPaymentOptions.discount(config)
          paymentGateways.icon = listPaymentOptions.icon(config)
          paymentGateways.installments = listPaymentOptions.intermediator(config)
          paymentGateways.installment_options = listPaymentOptions.installment_options(config, params)
          paymentGateways.label = listPaymentOptions.label(config)
          paymentGateways.payment_method = listPaymentOptions.payment_method(config)
          paymentGateways.payment_url = listPaymentOptions.payment_url(config)
          paymentGateways.type = listPaymentOptions.type(config)
          if ((config.type === 'credit_card')) {
            paymentGateways.js_client = listPaymentOptions.js_client(config, hiddenData)
          }

          response.payment_gateways.push(paymentGateways)
        })
      }

      // interest_free_installments
      configMerged.forEach(config => {
        if (config.hasOwnProperty('installments')) {
          // sort array
          config.installments.sort((a, b) => (a.number > b.number) ? 1 : ((b.number > a.number) ? -1 : 0))

          config.installments.filter(installment => {
            if (installment.tax === false && installment.number > 1) {
              response.interest_free_installments = installment.number
            }
          })
        }
      })

      // discount_options
      configMerged.forEach(config => {
        if (config.type === 'banking_billet' && config.hasOwnProperty('discount')) {
          if (config.discount.value > 0) {
            response.discount_options = {
              label: config.name,
              type: config.discount.type,
              value: config.discount.value
            }
          }
        }
      })

      // sort config
      if (application.hasOwnProperty('hidden_data') && hiddenData.hasOwnProperty('sort')) {
        sort = [...hiddenData.sort, ...sort]
      }

      const sortFunc = (a, b) => sort.indexOf(a.payment_method.code) - sort.indexOf(b.payment_method.code)
      response.payment_gateways.sort(sortFunc)

      // response
      return res.send(response)
    })
      .catch(err => {
        logger.error('LIST_PAYMENTS_ERR', err)
        return res.status(401).send({
          error: 'LIST_PAYMENTS_ERR',
          message: 'Unexpected Error Try Later'
        })
      })
  }
}

const listPaymentOptions = {
  discount: (config) => {
    if (config.hasOwnProperty('discount')) {
      return {
        type: config.discount.type,
        value: config.discount.value
      }
    }
  },
  icon: (config) => {
    if (config.hasOwnProperty('icon')) {
      return config.icon
    }
  },
  installment_options: (config, params) => {
    if (config.hasOwnProperty('installments')) {
      let installments = config.installments
        .filter(installment => installment.number > 1)
        .map(installment => {
          let installmentValue = params.amount.total / installment.number
          let taxValue = installment.tax_value / 100
          let installmentFinalValue = installment.tax ? (installmentValue * taxValue + installmentValue) : installmentValue

          return {
            number: installment.number,
            tax: installment.tax,
            value: Math.abs(installmentFinalValue)
          }
        })

      return installments
    }
  },
  intermediator: (config) => {
    if (config.hasOwnProperty('intermediator')) {
      return {
        code: config.intermediator.code,
        link: config.intermediator.link,
        name: config.intermediator.name
      }
    }
  },
  js_client: (config, hiddenData) => {
    if (config.type === 'credit_card') {
      console.log(hiddenData)
      let pubk = hiddenData.public_key || ''
      let onloadFunction = 'window.wirecardHash=function(n){return MoipSdkJs.MoipCreditCard.setPubKey(' + JSON.stringify(pubk) + ').setCreditCard({number:n.number,cvc:n.cvc,expirationMonth:n.month,expirationYear:n.year}).hash()},window.wirecardBrand=function(n){return MoipValidator.cardType(n.number)};'
      return {
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
    }
  },
  label: (config) => {
    if (config.hasOwnProperty('name')) {
      return config.name
    }
  },
  payment_method: (config) => {
    if (config.hasOwnProperty('type')) {
      return {
        code: config.type,
        name: config.name
      }
    }
  },
  payment_url: (config) => {
    if (config.hasOwnProperty('url')) {
      return config.url
    }
  },
  type: (config) => {
    return config.payment_type || 'payment'
  }
}
