# POST /api/auth/login — INTERNAL_ERROR สรุปสาเหตุและ Patch

## สาเหตุหลักที่ทำให้ INTERNAL_ERROR

| # | สาเหตุ | ไฟล์ | บรรทัด | ก่อนแก้ | หลังแก้ |
|---|--------|------|--------|---------|---------|
| 1 | **OAuth user ลอง login ด้วย email/password** | server/auth.ts | ~278 | เรียก `verifyPassword` กับ passwordHash แบบ random → bcrypt อาจ throw หรือได้ false แต่ถ้ามี edge case อื่นอาจ throw | ตรวจ `oauthProviders` / `!passwordHash` ก่อน → **return 401** "Account uses OAuth. Please login with Google." |
| 2 | **passwordHash ว่าง/null** | server/utils/crypto.ts | 48 | `bcrypt.compare(password, "")` อาจ throw | เพิ่ม guard → **return false** (route จะได้ PASSWORD_MISMATCH → 401) |
| 3 | **Error ใน step ใดก็ตาม** | server/auth.ts | catch blocks | log แค่ errStackTop (5 บรรทัด) | log **err.stack เต็ม** ใน `errStack` เพื่อ debug |
| 4 | **Session/cookie config ไม่ชัด** | server/auth.ts | createSessionAndSetCookie | ไม่มี log | log **cookie options** (secure, sameSite, path) |

---

## Patch ที่แก้

### 1. server/auth.ts

**UserDoc + OAuth guard (หลัง findUser, ก่อน verifyPassword):**
```typescript
// เพิ่ม oauthProviders ใน UserDoc
oauthProviders?: { provider: string; providerUserId: string }[];

// หลัง if (!user) return 401
const oauthProviders = user.oauthProviders ?? [];
const hasOAuth = oauthProviders.length > 0;
const hasPasswordHash = Boolean(user.passwordHash && String(user.passwordHash).trim());
if (hasOAuth || !hasPasswordHash) {
  const msg = "Account uses OAuth. Please login with Google."; // หรือตาม provider
  return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: msg });
}
```

**Catch blocks — log err.stack:**
```typescript
const errStack = err instanceof Error ? err.stack : undefined;
logger.warn({ requestId, stepName: "<stepName>", errStack }, `[Login Fail] ...`);
```

**createSessionAndSetCookie — log cookie options:**
```typescript
const cookieOpts = getSessionCookieOptions();
logger.info(`[createSessionAndSetCookie] cookie options secure=${cookieOpts.secure} sameSite=${cookieOpts.sameSite} path=${cookieOpts.path}`);
```

### 2. server/utils/crypto.ts

**verifyPassword guard:**
```typescript
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash || typeof hash !== "string" || hash.trim() === "") {
    return false;
  }
  return bcrypt.compare(password, hash);
}
```

### 3. server/utils/crypto.test.ts

**Unit tests:**
- `empty hash -> verifyPassword returns false`
- `null/undefined-like hash -> verifyPassword returns false`

---

## Expected Behavior (401 vs 500)

| สถานการณ์ | ก่อน | หลัง |
|-----------|------|------|
| User ไม่มีใน DB | 401 Invalid credentials | 401 Invalid credentials |
| OAuth user (มี oauthProviders) | อาจ 500 ถ้า bcrypt edge case | **401** "Account uses OAuth. Please login with Google." |
| User ไม่มี passwordHash | อาจ 500 (bcrypt กับ empty) | **401** "Account uses OAuth. Please login with Google." |
| Password ผิด | 401 Invalid credentials | 401 Invalid credentials |
| DB/Mongo error | 500 INTERNAL_ERROR | 500 (แต่ log มี err.stack เต็ม) |
| Session insert fail | 500 | 500 (log err.stack) |

---

## ไฟล์ที่แก้ทั้งหมด

| ไฟล์ | การแก้ไข |
|------|----------|
| server/auth.ts | OAuth guard, err.stack ใน catch, cookie options log, ลบ stackTop |
| server/utils/crypto.ts | verifyPassword guard สำหรับ empty/null hash |
| server/utils/crypto.test.ts | Unit tests สำหรับ empty/null hash |
| docs/LOGIN_INTERNAL_ERROR_SUMMARY.md | สรุปเอกสารนี้ |
