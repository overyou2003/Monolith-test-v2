
# Monolith E‑Commerce — ALL Down with Custom Error Page

- Monolith ใช้ฐานข้อมูลร่วมกัน — ถ้าส่วนใดส่วนหนึ่งล่ม (เช่น Cart) ทำให้ DB/ระบบล่ม → ทุกฟีเจอร์ใช้ไม่ได้
- เซิร์ฟเวอร์จะ **เสิร์ฟหน้า error ของเราเอง** (ไม่ใช่ default/404) สำหรับทุกคำขอ เมื่อระบบล่ม
- ปุ่ม Crash/Restore อยู่บน Header

## Run
```
npm install
npm start
# http://localhost:5000
```

## Demo
- Crash จาก Cart: กด "ทำให้ตะกร้าล่ม" → ระบบพาไปหน้า /error
- Crash DB ตรง ๆ: กด "ทำให้ฐานข้อมูลล่ม" → /error
- Restore: กด "กู้คืนระบบ" → กลับมาใช้งานได้
