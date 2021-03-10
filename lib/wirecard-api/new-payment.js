module.exports = (methodCode, params, appConfig, domain) => {
  const statementDescriptor = String(appConfig.statement_descriptor || domain).substr(0, 12)
  switch (methodCode) {
    case 'online_debit':
      return {
        fundingInstrument: {
          method: 'ONLINE_BANK_DEBIT',
          onlineBankDebit: {
            bankNumber: 341,
            expirationDate: new Date().toISOString().slice(0, 10)
          }
        }
      }
    case 'banking_billet':
      const today = new Date()
      const expirationDate = new Date()
      expirationDate.setDate(today.getDate() + (appConfig.banking_billet ? appConfig.banking_billet.expiration_date : 7))
      return {
        statementDescriptor,
        fundingInstrument: {
          method: 'BOLETO',
          boleto: {
            expirationDate: expirationDate.toISOString().slice(0, 10),
            instructionLines: {
              first: 'Atenção',
              second: 'fique atento à data de vencimento do boleto.',
              third: 'Pague em qualquer casa lotérica.'
            },
            logoUri: appConfig.store_logo || 'https://developers.e-com.plus/src/assets/img/logo-dark.png'
          }
        }
      }
    case 'credit_card':
      const { payer, buyer, to } = params
      return {
        installmentCount: params.installments_number,
        statementDescriptor,
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
                district: (to.borough || '').substr(0, 45),
                street: to.street,
                streetNumber: to.number || 'SN',
                zipCode: to.zip,
                state: to.province_code ? to.province_code : to.province,
                country: to.country_code || 'BRA'
              }
            }
          }
        }
      }
    default: return false
  }
}
