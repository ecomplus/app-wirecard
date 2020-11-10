'use strict'
const logger = require('console-files')
const { authentications } = require('./../../../lib/database')
const newPaymentGateway = require('./../../../lib/new-payment-gateway')
const tabelaPrice = require('./../../../lib/table-price')
const installmentsDefault = require('./../../../lib/installments-default')
// get account public_key
const myPublicKey = require('./../../../lib/wirecard-api/get-public-key')

module.exports = () => {
  return (req, res) => {
    const { params, application } = req.body
    const { storeId } = req
    const config = Object.assign({}, application.hidden_data, application.data)

    authentications.get(storeId).then(async auth => {
      const amount = params.amount || {}
      // start mounting response body
      // https://apx-mods.e-com.plus/api/v1/list_payments/response_schema.json?store_id=100
      const response = {
        payment_gateways: []
      }

      // calculate discount value
      const { discount } = config
      if (discount && discount.value > 0) {
        if (discount.apply_at !== 'freight') {
          // default discount option
          const { value } = discount
          response.discount_option = {
            label: config.discount_option_label || 'Boleto Bancário',
            value
          }
            // specify the discount type and min amount is optional
            ;['type', 'min_amount'].forEach(prop => {
              if (discount[prop]) {
                response.discount_option[prop] = discount[prop]
              }
            })
        }
      }

      // check if payment options are enabled before adding payment list
      // baking_billet
      if (config.banking_billet && config.banking_billet.enabled && config.banking_billet.enabled === true) {
        const bankingBillet = {
          ...newPaymentGateway(),
          payment_method: {
            code: 'banking_billet',
            name: 'Boleto Bancário'
          },
          label: 'Boleto Bancário',
          expiration_date: config.banking_billet.expiration_date || 14,
          instruction_lines: {
            first: 'Atenção',
            second: 'fique atento à data de vencimento do boleto.',
            third: 'Pague em qualquer casa lotérica.'
          },
          discount
        }

        response.payment_gateways.push(bankingBillet)
      }

      // baking_billet
      if (config.online_debit && config.online_debit.enabled && config.online_debit.enabled === true) {
        const onlineDebit = {
          ...newPaymentGateway(),
          payment_method: {
            code: 'online_debit',
            name: 'Débito Online'
          },
          label: 'Débito Online',
          icon: 'https://e-com.club/mass/ftp/others/debitoWire.png'
        }

        response.payment_gateways.push(onlineDebit)
      } else {
        // remove discount options from payload
        delete response.discount_option
      }

      // baking_billet
      if (config.credit_card && config.credit_card.enabled && config.credit_card.enabled === true) {
        const pubk = config.public_key || await myPublicKey(auth).then(resp => resp.keys.encryption)
        const onloadFunction = 'window.wirecardHash=function(n){return MoipSdkJs.MoipCreditCard.setPubKey(' + JSON.stringify(pubk) + ').setCreditCard({number:n.number,cvc:n.cvc,expirationMonth:n.month,expirationYear:n.year}).hash()},window.wirecardBrand=function(n){return MoipValidator.cardType(n.number)};'
        const creditCard = {
          ...newPaymentGateway(),
          payment_method: {
            code: 'credit_card',
            name: 'Cartão de crédito - Moip'
          },
          label: 'Cartão de crédito',
          installment_options: [],
          js_client: {
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
          },
          icon: 'https://e-com.club/mass/ftp/others/credito-wirecard.png'
        }

        // installment_options
        if (config.credit_card.installments_option) {
          // tabela price
          const installments = config.credit_card.installments_option
          if (installments.max_number && amount && amount.total) {
            for (let i = 2; i < installments.max_number + 1; i++) {
              let taxValue = 0
              if (installments.tax_value) {
                taxValue = installments.tax_value
              }

              // max installments without tax
              if (installments.max_number_w_tax && installments.max_number_w_tax >= i) {
                taxValue = 0
              }

              const value = tabelaPrice(amount.total, i, taxValue)
              if (value >= installments.min_installment) {
                creditCard.installment_options.push({
                  number: i,
                  tax: (taxValue > 0),
                  value: Math.abs(value)
                })
              }
            }
          }

          // installments_option
          if (installments.max_number_w_tax >= 2) {
            response.installments_option = {
              min_installment: installments.min_installment,
              max_number: installments.max_number_w_tax,
              monthly_interest: 0
            }
          } else {
            response.installments_option = {
              min_installment: installments.min_installment,
              max_number: installments.max_number,
              monthly_interest: installments.tax_value
            }
          }
        } else {
          // wirecard default installments
          const options = installmentsDefault
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
          creditCard.installment_options = options
        }

        response.payment_gateways.push(creditCard)
      }

      // response
      return res.send(response)
    })

      .catch(err => {
        let response = {}
        response.error = 'LIST_PAYMENTS_ERR'
        let status = 400
        switch (err.name) {
          case 'AuthNotFound':
            // return response with client error code
            status = 401
            response.message = `Authentication not found for store #${storeId}, please perform authorization flow again with wirecard.`
            break
          default:
            status = 400
            response.message = 'Unexpected Error Try Later'
            logger.error(response.error, err)
            break
        }

        res.status(status)
        res.send(response)
      })
  }
}
