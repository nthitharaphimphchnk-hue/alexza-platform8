# ALEXZA AI — สรุปโปรเจกต์แบบละเอียด

## 1. เราคือใคร

**ALEXZA AI** เป็น **Solution Orchestration Platform** สำหรับ AI — แพลตฟอร์มที่ช่วยให้ผู้พัฒนาสร้าง, จัดการ และรัน AI Actions ได้ผ่าน Chat Builder และ API โดยไม่ต้องจัดการ model/provider เอง

**จุดขายหลัก:**
- สร้าง AI Actions จากบทสนทนา (Chat Builder)
- รันผ่าน API ด้วย API Key
- จัดการ credits แบบ prepaid (ไม่มี subscription)
- ซ่อน provider/model จาก client (Hidden Gateway)

---

## 2. ทำงานยังไง (Flow หลัก)

### 2.1 สำหรับผู้ใช้ทั่วไป

1. **สมัครสมาชิก** → ได้ 500 credits ฟรี (ครั้งเดียว)
2. **สร้าง Project** → ตั้งชื่อ, คำอธิบาย
3. **เปิด Chat Builder** → พิมพ์ว่าต้องการ API อะไร (เช่น "อยากได้ API สรุปข้อความ")
4. **AI แนะนำ Actions** → กด Apply เพื่อบันทึก action เข้า project
5. **สร้าง API Key** → ใช้เรียก API จากภายนอก
6. **เรียก API** → `POST /v1/projects/:projectId/run/:actionName` พร้อม `x-api-key`
7. **เติม credits** → เมื่อหมด ใช้ Stripe Top-up หรือ Admin manual top-up

### 2.2 สำหรับ Developer

- ใช้ API Key เรียก endpoint
- ส่ง input ตาม schema ของ action
- ได้ output + usage (credits ที่ใช้)
- Balance เป็น 0 → HTTP 402 (หยุดเรียกได้)

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

### Frontend
| เทคโนโลยี | ใช้ทำ |
|-----------|-------|
| **React 19** | UI |
| **Vite 7** | Build tool |
| **Wouter** | Routing |
| **Tailwind CSS 4** | Styling |
| **Radix UI** | Components |
| **Framer Motion** | Animation |
| **i18next** | หลายภาษา (EN/TH) |
| **Sonner** | Toast notifications |

