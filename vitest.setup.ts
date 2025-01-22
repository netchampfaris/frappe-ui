import { server } from './src/mocks/node'
// import { server } from './src/mocks/browser'
import { beforeAll, afterEach, afterAll } from 'vitest'

beforeAll(() => {
  server.listen()
  //   server.start()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
  //   server.stop()
})
