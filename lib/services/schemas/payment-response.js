'use strict'
module.exports.paymentResponse = async (payment) => {
  return new Promise((resolve, reject) => {
    switch (payment.fundingInstrument.method) {
      case 'BOLETO': return resolve(methodSchemas.boleto(payment))
      case 'CREDIT_CARD': return resolve(methodSchemas.card(payment))
      case 'ONLINE_BANK_DEBIT': return resolve(methodSchemas.debit(payment))
      default: reject(new Error('payment method not match to response.'))
    }
  })
}

const methodSchemas = {
  boleto: payment => {
    return {
      'redirect_to_payment': false,
      'transaction': {
        'amount': payment.amount.total / 100,
        'banking_billet': {
          'code': payment.fundingInstrument.boleto.lineCode,
          'link': payment._links.payBoleto.printHref,
          'text_lines': [
            payment.fundingInstrument.boleto.instructionLines.first || '',
            payment.fundingInstrument.boleto.instructionLines.second || '',
            payment.fundingInstrument.boleto.instructionLines.third || ''
          ],
          'valid_thru': new Date(payment.fundingInstrument.boleto.expirationDate).toISOString()
        },
        'creditor_fees': {
          'installment': payment.installmentCount,
          'intermediation': payment.fees[0].amount
        },
        'currency_id': payment.amount.currency,
        'installments': {
          'number': payment.installmentCount
        },
        'intermediator': {
          'payment_method': {
            'code': 'banking_billet',
            'name': 'Boleto'
          },
          'transaction_id': payment.id,
          'transaction_code': payment.id,
          'transaction_reference': payment._links.order.title
        },
        'payment_link': payment._links.self.href,
        'status': {
          'current': paymentStatus(payment.status)
        }
      }
    }
  },
  card: payment => {
    return {
      'redirect_to_payment': false,
      'transaction': {
        'amount': payment.amount.total / 100,
        'credit_card': {
          'avs_result_code': null,
          'company': payment.fundingInstrument.creditCard.brand,
          'cvv_result_code': null,
          'holder_name': payment.fundingInstrument.creditCard.holder.fullname,
          'last_digits': payment.fundingInstrument.creditCard.last4,
          'token': payment.fundingInstrument.creditCard.id
        },
        'creditor_fees': {
          'installment': payment.installmentCount,
          'intermediation': payment.fees.amount
        },
        'currency_id': payment.amount.currency,
        'installments': {
          'number': payment.installmentCount,
          'tax': (payment.amount.fees > 0),
          'total': payment.amount.total / 100,
          'value': Number(Math.abs((payment.amount.total / payment.installmentCount) / 100).toFixed(2))
        },
        'intermediator': {
          'payment_method': {
            'code': 'credit_card',
            'name': 'Cartão de Crédito'
          },
          'transaction_id': payment.id,
          'transaction_code': payment.id,
          'transaction_reference': payment._links.order.title
        },
        'status': {
          'current': paymentStatus(payment.status)
        }
      }
    }
  },
  debit: payment => {
    return {
      'redirect_to_payment': false,
      'transaction': {
        'amount': (payment.amount.total / 100),
        'payment_link': payment._links.payOnlineBankDebitItau.redirectHref
      }
    }
  }
}

module.exports.paymentStatus = wirecardStatus => {
  switch (wirecardStatus) {
    case 'WAITING': return 'pending'
    case 'IN_ANALYSIS': return 'under_analysis'
    case 'PRE_AUTHORIZED': return 'under_analysis'
    case 'AUTHORIZED': return 'authorized'
    case 'CANCELLED': return 'voided'
    case 'REFUNDED': return 'refunded'
    case 'REVERSED': return 'refunded'
    case 'SETTLED': return 'paid'
    default: return 'unknown'
  }
}
