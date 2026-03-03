# ALEXZA AI — คู่มือ Webhooks

เอกสารนี้อธิบายวิธีรับ Event จาก ALEXZA AI ผ่าน Webhooks — แบ่งชัดเจนว่า **อะไรที่คุณต้องทำเอง** และ **อะไรที่ระบบจัดการให้แล้ว**

---

## สารบัญ

1. [ภาพรวม](#ภาพรวม)
2. [สิ่งที่คุณต้องทำเอง (Client-Side)](#สิ่งที่คุณต้องทำเอง-client-side)
3. [สิ่งที่ระบบทำให้ (System-Side)](#สิ่งที่ระบบทำให้-system-side)
4. [รายการ Events](#รายการ-events)
5. [ความปลอดภัย (Signature Verification)](#ความปลอดภัย-signature-verification)
6. [Retry Policy](#retry-policy)
7. [HTTP Status Codes](#http-status-codes)

---

## ภาพรวม

ALEXZA AI จะส่ง HTTP POST ไปยัง URL ที่คุณกำหนด เมื่อเกิด Event ต่างๆ เช่น การรัน Action สำเร็จ, การเติม Credits, ฯลฯ

**Flow:**
1. คุณลงทะเบียน Webhook URL ใน Dashboard (Settings → Webhooks)
2. ระบบจะสร้าง Webhook Secret ให้คุณ — เก็บไว้ใช้ตรวจสอบความถูกต้อง
3. เมื่อเกิด Event ระบบจะส่ง POST ไปยัง URL ของคุณ พร้อม headers และ JSON body
4. คุณต้องตอบกลับ 200 OK ภายใน 10 วินาที

---

## สิ่งที่คุณต้องทำเอง (Client-Side)

### 1. สร้าง Receiver Endpoint

คุณต้องเขียน API Endpoint ของตัวเองเพื่อรอรับข้อมูล

**ตัวอย่าง:** เปิด route `POST /api/webhook` หรือ `POST /webhooks/alexza` บนเซิร์ฟเวอร์ของคุณ

```python
# Flask (Python)
@app.route('/api/webhook', methods=['POST'])
def handle_alexza_webhook():
    payload = request.get_data(as_text=True)
    signature = request.headers.get('X-Alexza-Signature', '')
    timestamp = request.headers.get('X-Alexza-Timestamp', '')
    
    if not verify_signature(payload, signature, timestamp, WEBHOOK_SECRET):
        return {'error': 'Invalid signature'}, 401
    
    data = json.loads(payload)
    # บันทึกลง DB ก่อน แล้วค่อยประมวลผลทีหลัง
    save_webhook_event(data)
    return '', 200
```

```javascript
// Express (Node.js)
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const payload = req.body.toString('utf8');
  const signature = req.headers['x-alexza-signature'] || '';
  const timestamp = req.headers['x-alexza-timestamp'] || '';

  if (!verifySignature(payload, signature, timestamp, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const data = JSON.parse(payload);
  // บันทึกลง DB ก่อน แล้วค่อยประมวลผลทีหลัง
  saveWebhookEvent(data);
  res.status(200).send();
});
```

### 2. ตรวจสอบความปลอดภัย (Signature Verification)

**ต้องเขียนโค้ดเช็ค `X-Alexza-Signature` ด้วย HMAC-SHA256**

Signature คำนวณจาก: `HMAC-SHA256(timestamp + "." + body, webhook_secret)`

**Node.js / JavaScript:**

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, timestamp, secret) {
  if (!payload || !signature || !timestamp || !secret) return false;
  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}
```

**Python:**

```python
import hmac
import hashlib

def verify_signature(payload: str, signature: str, timestamp: str, secret: str) -> bool:
    if not all([payload, signature, timestamp, secret]):
        return False
    signed_payload = f"{timestamp}.{payload}"
    expected = hmac.new(
        secret.encode('utf-8'),
        signed_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
```

### 3. ตอบกลับภายใน 10 วินาที

**ต้องส่ง `200 OK` กลับมาภายใน 10 วินาที** — ไม่อย่างนั้นระบบจะถือว่าส่งล้มเหลวและจะเริ่ม Retry

**แนะนำ:** รับ request → ตรวจสอบ signature → บันทึกข้อมูลลง DB/Queue ทันที → return 200 — แล้วค่อยประมวลผลทีหลัง (async)

```javascript
// ตัวอย่าง: บันทึกก่อน ประมวลผลทีหลัง
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const payload = req.body.toString('utf8');
  const signature = req.headers['x-alexza-signature'] || '';
  const timestamp = req.headers['x-alexza-timestamp'] || '';

  if (!verifySignature(payload, signature, timestamp, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const data = JSON.parse(payload);
  await db.webhookEvents.insert({ data, receivedAt: new Date() }); // บันทึกทันที
  res.status(200).send(); // ตอบกลับทันที

  // ประมวลผลทีหลัง (ไม่ block response)
  processWebhookEvent(data).catch(console.error);
});
```

### 4. จัดการข้อมูล

- แนะนำให้บันทึกข้อมูลลงฐานข้อมูลก่อน แล้วค่อยประมวลผลทีหลังเพื่อความรวดเร็ว
- ใช้ Idempotency Key (`event.id`) เพื่อป้องกันการประมวลผลซ้ำ

---

## สิ่งที่ระบบทำให้ (System-Side)

คุณ **ไม่** ต้องทำสิ่งเหล่านี้:

| เรื่อง | รายละเอียด |
|-------|-------------|
| **การส่งข้อมูล** | ALEXZA AI จะส่ง POST ไปยัง URL ของคุณโดยอัตโนมัติทันทีที่เกิด Event |
| **Retry** | หากเซิร์ฟเวอร์คุณล่มหรือตอบช้า ระบบจะส่งซ้ำอัตโนมัติ 3 ครั้ง (1 นาที, 5 นาที, 30 นาที) |
| **ความปลอดภัย** | ข้อมูลส่งผ่าน HTTPS เสมอ และมี Signature ให้ตรวจสอบ |

---

## รายการ Events

### Event List

| Event | คำอธิบาย |
|-------|----------|
| `auth.user.created` | ผู้ใช้สมัครสมาชิกใหม่ |
| `auth.user.logged_in` | ผู้ใช้เข้าสู่ระบบ |
| `wallet.topup.succeeded` | เติม Credits สำเร็จ |
| `wallet.topup.failed` | เติม Credits ล้มเหลว |
| `action.run.succeeded` | รัน Action สำเร็จ |
| `action.run.failed` | รัน Action ล้มเหลว |
| `project.created` | สร้าง Project ใหม่ |
| `project.deleted` | ลบ Project |

### Headers ที่ส่งไปทุกครั้ง

| Header | คำอธิบาย |
|--------|----------|
| `Content-Type` | `application/json` |
| `X-Alexza-Timestamp` | Unix timestamp (วินาที) ของการส่ง |
| `X-Alexza-Signature` | HMAC-SHA256 hex signature |
| `X-Alexza-Event` | ชื่อ Event (เช่น `action.run.succeeded`) |
| `X-Alexza-Delivery-Id` | ID สำหรับการติดตาม delivery |

### Payload Examples

#### `auth.user.created`

```json
{
  "id": "evt_abc123",
  "type": "auth.user.created",
  "created_at": 1709123456,
  "data": {
    "user_id": "usr_xyz789",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### `wallet.topup.succeeded`

```json
{
  "id": "evt_def456",
  "type": "wallet.topup.succeeded",
  "created_at": 1709123457,
  "data": {
    "user_id": "usr_xyz789",
    "amount_usd": 10.00,
    "credits_added": 3333,
    "transaction_id": "txn_abc123"
  }
}
```

#### `action.run.succeeded`

```json
{
  "id": "evt_ghi789",
  "type": "action.run.succeeded",
  "created_at": 1709123458,
  "data": {
    "user_id": "usr_xyz789",
    "project_id": "proj_abc",
    "action_name": "summarize_text",
    "request_id": "req_xyz",
    "credits_charged": 2,
    "latency_ms": 450
  }
}
```

#### `action.run.failed`

```json
{
  "id": "evt_jkl012",
  "type": "action.run.failed",
  "created_at": 1709123459,
  "data": {
    "user_id": "usr_xyz789",
    "project_id": "proj_abc",
    "action_name": "summarize_text",
    "request_id": "req_xyz",
    "error_code": "RUNTIME_ERROR",
    "error_message": "Upstream provider timeout"
  }
}
```

---

## ความปลอดภัย (Signature Verification)

### การคำนวณ Signature

```
signed_payload = timestamp + "." + raw_body
signature = HMAC-SHA256(signed_payload, webhook_secret)
# ส่งเป็น hex string ใน header X-Alexza-Signature
```

### ขั้นตอนการตรวจสอบ

1. อ่าน raw body (ไม่ parse JSON ก่อน)
2. อ่าน header `X-Alexza-Timestamp` และ `X-Alexza-Signature`
3. คำนวณ `expected = HMAC-SHA256(timestamp + "." + body, secret)`
4. เปรียบเทียบกับ signature ที่ส่งมา (ใช้ constant-time comparison)

---

## Retry Policy

| ครั้งที่ | ระยะเวลาหลังจากล้มเหลว |
|---------|--------------------------|
| 1 | ทันที |
| 2 | 1 นาที |
| 3 | 5 นาที |
| 4 | 30 นาที |

หากครบ 4 ครั้งแล้วยังล้มเหลว ระบบจะหยุดส่ง — ดู Delivery Log ใน Dashboard เพื่อตรวจสอบ

---

## HTTP Status Codes

| Code | ความหมาย | ระบบจะทำอย่างไร |
|------|----------|------------------|
| 200 | รับสำเร็จ | ไม่ส่งซ้ำ |
| 2xx | รับสำเร็จ | ไม่ส่งซ้ำ |
| 4xx | Client Error | ส่งซ้ำตาม Retry Policy |
| 5xx | Server Error | ส่งซ้ำตาม Retry Policy |
| Timeout (>10s) | ไม่ตอบภายใน 10 วินาที | ส่งซ้ำตาม Retry Policy |

---

## Response Requirements

- **ต้องตอบกลับ:** `200 OK` หรือ `2xx` ภายใน **10 วินาที**
- **Body:** ว่างได้ หรือ JSON ก็ได้
- **Headers:** ไม่บังคับ

---

**อัปเดตล่าสุด:** มีนาคม 2026
