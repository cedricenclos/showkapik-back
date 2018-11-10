import * as express from 'express'

const app = express()

app.get('/', () => {
  console.log('get')
})
