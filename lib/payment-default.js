'use strict'
/**
 * application payment options default
 */
module.exports = {
  payment_options: [
    {
      name: 'Cartão Credito',
      type: 'credit_card',
      payment_type: 'payment',
      installments: [
        {
          number: 12,
          tax: true,
          tax_value: 12.5
        },
        {
          number: 11,
          tax: true,
          tax_value: 12
        },
        {
          number: 10,
          tax: true,
          tax_value: 11.5
        },
        {
          number: 9,
          tax: true,
          tax_value: 10.5
        },
        {
          number: 8,
          tax: true,
          tax_value: 9.5
        },
        {
          number: 7,
          tax: true,
          tax_value: 8.5
        },
        {
          number: 6,
          tax: true,
          tax_value: 7.5
        },
        {
          number: 5,
          tax: true,
          tax_value: 6.5
        },
        {
          number: 4,
          tax: true,
          tax_value: 5.5
        },
        {
          number: 3,
          tax: true,
          tax_value: 5.5
        },
        {
          number: 2,
          tax: true,
          tax_value: 4.5
        },
        {
          number: 1,
          tax: false
        }
      ],
      intermediator: {
        code: 'wirecard',
        link: 'https://www.wirecard.com.br',
        name: 'Wirecard'
      },
      icon: 'https://assets.wirecard.com.br/ps-integration-assets/banners/pagamento/avista_estatico_550_70.gif',
      url: 'https://www.wirecard.com.br/'
    },
    {
      name: 'Boleto Bancário',
      type: 'banking_billet',
      payment_type: 'payment',
      expiration_date: 14,
      intermediator: {
        code: 'wirecard',
        link: 'https://www.wirecard.com.br',
        name: 'wirecWirecardard'
      },
      instruction_lines: {
        first: 'Atenção',
        second: 'fique atento à data de vencimento do boleto.',
        third: 'Pague em qualquer casa lotérica.'
      },
      icon: 'https://assets.wirecard.com.br/ps-integration-assets/banners/pagamento/avista_estatico_550_70.gif',
      url: 'https://www.wirecard.com.br/'
    },
    {
      name: 'Débito Online',
      type: 'online_debit',
      payment_type: 'payment',
      intermediator: {
        code: 'wirecard',
        link: 'https://www.wirecard.com.br',
        name: 'Wirecard'
      },
      icon: 'https://assets.wirecard.com.br/ps-integration-assets/banners/pagamento/avista_estatico_550_70.gif',
      url: 'https://www.wirecard.com.br'
    }
  ],
  sort: [
    'credit_card',
    'banking_billet',
    'online_debit'
  ],
  statement_descriptor: 'E-Com Plus Wirecard'
}
