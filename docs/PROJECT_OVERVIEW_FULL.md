# ALEXZA AI — สรุปโปรเจกต์แบบละเอียดที่สุด

## 1. เราคืออะไร

**ALEXZA AI** เป็น **AI Solution Orchestration Platform** — แพลตฟอร์มที่ช่วยให้ผู้พัฒนาสร้าง AI Actions จากบทสนทนา แล้วรันผ่าน API ได้ทันที โดยไม่ต้องจัดการ model/provider เอง

**จุดขายหลัก:**
- สร้าง AI API จากบทสนทนา (Chat Builder)
- รันผ่าน REST API ด้วย API Key
- จัดการ credits แบบ prepaid (เติมเมื่อต้องการ)
- ซ่อน provider/model จาก client (Hidden Gateway)

---

## 2. เราทำอะไรได้บ้าง

### 2.1 สำหรับผู้ใช้ทั่วไป

| ฟีเจอร์ | รายละเอียด |
|---------|-------------|
| **สมัคร/Login** | Email+password หรือ OAuth (Google, GitHub) |
| **สร้าง Project** | ตั้งชื่อ, คำอธิบาย |
| **Chat Builder** | พิมพ์ว่าต้องการ API อะไร → AI สร้าง action ให้ |
| **Apply Actions** | บันทึก action เข้า project พร้อม inputSchema |
| **API Keys** | สร้าง key สำหรับเรียก API จากภายนอก |
| **Playground** | ทดสอบรัน action ใน UI |
| **Credits** | ดู balance, ประวัติ, เติมผ่าน Stripe |
| **Usage Analytics** | สรุปการใช้งานตาม project/ช่วงเวลา |
| **Settings** | ตั้งค่าบัญชี, ปิด low credits email |

### 2.2 สำหรับ Developer

| ฟีเจอร์ | รายละเอียด |
|---------|-------------|
| **Run by Action** | `POST /v1/projects/:id/run/:actionName` + `x-api-key` |
| **Legacy /v1/run** | รันแบบเก่า (deprecated) |
| **Balance = 0** | HTTP 402 หยุดเรียกได้ |

---

## 3. เทคโนโลยีเบื้องหลัง (Tech Stack)

### Backend

| เทคโนโลยี | ใช้ทำ |
|-----------|-------|
| **Node.js + Express** | API server |
| **TypeScript** | โค้ดทั้งหมด |
| **MongoDB** | users, projects, actions, sessions, wallet, usage_logs |
| **OpenAI API** | Chat Builder (สร้าง actions จากบทสนทนา) |
| **OpenRouter** | รัน AI (default) หรือใช้ OpenAI |
| **Stripe** | ชำระเงินเติม credits |
| **Pino** | Logging |
| **Sentry** | Error monitoring |
| **bcrypt** | Hash รหัสผ่าน |
| **Resend** | อีเมล (low credits notification) |
| **cookie-parser** | Session cookie |
| **cors** | CORS |
| **Zod** | Validation |
| **nanoid** | ID generation |

### Frontend

| เทคโนโลยี | ใช้ทำ |
|-----------|-------|
| **React 19** | UI |
| **Vite 7** | Build tool |
| **Wouter** | Routing |
| **Tailwind CSS 4** | Styling |
| **Radix UI** | Components (Dialog, Select, etc.) |
| **Framer Motion** | Animation |
| **i18next** | หลายภาษา (EN/TH) |
| **Sonner** | Toast notifications |
| **Three.js** | 3D blob (MorphingBlob) |
| **Recharts** | Charts (Usage) |
| **Lucide React** | Icons |

### Infrastructure

