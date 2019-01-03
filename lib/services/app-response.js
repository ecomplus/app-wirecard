'use strict'
const { error } = require('console-files')

// sucess response
module.exports.respond = (body, response) => {
  console.log('Success')
  response.status(200)
  return response.send(body)
}

// erro response
module.exports.err = (erros, response) => {
  console.log('Error')
  error('' + erros)
  response.status(400)
  return response.send('' + erros)
}
