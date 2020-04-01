const Big = require('big.js')
// https://dourado.net/2010/11/20/calcular-tabela-price-em-php-pgto-no-excel/
module.exports = (valor, parcelas, juros) => {
  juros = new Big(juros).div(100).toPrecision(15)
  let e = new Big(1.0)
  let cont = new Big(1.0)

  for (let k = 1; k <= parcelas; k++) {
    cont = cont.times(Big(juros).plus(1))
    e = Big(e).plus(cont)
  }

  e = e.minus(cont)
  valor = Big(valor).times(cont)
  return valor.div(e)
}
