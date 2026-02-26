# Email Login Flow - Audit Report

## A. Frontend Login/Signup UI ✅

### Login Page (`client/src/pages/Login.tsx`)
- **Email form**: มีฟอร์ม email + password อยู่ด้านบน (ไม่ซ่อน)
- **Submit**: `POST /api/auth/login` ผ่าน `apiRequest`
- **Fields**: `email`, `password` — ตรงกับ backend
- **Validation**: `validateLoginForm` — ตรวจ email format, password required
- **Error handling**: 401 → "Invalid credentials", 500 → "Something went wrong...", อื่นๆ → error.message
- **Success**: redirect ไป `next` หรือ `/app/dashboard`
- **Layout**: Form → "or continue with" → GitHub / Google

### Signup Page (`client/src/pages/Signup.tsx`)
- **Email form**: email + password + confirmPassword + company
- **Submit**: `POST /api/auth/signup` กับ `email`, `password`, `name`
- **Layout**: Form → "or sign up with" → GitHub / Google

### API Client (`client/src/lib/api.ts`)
- `API_BASE_URL`: จาก `VITE_API_BASE_URL` หรือ `VITE_API_URL` — ถ้าว่างใช้ same origin
- `credentials: "include"` — ส่ง cookie
- Dev: `.env.local` มี `VITE_API_BASE_URL=http://localhost:3002` → ยิงตรงไป backend
- Prod: ถ้าไม่ตั้ง = same origin ( monolithic )

---

## B. Backend `/api/auth/login` ✅

### Route
- `POST /api/auth/login` (mount ที่ `/api` → full path `/api/auth/login`)

### Flow (มี step logging แล้ว)
1. `validateLogin` — ตรวจ email format, password >= 8
2. `ensureAuthCollections` — สร้าง index users/sessions
3. `getDb` — เชื่อม MongoDB
4. `findUser` — `users.findOne({ email })`
5. `verifyPassword` — bcrypt.compare
6. `grantFreeCreditsIfEligible` — ให้ credits ถ้ายังไม่เคยได้
7. `createSessionAndSetCookie` — สร้าง session + Set-Cookie

### Logs
- `[Login] route hit` — เข้า route
- `[Login Step] <step>` — ก่อนเรียกแต่ละ step
- `[Login Fail] <step>` — เมื่อ step นั้น throw
- `[Login] success` — login สำเร็จ

---

## C. Root Causes ที่อาจทำให้พัง

### 1. User ใน DB ไม่มี passwordHash
- **OAuth users**: มี `passwordHash` จาก random string — login ด้วย email/password จะได้ PASSWORD_MISMATCH
- **Signup users**: มี `passwordHash` จาก bcrypt

### 2. Hash algorithm
- Signup: `bcrypt.hash` (BCRYPT_ROUNDS=12)
- Login: `bcrypt.compare` — ตรงกัน

### 3. Session / Cookie
- `sessions` collection มี index `tokenHash`, `expiresAt`, `userId`
- Cookie: `getSessionCookieOptions()` — httpOnly, sameSite, secure, path, maxAge

### 4. Cookie options ใน production
- `isProduction` = NODE_ENV === "production"
- `isCrossOrigin` = CLIENT_URL หรือ CORS_ORIGIN มีค่า
- `sameSite`: isCrossOrigin ? "none" : "lax"
- `secure`: isProduction || isCrossOrigin
- **Monolithic (FE+BE same domain)**: sameSite=lax, secure=true ใช้ได้

### 5. ENV ที่ต้องมี
| Variable | ใช้สำหรับ |
|----------|-----------|
| SESSION_SECRET | session token hash, OAuth state |
| MONGODB_URI | DB connection |
| NODE_ENV | production → secure cookie |
| TRUST_PROXY | 1 สำหรับ Render (req.protocol ถูกต้อง) |
| CLIENT_URL | CORS, cookie sameSite เมื่อ cross-origin |
| FRONTEND_APP_URL | OAuth redirect |
| OAUTH_REDIRECT_BASE_URL | OAuth callback |

### 6. Production (Render)
- `VITE_API_BASE_URL` ว่างหรือไม่ตั้ง → same origin
- `SESSION_SECRET` ต้องตั้ง
- `TRUST_PROXY=1`
- `CLIENT_URL` = `https://alexza-platform8.onrender.com` (ไม่มี / ท้าย)

---

## D. สิ่งที่แก้ไขแล้ว

1. **Backend**: เพิ่ม `[Login] route hit` และ `[Login] success` log
2. **Frontend**: แก้ error message สำหรับ 500/INTERNAL_ERROR ให้เป็น "Something went wrong. Please try again later."
3. **Step logging**: มีอยู่แล้วจากงานก่อนหน้า

---

## E. Definition of Done Checklist

- [x] ฟอร์ม email/password มีอยู่และใช้งานได้
- [x] Submit ไป `/api/auth/login`
- [x] Backend มี step logging
- [x] Error handling ครบ (401, 500, อื่นๆ)
- [x] Success redirect ไป dashboard
- [ ] **ต้องทดสอบ**: login จริงบน production
- [ ] **ต้องทดสอบ**: refresh หน้าแล้ว session ยังอยู่