### Infrastructure
- **Render** — Deploy production (https://alexza-platform8.onrender.com)
- **MongoDB Atlas** — Database
- **Stripe** — Payment

---

## 4. สถานะการพัฒนา

### ✅ ทำเสร็จแล้ว

| ฟีเจอร์ | รายละเอียด |
|---------|-------------|
| **Auth** | Signup, Login, Logout, Session (cookie) |
| **Projects** | สร้าง/ลบ/แก้ไข project |
| **Chat Builder** | สนทนากับ AI สร้าง actions, Apply เข้า project |
| **Actions** | CRUD actions, inputSchema, provider/model (server-only) |
| **API Keys** | สร้าง/ลบ/revoke key |
| **Run by Action** | `POST /v1/projects/:id/run/:actionName` — รัน action ด้วย API key |
| **Legacy /v1/run** | รันแบบเก่า (deprecated) |
| **Wallet** | Balance, transactions, reserve/usage/refund credits |
| **Stripe Top-up** | Checkout session, webhook, idempotency |
| **Admin manual top-up** | เติม credits ด้วย x-admin-key |
| **Usage Analytics** | สรุป usage ตาม project, ตามช่วงเวลา |
| **Billing Plans** | Free/Pro plan, monthly allowance |
| **Low Credits Email** | แจ้งเมื่อ balance ต่ำ |
| **Onboarding** | Checklist สำหรับ user ใหม่ |
| **Notifications** | Low credits scan, cron |
| **Docs** | หน้า documentation |
| **Pricing** | หน้า pricing |
| **Settings** | ตั้งค่าบัญชี |
| **i18n** | ภาษาอังกฤษ + ไทย |
| **Sentry** | Error tracking (backend + frontend) |

### ⏳ ยังไม่ทำ / ต้องพัฒนาเพิ่ม

| ฟีเจอร์ | สถานะ |
|---------|-------|
| **Stripe Elements** | ใช้ Checkout redirect แล้ว — ไม่จำเป็นต้องมี Elements |
| **VITE_STRIPE_PUBLISHABLE_KEY** | ไม่ได้ใช้ (ไม่จำเป็นสำหรับ flow ปัจจุบัน) |
| **CREDIT_PRICE จาก env** | ตอนนี้ hardcode 0.003 — ถ้าต้องการปรับได้จาก env ต้องเพิ่ม |
| **Team/Collaboration** | ยังไม่มี |
| **Webhook สำหรับ user** | ยังไม่มี (มีแค่ Stripe webhook) |
| **Volume discounts** | ยังไม่มี (Enterprise tier ระบุไว้แต่ยังไม่ implement) |
| **Dark/Light theme toggle** | ใช้ dark เท่านั้น |

---

## 5. เป้าหมายของเรา

1. **ลดความซับซ้อน** — ผู้ใช้ไม่ต้องจัดการ model, provider, API key ของ OpenAI/OpenRouter เอง
2. **สร้าง AI API ได้เร็ว** — พูดกับ Chat Builder แล้วได้ action พร้อม schema
3. **ใช้แบบ Pay-as-you-go** — ไม่มี subscription, เติม credits เมื่อต้องการ
4. **Production-ready** — มี auth, rate limit, monitoring, idempotency

---

## 6. เราแตกต่างยังไง

| จุดต่าง | ALEXZA | คู่แข่งทั่วไป |
|--------|--------|--------------|
| **สร้าง API** | พูดกับ AI ใน Chat Builder ได้ action + schema | ต้องเขียนโค้ด/กำหนด schema เอง |
| **Provider** | ซ่อนไว้ (OpenRouter/OpenAI) — user ไม่เห็น | มักต้องเลือก provider เอง |
| **Credits** | Prepaid wallet, หยุดเมื่อหมด | มักเป็น subscription หรือ credit แบบอื่น |
| **Pricing** | $0.003/credit, 1 credit = 1,000 tokens | ขึ้นกับแต่ละแพลตฟอร์ม |

---

## 7. วิธีใช้งาน (Step-by-Step)

### 7.1 ผู้ใช้ใหม่

1. ไปที่ https://alexza-platform8.onrender.com (หรือ localhost)
2. กด **Get Started** → สมัคร (email, password, name)
3. Login → เข้า Dashboard
4. กด **Projects** → **Create Project** → ตั้งชื่อ
5. เข้า project → กด **AI Chat** (หรือ Builder)
6. พิมพ์ เช่น "อยากได้ API สรุปข้อความ"
7. AI จะเสนอ action → กด **Apply** เพื่อบันทึก
8. ไปที่ **API Keys** → สร้าง key → copy `axza_...` (แสดงครั้งเดียว)
9. ไปที่ **Playground** → ทดสอบรัน action ด้วย input
10. ใช้ API จากโค้ด:

```bash
curl -X POST "https://alexza-platform8.onrender.com/v1/projects/<project_id>/run/<action_name>" \
  -H "Content-Type: application/json" \
  -H "x-api-key: axza_your_key" \
  -d '{"input":"ข้อความที่ต้องการสรุป"}'
```

### 7.2 เติม Credits

1. ไปที่ **Credits** หรือ **Billing → Credits**
2. เลือกจำนวน USD ($10–$500)
3. กด **Proceed to Checkout** → ชำระผ่าน Stripe
4. หลังชำระสำเร็จ → credits จะเพิ่มอัตโนมัติ (ผ่าน webhook)

### 7.3 Developer (เรียก API)

```javascript
const res = await fetch('https://alexza-platform8.onrender.com/v1/projects/PROJECT_ID/run/ACTION_NAME', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'axza_your_api_key',
  },
  body: JSON.stringify({ input: 'your input' }),
});
const data = await res.json();
// data.output, data.usage.creditsCharged
```

---

## 8. โครงสร้างโปรเจกต์

```
alexza-ai/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/          # หน้าเว็บ
│   │   ├── components/     # UI components
│   │   ├── contexts/       # Auth, Credits, Theme
│   │   ├── hooks/          # useWallet, useForm, etc.
│   │   ├── api/            # API client
│   │   ├── lib/            # utilities
│   │   └── config/         # pricing, etc.
│   └── public/
├── server/                 # Backend (Express)
│   ├── index.ts            # Entry, routes
│   ├── auth.ts             # Signup, login
│   ├── projects.ts         # Projects CRUD
│   ├── actions.ts          # Actions CRUD
│   ├── builder.ts          # Chat Builder AI
│   ├── run.ts              # Legacy /v1/run
│   ├── runBySpec.ts        # /v1/projects/:id/run/:action
│   ├── wallet.ts           # Wallet logic
│   ├── walletRoutes.ts     # Wallet API
│   ├── modules/stripe/     # Stripe checkout, webhook
│   ├── providers/          # OpenAI, OpenRouter
│   ├── middleware/         # Auth, rate limit, etc.
│   └── models/             # Types, DTOs
├── docs/                   # เอกสาร
├── scripts/                # Smoke tests, backfill
└── package.json
```

---

## 9. Environment Variables สำคัญ

### Backend (ต้องมี)
- `MONGODB_URI`, `MONGODB_DB`
- `SESSION_SECRET`
- `OPENAI_API_KEY` (Chat Builder)
- `OPENROUTER_API_KEY` (Runtime)

### Stripe (สำหรับ Top-up)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `APP_URL` (หรือ `CLIENT_URL`)

### Production
- `CLIENT_URL` — สำหรับ CORS, cookies
- `TRUST_PROXY=1`

---

## 10. API Endpoints หลัก

| Method | Path | คำอธิบาย |
|--------|------|----------|
| POST | /api/auth/signup | สมัครสมาชิก |
| POST | /api/auth/login | Login |
| GET | /api/me | ข้อมูล user ปัจจุบัน |
| GET | /api/projects | รายการ projects |
| POST | /api/projects | สร้าง project |
| POST | /api/projects/:id/threads/:tid/messages | ส่งข้อความใน Chat Builder |
| POST | /api/projects/:id/actions | สร้าง/แก้ไข action |
| POST | /api/projects/:id/keys | สร้าง API key |
| POST | /v1/projects/:id/run/:action | รัน action (ใช้ x-api-key) |
| GET | /api/wallet/balance | ดูกระเป๋า credits |
| POST | /api/billing/stripe/checkout | สร้าง Stripe checkout session |

---

**อัปเดตล่าสุด:** กุมภาพันธ์ 2026
