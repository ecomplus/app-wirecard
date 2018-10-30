(function () {
  var pubKey = `${PUBKEY}`; // chave pública

  window.wirecardHash = function (obj) {
    if (!MoipValidator.isValidNumber(obj.number)) {
      return new Promise(function (resolve, reject) {
        reject(new Error('Card number invalid.'));
      })
    }

    if (!MoipValidator.isSecurityCodeValid(obj.number, obj.cvc)) {
      return new Promise(function (resolve, reject) {
        reject(new Error('Card cvc invalid.'));
      })
    }

    if (!MoipValidator.isExpiryDateValid(obj.expirationMonth, obj.expirationYear)) {
      return new Promise(function (resolve, reject) {
        reject(new Erro('Card expiration invalid.'));
      })
    }

    return MoipSdkJs.MoipCreditCard
      .setPubKey(pubKey)
      .setCreditCard({
        number: obj.number,
        cvc: obj.cvc,
        expirationMonth: obj.expirationYear,
        expirationYear: obj.expirationYear
      })
      .hash()
      .then(function (hash) {
        console.log('hash', hash)
      });
  }

  window.wirecardBrand = function (obj) {
    return MoipValidator.cardType(obj.number);
  }
}());