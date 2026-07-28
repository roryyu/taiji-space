// JWT 签发与校验工具
import jwt from 'jsonwebtoken'

/** JWT 负载结构：登录管理员的基本信息 */
export interface AuthPayload {
  id: number
  username: string
  name: string
}

const TOKEN_EXPIRES_IN = '7d' // 与前端 token.maxAgeInSeconds 保持一致

/** 签发 JWT */
export function signToken(payload: AuthPayload): string {
  const { jwtSecret } = useRuntimeConfig()
  return jwt.sign(payload, jwtSecret, { expiresIn: TOKEN_EXPIRES_IN })
}

/** 校验 JWT，非法/过期返回 null */
export function verifyToken(token: string): AuthPayload | null {
  try {
    const { jwtSecret } = useRuntimeConfig()
    const decoded = jwt.verify(token, jwtSecret)
    if (typeof decoded === 'object' && decoded !== null && 'id' in decoded) {
      return decoded as unknown as AuthPayload
    }
    return null
  } catch {
    return null
  }
}
