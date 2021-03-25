import { compare, hash } from 'bcryptjs'
import {
  Arg,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  UseMiddleware,
} from 'type-graphql'
import { createAccessToken, createRefreshToken } from './auth'
import { User } from './entity/User'
import { isAuth } from './isAuth'
import { MyContext } from './MyContext'

@ObjectType()
class LoginResponse {
  @Field()
  accessToken: string
}

@Resolver()
export class UserResolver {
  @Query(() => String)
  hello() {
    return 'raul'
  }

  @Query(() => String)
  @UseMiddleware(isAuth)
  ah(@Ctx() { payload }: MyContext) {
    console.log(payload)
    return `your user id is : ${payload?.userId}`
  }
  @Query(() => [User])
  users() {
    return User.find()
  }

  @Mutation(() => LoginResponse)
  async login(
    @Arg('email') email: string,
    @Arg('password') password: string,
    @Ctx() { res }: MyContext
  ): Promise<LoginResponse> {
    const user = await User.findOne({
      where: { email },
    })

    if (!user) {
      throw new Error('Could not find user')
    }

    const valid = await compare(password, user.password)

    if (!valid) {
      throw new Error('Wrong password')
    }

    // Login success

    // Be sure to se the graphql setting (inside /graphql) request.credentials from 'omit' > 'include' so it would save your cookies
    res.cookie('jid', createRefreshToken(user), {
      httpOnly: true,
    })

    return {
      accessToken: createAccessToken(user),
    }
  }
  @Mutation(() => Boolean)
  async register(
    @Arg('email') email: string,
    @Arg('password') password: string
  ) {
    const hashedPassword = await hash(password, 12)

    try {
      await User.insert({
        email,
        password: hashedPassword,
      })
      return true
    } catch (err) {
      console.log(err)
      return false
    }
  }
}
