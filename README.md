# Currency Management System

ระบบบันทึกข้อมูลใบขนสินค้า (Declaration) และอินวอยซ์พร้อมการดึงอัตราแลกเปลี่ยนอัตโนมัติจากธนาคารแห่งประเทศไทย (BOT) และระบบกระทบยอด/ตัดชำระเงินต่างประเทศ (Reconciliation) หลายบริษัท (Multi-Company Support)

---

## ✨ Key Features (คุณสมบัติเด่นของระบบ)

ระบบได้รับการพัฒนาให้มีความเสถียร มีความปลอดภัยสูง และรองรับการทำงานในระดับองค์กร (Enterprise Ready) โดยประกอบด้วยคุณสมบัติหลักดังนี้:

### 1. 🏢 Multi-Company & Role-Based Access Control (RBAC)
- **รองรับหลายบริษัท:** ผู้ใช้สามารถสร้าง สลับบริษัท และทำรายการแยกขาดตามบริษัทได้อย่างปลอดภัย
- **การจัดการบทบาทระดับบริษัท:** กำหนดสิทธิ์การทำงานละเอียด 4 ระดับ:
  - **OWNER / ADMIN:** จัดการข้อมูลบริษัท, สมาชิก, รายการธุรกรรม, และการเงินได้ทั้งหมด
  - **FINANCE:** จัดการระบบการเงิน (Receipts, FCD, การตัดชำระ) และดู Dashboard ได้ แต่แก้ไขโครงสร้างบริษัทไม่ได้
  - **DATA_ENTRY:** เพิ่ม/แก้ไขรายการใบขนสินค้า (Transactions) ได้เท่านั้น ไม่สามารถเข้าถึงระบบการเงินหรือ Dashboard
- **ระบบความปลอดภัยรัดกุม:** ป้องกันการสวมรอยข้ามสิทธิ์ระดับ API และกรองเมนูตามสิทธิ์การใช้งานจริง (Role-Based UI Rendering)

### 2. 🧾 ระบบนำเข้าใบขนสินค้าและอัตราแลกเปลี่ยนอัตโนมัติ (Transactions & Invoices)
- **ดึงเรทจาก BOT อัตโนมัติ:** เมื่อระบุวันที่และสกุลเงิน ระบบจะเชื่อมต่อกับ API ธนาคารแห่งประเทศไทย (BOT) เพื่อดึงอัตราแลกเปลี่ยนย้อนหลังทันที
- **บันทึกแยกรายอินวอยซ์:** รองรับการผูก 1 ใบขนต่อหลายใบกำกับสินค้า (Invoice) พร้อมแยกรายละเอียดสินค้าแต่ละรายการ (Invoice Items)
- **ระบบคำนวณอัตโนมัติ:** แสดงยอดเป็นสกุลเงินต่างประเทศ (FCY) และมูลค่ารวมเงินบาท (THB) เสมือนจริง

---
- **สรุปผลการบริหารความเสี่ยงอัตราแลกเปลี่ยน:** แสดงผลกำไร/ขาดทุนสุทธิ (Net FX Gain/Loss) แยกการแสดงผลตาม Layer 1 และ Layer 2
- **กราฟวิเคราะห์แนวโน้ม:** กราฟสรุปผลงานรายเดือนและรายสกุลเงินผ่าน Recharts
- **ตารางวิเคราะห์อายุหนี้ (Outstanding Receivables):** แสดงรายชื่อลูกหนี้ค้างชำระ จัดอันดับความล่าช้าการชำระเงิน (Aging 30/60/90 วัน)
- **การส่งออกรายงาน:** ส่งออกข้อมูลรายละเอียดธุรกรรม และประวัติการแลกเปลี่ยนเงินคลังเป็นไฟล์ Excel (`.xlsx`) ทันทีผ่าน Web Browser

---

## 🚀 How to Start Project (คู่มือการติดตั้งและใช้งาน)

