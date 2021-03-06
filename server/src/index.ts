import express from 'express'
import 'reflect-metadata'
import { ApolloServer } from 'apollo-server-express'
import { buildSchema } from 'type-graphql'
import { UserResolver } from './UserResolver'
import { createConnection } from 'typeorm'
import cookieParser from 'cookie-parser'
import { verify } from 'jsonwebtoken'
import cors from 'cors'
import 'dotenv/config'
import { User } from './entity/User'
import { createAccessToken, createRefreshToken } from './auth'
import { sendRefreshToken } from './sendRefreshToken'
;(async () => {
  const app = express()
  app.use(
    cors({
      origin: 'http://localhost:3000',
      credentials: true,
    })
  )
  app.use(cookieParser())
  app.get('/', (_req, res) => {
    res.send('hello')
  })

  app.post('/refresh_token', async (req, res) => {
    const token = req.cookies.jid

    if (!token) return res.send({ ok: false, accessToken: '' })

    let payload = null
    try {
      payload = verify(token, process.env.REFRESH_TOKEN_SECRET!)
    } catch (e) {
      console.log(e)
    }
    // token is valid, we can send back its access.

    // @ts-ignore
    const user = await User.findOne({ id: payload?.userId })

    if (!user) {
      return res.send({ ok: false, accessToken: '' })
    }
    // Check for the refreshToken version
    // @ts-ignore
    if (user.tokenVersion !== payload?.tokenVersion) {
      return res.send({ ok: false, accessToken: '' })
    }
    // Refresh the refresh token when ever we give a new accessToken
    sendRefreshToken(res, createRefreshToken(user))

    // Give a new accessToken
    return res.send({ ok: true, accessToken: createAccessToken(user) })
  })

  await createConnection()
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [UserResolver],
    }),
    context: ({ req, res }) => ({
      res,
      req,
    }),
  })

  apolloServer.applyMiddleware({ app, cors: false })

  app.listen(4000, () => {
    console.log('express server started')
  })
})()

// createConnection()
//   .then(async (connection) => {
//     console.log('Inserting a new user into the database...')
//     const user = new User()
//     user.firstName = 'Timber'
//     user.lastName = 'Saw'
//     user.age = 25
//     await connection.manager.save(user)
//     console.log('Saved a new user with id: ' + user.id)

//     console.log('Loading users from the database...')
//     const users = await connection.manager.find(User)
//     console.log('Loaded users: ', users)

//     console.log('Here you can setup and run express/koa/any other framework.')
//   })
//   .catch((error) => console.log(error))
