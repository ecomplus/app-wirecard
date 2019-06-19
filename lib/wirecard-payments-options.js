'use strict'
const moment = require('moment')

module.exports = payload => {
  let { params, application } = payload

  if (params.payment_method.code === 'online_debit') {
    return {
      'fundingInstrument': {
        'method': 'ONLINE_BANK_DEBIT',
        'onlineBankDebit': {
          'bankNumber': 341,
          'expirationDate': new Date().toISOString().slice(0, 10)
        }
      }
    }
  } else if (params.payment_method.code === 'banking_billet') {
    //
    let { hidden_data } = application
    //
    let billetInfo = hidden_data.payment_options.find(option => {
      if (option.type === 'banking_billet') {
        return option
      }
    })
    return {
      'statementDescriptor': hidden_data.statement_descriptor.substr(0, 12) || 'Wirecard',
      'fundingInstrument': {
        'method': 'BOLETO',
        'boleto': {
          'expirationDate': moment(new Date()).add(billetInfo.expiration_date, 'days').toISOString().slice(0, 10),
          'instructionLines': {
            'first': billetInfo.hasOwnProperty('instruction_lines') ? billetInfo.instruction_lines.first : 'Atenção',
            'second': billetInfo.hasOwnProperty('instruction_lines') ? billetInfo.instruction_lines.second : 'fique atento à data de vencimento do boleto.',
            'third': billetInfo.hasOwnProperty('instruction_lines') ? billetInfo.instruction_lines.third : 'Pague em qualquer casa lotérica.'
          },
          'logoUri': 'http://www.lojaexemplo.com.br/logo.jpg'
        }
      }
    }
  } else if (params.payment_method.code === 'credit_card') {
    return {
      'installmentCount': params.installments_number,
      'statementDescriptor': application.hidden_data.statement_descriptor.substr(0, 12) || 'ECOMPLUS',
      'fundingInstrument': {
        'method': 'CREDIT_CARD',
        'creditCard': {
          'hash': params.credit_card.hash,
          'store': true,
          'holder': {
            'fullname': params.hasOwnProperty('payer') ? params.payer.fullname : params.buyer.fullname,
            'birthdate': params.hasOwnProperty('birth_date') ? birthDateConvert(params.payer.birth_date) : birthDateConvert(params.buyer.birth_date),
            'taxDocument': {
              'type': docType(params),
              'number': params.hasOwnProperty('payer') ? params.payer.doc_number : params.buyer.doc_number
            },
            'phone': {
              'countryCode': params.buyer.phone.country_code,
              'areaCode': params.buyer.phone.number.substr(0, 2),
              'number': params.buyer.phone.number
            },
            'billingAddress': {
              'city': params.billing_address.city,
              'district': params.billing_address.borough,
              'street': params.billing_address.street,
              'streetNumber': params.billing_address.number,
              'zipCode': params.billing_address.zip,
              'state': (params.hasOwnProperty('to')) && (params.to.hasOwnProperty('province_code')) ? params.to.province_code : params.to.province,
              'country': params.billing_address.country_code || 'BRA'
            }
          }
        }
      }
    }
  } else {
    return false
  }
}

const birthDateConvert = birthdate => {
  let {
    year,
    month,
    day
  } = birthdate
  return year + '-' + month + '-' + day
}

const docType = params => {
  if ((params.hasOwnProperty('payer') && params.payer.doc_number.length === 11) || (params.hasOwnProperty('buyer') && params.buyer.doc_number.length === 11)) {
    return 'CPF'
  } else if ((params.hasOwnProperty('payer') && params.payer.doc_number.length === 14) || (params.hasOwnProperty('buyer') && params.buyer.doc_number.length === 14)) {
    return 'CNPJ'
  }
}