### สิ่งที่ต้องมีเบื้องต้น
- [Node.js](https://nodejs.org/) (เวอร์ชัน 20 ขึ้นไป)
- [Docker](https://www.docker.com/) (สำหรับรันฐานข้อมูลในเครื่องคอมพิวเตอร์)
- [Git](https://git-scm.com/)

### ขั้นตอนการรันโปรเจกต์ (Local Development)

1. **Clone Repository และเข้าไปที่โฟลเดอร์โปรเจกต์**
   ```bash
   cd d:\work\Currency-test
   ```

2. **ติดตั้ง Dependencies**
   ```bash
   npm install
   ```

3. **เตรียม Environment Variables**
   สร้างไฟล์ `.env` ที่ root ของโปรเจกต์ และกำหนดค่าตามตัวอย่าง:
   ```env
   # ตัวอย่างเชื่อมต่อ Database (PostgreSQL)
   DATABASE_URL="postgresql://customs_converter_user:customs_converter_pass@localhost:5432/customs_converter_db"
   
   # Better Auth Secret (สามารถสร้างคีย์สุ่มขึ้นมาทดแทนได้)
   BETTER_AUTH_SECRET="your-better-auth-secret-key"
   BETTER_AUTH_URL="http://localhost:5173"
   
   # API Key จากธนาคารแห่งประเทศไทย (ถ้ามี)
   BOT_API_KEY="your-bank-of-thailand-api-key"
   
   # รายการ Origins ที่อนุญาตสำหรับการเชื่อมต่อ (CORS Security)
   ALLOWED_ORIGINS="http://localhost:5173,http://localhost:3000"
   ```

4. **รันฐานข้อมูลด้วย Docker Compose**
   ```bash
   docker-compose up db -d
   ```

5. **รัน Migration และ Seed ข้อมูลเริ่มต้น**
   คำสั่งนี้จะทำการติดตั้งโครงสร้างตารางข้อมูลล่าสุด และสร้างบัญชีทดสอบเริ่มต้น (มีบทบาทเป็น Admin)
   ```bash
   npm run db:migrate
   ```
   และรัน Seed ข้อมูลจำลองและผู้ใช้งาน:
   ```bash
   npm run db:seed
   ```
   *(อีเมลเข้าใช้เริ่มต้น: `admin@currency.local` รหัสผ่าน: `admin1234`)*

6. **เปิดใช้งานแอปพลิเคชัน (ทั้ง Frontend และ Backend)**
   ```bash
   npm run dev
   ```
   - **Frontend (React/Vite)** จะทำงานที่: `http://localhost:5173`
   - **Backend API (Hono)** จะทำงานที่: `http://localhost:3000`

---

## 🌐 Production Deployment & Exchange Rate Sync Setup (การติดตั้งบน Production & อัตราแลกเปลี่ยน)

เมื่อนำโปรเจกต์นี้ขึ้นไปติดตั้งบนระบบจริง (Production) ภายใต้ **Docker** ระบบถูกออกแบบมาให้มี Reverse Proxy (Nginx) ฝังในตัว พร้อมสำหรับการเชื่อมต่อผ่าน **Pangolin** หรือ Tunnel/Proxy อื่นๆ:

### 1. โครงสร้าง Services ใน Production (`docker-compose.prod.yml`)
- **`proxy` (Nginx):** ทำหน้าที่เป็นทางเข้าหลัก Listen ที่พอร์ต `5009` (หรือตามค่า `${APP_PORT}`) เพื่อรับทราฟฟิกจาก **Pangolin** (`https://cal.tummy.cc`) และส่งต่อไปยังแอป พร้อมทั้งส่งต่อ Headers สำหรับ Better Auth (`Host`, `X-Forwarded-Proto`, `X-Forwarded-For`) และขยายขนาดรับไฟล์ Excel สูงสุดถึง 50MB
- **`app` (Node.js/Hono):** รันแอปพลิเคชันและให้บริการ API อยู่ภายใน Docker Network (พอร์ต 3000)
- **`db` (PostgreSQL 17):** ฐานข้อมูลหลักพร้อม Healthcheck

### 2. ขั้นตอนการ Deploy
1. **กำหนดค่า Environment Variables (`.env`):**
   คัดลอกไฟล์ `.env.prod.example` ไปเป็น `.env` และกำหนดค่า:
   ```env
   APP_PORT=5009
   BETTER_AUTH_URL="https://cal.tummy.cc"
   ALLOWED_ORIGINS="https://cal.tummy.cc,http://10.10.10.254:5009"
   BOT_API_KEY="คีย์_Authorization_ของธนาคารแห่งประเทศไทย"
   ```
2. **การรัน Migration (ทำงานอัตโนมัติ):**
   คอนเทนเนอร์ `app` ใน `docker-compose.prod.yml` ถูกกำหนดให้รันคำสั่ง `npx prisma migrate deploy` โดยอัตโนมัติทุกครั้งเมื่อ Boot ขึ้นมา
3. **การสั่งรัน Container:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
4. **การตั้งค่า Pangolin:**
   ในหน้าคอนฟิกของ Pangolin ให้ชี้ Target/Upstream ไปที่:
   ```
   http://10.10.10.254:5009
   ```

### 📅 3. การดึงข้อมูลอัตราแลกเปลี่ยนย้อนหลัง 1 ปี (Historical Seeding)
เพื่อความสะดวกในการเริ่มระบบครั้งแรกและมีข้อมูลย้อนหลังแสดงบนหน้าเว็บทันทีโดยไม่ต้องรอระบบซิงค์ของแต่ละวัน ให้คุณรันสคริปต์ย้อนหลัง 1 ปี (365 วัน) **ผ่านคอนเทนเนอร์ที่กำลังทำงานอยู่** ด้วยคำสั่งนี้:

* **คำสั่งสำหรับการรันย้อนหลังภายใต้ Docker:**
  ```bash
  docker compose -f docker-compose.prod.yml exec app node prisma/seed-exchange-rates.js
  ```
* **รายละเอียดการทำงาน:**
  * สคริปต์จะทำการดึงข้อมูลเรทซื้อแบบโอนเงิน (`buying_transfer`) ของสกุลเงิน `USD`, `EUR`, `CNY`, `JPY`, และ `GBP` ย้อนหลัง 1 ปีจาก API ของ ธปท.
  * ทำการดึงข้อมูลทีละ 30 วัน (เพื่อไม่ให้เกินขีดจำกัดสูงสุด 31 วันต่อ 1 Request ของ ธปท.) พร้อมหน่วงเวลา 1 วินาทีในทุกรอบการยิงเพื่อป้องกันการโดนบล็อกไอพี
  * สคริปต์นี้ถูกคอมไพล์เป็น JavaScript ไว้ล่วงหน้าแล้วตอนสั่ง Docker build ทำให้รันโดยตรงบน Node.js ในคอนเทนเนอร์ได้อย่างรวดเร็วและใช้เมมโมรี่น้อย

---

## 🛠️ Technology Stack (เทคโนโลยีที่ใช้)

### 💻 Frontend (Client Side)
- **React 19 & Vite 7:** รองรับฟังก์ชันใหม่ล่าสุด ความเร็วในการโหลดสูง
- **Tailwind CSS v4:** สไตล์ลิ่งแบบโมเดิร์น คอมไพล์ได้เร็วและมีประสิทธิภาพสูง
- **Zustand:** จัดการ Global State อย่างมีประสิทธิภาพ แยกสโตร์ตามฟีเจอร์ (`transaction-store`, `receipt-store`, `treasury-store`, `company-store`, `dashboard-store`)
- **Shadcn UI (Radix UI):** คอมโพเนนต์ UI พื้นฐานสำหรับความเข้ากันได้และการออกแบบที่สวยงาม
- **Recharts:** แสดงกราฟเส้น กราฟแท่ง และกราฟสัดส่วนสกุลเงินที่ลื่นไหล
- **Lucide Icons & Sonner:** คลังไอคอนที่สมบูรณ์และระบบหน้าต่างแจ้งเตือนธุรกรรมสำเร็จ

### ⚙️ Backend (Server Side)
- **Hono Framework:** เฟรมเวิร์ก HTTP ที่ทำงานได้เบา รวดเร็ว และรองรับ Node.js Adapter
- **Prisma ORM:** ตัวช่วยจัดการข้อมูล PostgreSQL ในระดับวัตถุ (Object-Relational) รองรับ Transaction SQL และการป้องกันสคริปต์อันตราย
- **Better Auth:** จัดการระบบลงทะเบียน ล็อกอิน จัดการเซสชัน และสิทธิ์แอดมินระดับ API อย่างปลอดภัย
- **Decimal.js:** ใช้จัดการการคำนวณทางคณิตศาสตร์ความละเอียดสูง (ทศนิยม 4-6 ตำแหน่ง) ป้องกันปัญหาเศษทศนิยมลอย (Floating Point Errors) ซึ่งเป็นข้อบังคับในระบบบัญชีการเงิน

### 🔐 Security & Optimization Controls
- **CORS Protection:** กรองโดเมนและไอพีด้วย White-list ป้องกันการเชื่อมต่อที่ไม่ได้รับอนุญาต
- **API Guard:** ตรวจสอบสิทธิ์ระดับ API ทุกช่องทางผ่าน middleware `companyAuth` เพื่อความปลอดภัยสองชั้น
- **Code Chunk Splitting:** แบ่งแยกโค้ดแอปหลักออกจากไลบรารีใหญ่ เช่น React, Radix, Recharts และ Better Auth เพื่อให้หน้าเว็บโหลดครั้งแรกเร็วขึ้น 52%
- **Dynamic Imports:** แยกไลบรารีส่งออกข้อมูลอย่าง `XLSX` (ขนาด ~400KB) ให้โหลดเฉพาะตอนที่ผู้ใช้กดปุ่ม Export เท่านั้น ป้องกันการหน่วงความเร็วในการเริ่มโปรแกรมครั้งแรก
- **Audit Logging:** บันทึกการทำธุรกรรมแบบย้อนหลัง (Create, Update, Delete) ลงตารางประวัติผู้ใช้งานอย่างละเอียด
