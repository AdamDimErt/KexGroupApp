---
description: Auth service patterns — OTP, JWT, guards for NestJS
---

# Auth Patterns

## OTP Flow
1. POST /auth/otp/send → validate phone, generate 6-digit code, store in Redis (TTL=300s), send via Mobizon/Telegram Gateway
2. POST /auth/otp/verify → check code, issue JWT pair
3. Rate limit: max 3 OTP attempts per phone per minute
4. In dev: code "111111" always passes (check NODE_ENV)

## JWT Strategy
- Access token: 15 min, payload: `{ sub: userId, role, tenantId }`
- Refresh token: 7 days, stored in DB (revocable)
- POST /auth/refresh → validate refresh token, issue new pair
- Signing: HS256 with JWT_SECRET from env

## NestJS Guards
```typescript
@UseGuards(JwtAuthGuard)
@UseGuards(RolesGuard)
@Roles('OWNER', 'FINANCE_DIRECTOR')
```

## Roles
- OWNER — full access
- FINANCE_DIRECTOR — up to article level
- OPS_DIRECTOR — up to restaurant level
- ADMIN — system admin

## Security
- Never log tokens or OTP codes in production
- Bcrypt for any stored secrets
- CORS: whitelist specific origins
- Helmet middleware enabled
