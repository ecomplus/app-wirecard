'use strict'
import { error } from 'console-files'

// sucess response
export const respond = (body, response) => {
  console.log('Success')
  response.status(200)
  return response.send(body)
}

// erro response
export const err = (erros, response) => {
  console.log('Error')
  error('' + erros)
  response.status(400)
  return response.send('' + erros)
}
