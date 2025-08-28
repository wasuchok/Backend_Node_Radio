# Refresh Token Middleware Documentation

## คุณสมบัติหลัก

Middleware นี้จะทำการ **auto refresh** access token โดยอัตโนมัติเมื่อ access token หมดอายุ โดยไม่จำเป็นต้องให้ผู้ใช้เรียก API refresh token แยก

## Middleware ที่มีให้ใช้งาน

### 1. `authenticateToken` - บังคับต้องล็อกอิน
```javascript
const { authenticateToken } = require("../middleware/auth");

router.get('/protected-route', authenticateToken, (req, res) => {
  // req.user จะมีข้อมูล { userId, username }
  res.json({ message: 'Protected data', user: req.user });
});
```

**คุณสมบัติ:**
- ตรวจสอบ access token จาก cookies หรือ Authorization header
- ถ้า access token หมดอายุ จะทำการ refresh อัตโนมัติ
- ถ้า refresh สำเร็จ จะให้ผู้ใช้เข้าถึง route ได้
- ถ้า refresh ไม่สำเร็จ จะส่งข้อผิดพลาด 401 พร้อมข้อความให้ล็อกอินใหม่

### 2. `optionalAuth` - ไม่บังคับต้องล็อกอิน
```javascript
const { optionalAuth } = require("../middleware/auth");

router.get('/public-route', optionalAuth, (req, res) => {
  if (req.user) {
    // ผู้ใช้ล็อกอินอยู่
    res.json({ message: 'Hello ' + req.user.username });
  } else {
    // ผู้ใช้ไม่ได้ล็อกอิน
    res.json({ message: 'Hello anonymous user' });
  }
});
```

**คุณสมบัติ:**
- ถ้าไม่มี token ให้ `req.user = null`
- ถ้ามี token ที่ใช้ได้ ให้ข้อมูล user
- ถ้า token หมดอายุ พยายาม refresh อัตโนมัติ
- ไม่ return error ให้ route ทำงานต่อได้

### 3. `logout` - ล้างข้อมูลการล็อกอิน
```javascript
const { logout } = require("../middleware/auth");

// ใช้เป็น middleware ก่อน controller
router.post('/logout', logout, (req, res) => {
  res.json({ ok: true, message: 'ออกจากระบบสำเร็จ' });
});
```

## Auto Refresh Process

เมื่อ access token หมดอายุ middleware จะทำขั้นตอนดังนี้:

1. **ตรวจสอบ refresh token** จาก cookie
2. **ค้นหา user** ที่มี refresh token นี้ในฐานข้อมูล
3. **ตรวจสอบ refresh token** ว่ายังใช้ได้หรือไม่
4. **สร้าง access token ใหม่** (อายุ 15 นาที)
5. **ตั้งค่า cookie ใหม่** และให้ user เข้าถึง route ได้

## การใช้งานในโค้ด

### ในแต่ละ Route File
```javascript
const { authenticateToken, optionalAuth } = require("../middleware/auth");

// สำหรับ routes ที่ต้องการสิทธิ์
router.post('/create', authenticateToken, controller.create);
router.put('/update/:id', authenticateToken, controller.update);
router.delete('/delete/:id', authenticateToken, controller.delete);

// สำหรับ routes ที่ไม่บังคับสิทธิ์
router.get('/list', optionalAuth, controller.list);
router.get('/detail/:id', optionalAuth, controller.getDetail);
```

### ในแต่ละ Controller
```javascript
async function protectedAction(req, res) {
  try {
    // req.user จะมีข้อมูล user เสมอ (ถ้าผ่าน authenticateToken)
    const userId = req.user.userId;
    const username = req.user.username;
    
    // ทำงานของ controller
    const result = await someService.doSomething(userId);
    
    res.json({ ok: true, result });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
}
```

## Error Responses

### Access Token หมดอายุและ Refresh ไม่สำเร็จ
```json
{
  "error": true,
  "message": "Refresh token หมดอายุ กรุณาเข้าสู่ระบบใหม่",
  "requireLogin": true
}
```

### ไม่มี Token
```json
{
  "error": true,
  "message": "ไม่พบ access token"
}
```

### Token ไม่ถูกต้อง
```json
{
  "error": true,
  "message": "Access token ไม่ถูกต้อง"
}
```

## Configuration

ตรวจสอบว่ามี environment variables ดังนี้:

```env
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
```

## ข้อดีของระบบ Auto Refresh

1. **ผู้ใช้ไม่ต้องล็อกอินซ้ำ** - ระบบจะ refresh token อัตโนมัติ
2. **ลดการเขียนโค้ดซ้ำ** - ไม่ต้องเช็ค token expiry ในทุก route
3. **ปลอดภัย** - access token มีอายุสั้น (15 นาที) แต่ user experience ดี
4. **Flexible** - มีทั้งแบบบังคับและไม่บังคับการล็อกอิน

## ตัวอย่างการใช้งานใน Frontend

```javascript
// Frontend ไม่จำเป็นต้องจัดการ refresh token เอง
const response = await fetch('/api/protected-route', {
  credentials: 'include' // สำคัญ! ให้ส่ง cookies ไปด้วย
});

if (response.status === 401) {
  const data = await response.json();
  if (data.requireLogin) {
    // Redirect ไป login page
    window.location.href = '/login';
  }
} else {
  const data = await response.json();
  // ใช้ข้อมูลได้เลย
}
```