| บริการ | ใช้ทำ |
|--------|-------|
| **Render** | Deploy production (https://alexza-platform8.onrender.com) |
| **MongoDB Atlas** | Database |
| **Stripe** | Payment |
| **Sentry** | Error tracking |
| **GitHub Actions** | Cron (monthly billing reset) |

---

## 4. ระบบที่ขึ้น (Deployed Systems)

### 4.1 Render Web Service

- **URL:** https://alexza-platform8.onrender.com
- **Build:** `pnpm install && pnpm build`
- **Start:** `pnpm start`
- **Port:** Render injects PORT
- **Monolithic:** Frontend + Backend ใน service เดียว

### 4.2 MongoDB Atlas

- **Collections หลัก:**
  - `users` — บัญชี, passwordHash, oauthProviders
  - `sessions` — session tokens
  - `projects` — โปรเจกต์
  - `actions` — AI actions
  - `api_keys` — API keys
  - `wallet_transactions` — ประวัติ credits
  - `usage_logs` — การใช้งาน API

### 4.3 Stripe

- **Checkout** — สร้าง session เติม credits
- **Webhook** — รับ event ชำระสำเร็จ → เติม credits

### 4.4 GitHub Actions

- **monthly-reset.yml** — เรียก `/api/admin/billing/cron/reset-monthly` ทุกวันที่ 1 ของเดือน (00:05 UTC)

### 4.5 Sentry

- **Backend** — SENTRY_DSN
- **Frontend** — VITE_SENTRY_DSN (enabled เฉพาะ production)

---

## 5. โมดูล/ตัวทำหน้าที่อะไร

### 5.1 Server (Backend)

| ไฟล์/โมดูล | หน้าที่ |
|------------|---------|
| **index.ts** | Entry, mount routes, CORS, static files, error handler |
| **auth.ts** | Signup, Login, Logout, /me, session cookie |
| **oauth.ts** | Google/GitHub OAuth (init + callback) |
| **projects.ts** | CRUD projects, threads, migration |
| **builder.ts** | Chat Builder AI (threads, messages, proposedActions) |
| **actions.ts** | CRUD actions |
| **keys.ts** | API keys (create, list, revoke) |
| **run.ts** | Legacy /v1/run |
| **runBySpec.ts** | /v1/projects/:id/run/:actionName |
| **wallet.ts** | Balance, reserve, deduct, refund, grant |
| **walletRoutes.ts** | Wallet API |
| **billing.ts** | Plans, monthly allowance, reset |
| **modules/stripe/** | Checkout, webhook, service |
| **usageRoutes.ts** | Usage analytics |
| **notifications.ts** | Low credits email, cron |
| **onboarding.ts** | Checklist user ใหม่ |
| **estimate.ts** | ประมาณ token |
| **providers/** | OpenAI, OpenRouter |
| **middleware/** | requireAuth, requireApiKey, rateLimit, requestId, sentry |

### 5.2 Client (Frontend)

| หน้า/Component | หน้าที่ |
|----------------|---------|
| **Home** | หน้าแรก, hero |
| **Login** | เข้าสู่ระบบ (email/password, OAuth) |
| **Signup** | สมัครสมาชิก |
| **Dashboard** | หน้าหลักหลัง login |
| **Projects** | รายการ projects |
| **ProjectDetail** | ดู project, ลิงก์ไป AI/Keys/Playground |
| **ChatBuilder** | สนทนากับ AI สร้าง actions |
| **ApiKeys** | สร้าง/ลบ API keys |
| **Playground** | ทดสอบรัน action |
| **Usage** | Usage analytics |
| **Wallet** | Balance, เติม credits |
| **BillingPlans** | เลือก plan |
| **Settings** | ตั้งค่าบัญชี |
| **AdminTools** | Admin (ต้อง x-admin-key) |

---

## 6. วิธีใช้งาน

### 6.1 เริ่มต้น (Local)

```bash
pnpm dev
# เปิด http://localhost:3000
```

### 6.2 สมัคร + Login

1. ไปที่ https://alexza-platform8.onrender.com (หรือ localhost:3000)
2. กด **Get Started** → สมัคร (email, password, name)
3. หรือ Login ด้วย Google/GitHub

### 6.3 สร้าง AI API

1. สร้าง Project
2. เข้า Project → กด **AI Chat**
3. พิมพ์ เช่น "อยากได้ API สรุปข้อความ"
4. AI จะเสนอ action → กด **Apply**
5. ไปที่ **API Keys** → สร้าง key → copy `axza_...`
6. ไปที่ **Playground** → ทดสอบ

### 6.4 เรียก API จากภายนอก

```bash
curl -X POST "https://alexza-platform8.onrender.com/v1/projects/PROJECT_ID/run/ACTION_NAME" \
  -H "Content-Type: application/json" \
  -H "x-api-key: axza_your_key" \
  -d '{"input":"ข้อความที่ต้องการสรุป"}'
```

### 6.5 เติม Credits

1. ไปที่ **Credits** หรือ **Billing → Credits**
2. เลือกจำนวน USD
3. กด **Proceed to Checkout** → ชำระผ่าน Stripe

---

## 7. Environment Variables

### ต้องมี (Backend)

| Variable | ใช้ทำ |
|----------|-------|
| MONGODB_URI | เชื่อม DB |
| MONGODB_DB | ชื่อ DB |
| SESSION_SECRET | Session, OAuth state |
| OPENAI_API_KEY | Chat Builder |
| OPENROUTER_API_KEY | Runtime |

### OAuth

| Variable | ใช้ทำ |
|----------|-------|
| GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET | Google login |
| GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET | GitHub login |
| OAUTH_REDIRECT_BASE_URL | Callback URL |
| FRONTEND_APP_URL | Redirect หลัง login |

### Stripe

| Variable | ใช้ทำ |
|----------|-------|
| STRIPE_SECRET_KEY | Checkout |
| STRIPE_WEBHOOK_SECRET | Webhook |
| APP_URL / CLIENT_URL | Redirect URLs |

### Production

| Variable | ใช้ทำ |
|----------|-------|
| CLIENT_URL | CORS, cookies |
| TRUST_PROXY | req.protocol ถูกต้อง |
| NODE_ENV=production | Secure cookies |

---

## 8. โครงสร้างโปรเจกต์

```
alexza-ai/
├── client/                 # Frontend
│   ├── src/
│   │   ├── pages/          # หน้าเว็บ
│   │   ├── components/     # UI, blob, marketing
│   │   ├── contexts/       # Auth, Credits, Theme
│   │   ├── hooks/          # useWallet, useForm
│   │   ├── lib/            # api, validation, dom
│   │   └── i18n/           # ภาษา EN/TH
│   └── public/
├── server/                 # Backend
│   ├── index.ts            # Entry
│   ├── auth.ts, oauth.ts
│   ├── projects.ts, builder.ts, actions.ts
│   ├── run.ts, runBySpec.ts
│   ├── wallet.ts, walletRoutes.ts
│   ├── modules/stripe/
│   ├── providers/          # OpenAI, OpenRouter
│   └── middleware/
├── docs/                   # เอกสาร
├── scripts/               # Smoke tests, seed
└── .github/workflows/      # Cron
```

---

## 9. API Endpoints หลัก

| Method | Path | คำอธิบาย |
|--------|------|----------|
| POST | /api/auth/signup | สมัคร |
| POST | /api/auth/login | Login |
| GET | /api/me | ข้อมูล user |
| GET | /api/projects | รายการ projects |
| POST | /api/projects | สร้าง project |
| POST | /api/projects/:id/threads/:tid/messages | ส่งข้อความ Chat Builder |
| POST | /api/projects/:id/actions | สร้าง/แก้ไข action |
| POST | /api/projects/:id/keys | สร้าง API key |
| POST | /v1/projects/:id/run/:action | รัน action (x-api-key) |
| GET | /api/wallet/balance | ดูกระเป๋า |
| POST | /api/billing/stripe/checkout | สร้าง Stripe checkout |

---

**อัปเดตล่าสุด:** กุมภาพันธ์ 2026
