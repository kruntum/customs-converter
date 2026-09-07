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

## 🌐 Production Deployment Guide (คู่มือการติดตั้งบน Production - Debian Linux)

ระบบถูกออกแบบมาให้รันบน **Docker & Docker Compose** โดยมี Reverse Proxy (Nginx) ฝังในตัว พร้อมสำหรับการเชื่อมต่อผ่าน **Pangolin** หรือ Tunnel/Reverse Proxy อื่นๆ:

### 1. 🧱 โครงสร้าง Services ใน Production (`docker-compose.prod.yml`)
- **`proxy` (Nginx:alpine):** ทางเข้าหลัก Listen ที่พอร์ต `5009` (หรือ `${APP_PORT}`) รับทราฟฟิกจาก **Pangolin** (`https://cal.tummy.cc`) ส่งต่อไปยังแอป พร้อมทั้งส่งต่อ Headers สำหรับ Better Auth (`Host`, `X-Forwarded-Proto`, `X-Forwarded-For`), รองรับ WebSocket และอัปโหลดไฟล์ Excel สูงสุด 50MB
- **`app` (Node.js 22 / Hono):** รัน API Backend และ Frontend SPA ภายใน Docker Network (พอร์ต 3000)
- **`db` (PostgreSQL 17):** ฐานข้อมูลหลักพร้อม Healthcheck

---

### 2. 🚀 ขั้นตอนการติดตั้งบน Debian Linux (Host: `10.10.10.254`)

#### ขั้นตอนที่ 1: ตรวจสอบความพร้อม Docker
```bash
docker --version
docker compose version

# (กรณีต้องใช้ sudo ตลอด ให้เพิ่มสิทธิ์ User)
sudo usermod -aG docker $USER
newgrp docker
```

#### ขั้นตอนที่ 2: Clone โค้ดลงบนเซิร์ฟเวอร์
```bash
mkdir -p ~/apps && cd ~/apps
git clone https://github.com/kruntum/customs-converter.git
cd customs-converter
```

#### ขั้นตอนที่ 3: สร้างและตั้งค่าไฟล์ `.env`
```bash
cp .env.prod.example .env
nano .env
```
กำหนดค่าต่างๆ ดังนี้:
```env
NODE_ENV="production"
PORT=3000
APP_PORT=5009

# 1. ฐานข้อมูล PostgreSQL
DB_USER="customs_converter_user"
DB_NAME="customs_converter_db"
DB_PASSWORD="ใส่รหัสผ่านฐานข้อมูลที่มีความปลอดภัยสูง"

# 2. Better Auth (สร้างคีย์สุ่มด้วยคำสั่ง: openssl rand -hex 32)
BETTER_AUTH_SECRET="ใส่คีย์สุ่ม_HEX_32_ตัวอักษร"
BETTER_AUTH_URL="https://cal.tummy.cc"

# 3. Security (CORS) & Bank of Thailand API
ALLOWED_ORIGINS="https://cal.tummy.cc,http://10.10.10.254:5009"
BOT_API_KEY="ใส่_API_Key_ของธนาคารแห่งประเทศไทย"
```

> [!TIP]
> สามารถสุ่มสร้างรหัสผ่านและ Auth Secret บน Debian ได้ด้วยคำสั่ง:
> ```bash
> openssl rand -hex 32
> ```

#### ขั้นตอนที่ 4: สั่ง Build และรัน Containers
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
*(ระบบจะรัน `npx prisma migrate deploy` โดยอัตโนมัติ เพื่อเตรียมโครงสร้างตารางข้อมูลล่าสุด)*

ตรวจสอบสถานะว่าคอนเทนเนอร์ทำงานครบทั้ง 3 ตัว:
```bash
docker compose -f docker-compose.prod.yml ps
```

#### ขั้นตอนที่ 5: สร้างบัญชีแอดมินเริ่มต้น และดึงเรท ธปท. ย้อนหลัง 1 ปี
```bash
# 1. สร้างบัญชี Admin เริ่มต้น (admin@currency.local / admin1234)
docker compose -f docker-compose.prod.yml exec app node prisma/seed.js

# 2. ดึงเรท ธปท. ย้อนหลัง 365 วัน (USD, EUR, CNY, JPY, GBP)
docker compose -f docker-compose.prod.yml exec app node prisma/seed-exchange-rates.js
```

#### ขั้นตอนที่ 6: ผูกกับ Pangolin
ในหน้า Pangolin Dashboard ให้เพิ่ม Route:
- **Domain / Hostname:** `cal.tummy.cc`
- **Target / Upstream:** `http://10.10.10.254:5009` *(หรือ `http://localhost:5009` หากรันบนเครื่องเดียวกัน)*
- **SSL / HTTPS:** Enabled
- เข้าใช้งานได้ทันทีที่: **`https://cal.tummy.cc`**

---

### 3. 🛠️ รวมคำสั่งที่ใช้บ่อยในการดูแลระบบบน Debian (Debian & Docker Maintenance)

#### 📦 3.1 การจัดการ Service และ Container Lifecycle
```bash
# ตรวจสอบสถานะการทำงานของทุก Service
docker compose -f docker-compose.prod.yml ps

# ดู Log รวมทั้งหมดแบบ Realtime (กด Ctrl+C เพื่อออก)
docker compose -f docker-compose.prod.yml logs -f --tail=100

# ดู Log แยกราย Service
docker compose -f docker-compose.prod.yml logs -f app       # ดูเฉพาะ Backend/Frontend
docker compose -f docker-compose.prod.yml logs -f proxy     # ดูเฉพาะ Nginx Reverse Proxy
docker compose -f docker-compose.prod.yml logs -f db        # ดูเฉพาะ PostgreSQL

# Restart ทุก Service หรือเลือกเฉพาะ Service
docker compose -f docker-compose.prod.yml restart           # restart ทั้งหมด
docker compose -f docker-compose.prod.yml restart app       # restart เฉพาะแอป
docker compose -f docker-compose.prod.yml restart proxy     # reload proxy

# สั่งหยุดและปิดระบบทั้งหมด
docker compose -f docker-compose.prod.yml down
```

#### 🔄 3.2 ขั้นตอนการอัปเดตเวอร์ชันใหม่ (Update Code & Redeploy)
เมื่อมีการแก้ไขโค้ดและ Push ขึ้น GitHub แล้ว ให้ดึงโค้ดและ Rebuild ที่ Debian ได้ทันที:
```bash
# 1. ดึงโค้ดล่าสุดจาก GitHub
git pull origin main

# 2. สั่ง Rebuild และรันใหม่แบบ Zero-downtime
docker compose -f docker-compose.prod.yml up -d --build
```
*(คำสั่งนี้จะทำการ Compile โค้ดใหม่และรัน DB Migration ให้อัตโนมัติโดยไม่ทำให้ข้อมูลใน Database สูญหาย)*

#### 💾 3.3 การสำรองและกู้คืนฐานข้อมูล (Database Backup & Restore)
```bash
# 1. สำรองข้อมูล (Backup) บันทึกเป็นไฟล์ .sql พร้อมระบุวันที่เวลา
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U customs_converter_user customs_converter_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. กู้คืนข้อมูล (Restore) จากไฟล์ Backup
cat backup_YYYYMMDD_HHMMSS.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U customs_converter_user -d customs_converter_db

# 3. เข้าสู่ PostgreSQL Terminal โดยตรง (psql shell)
docker compose -f docker-compose.prod.yml exec db psql -U customs_converter_user -d customs_converter_db
```

#### 📊 3.4 การตรวจสอบทรัพยากรและ Network บน Debian (System Monitoring)
```bash
# ตรวจสอบการใช้งาน CPU / Memory ของแต่ละคอนเทนเนอร์แบบ Realtime
docker stats

# ตรวจสอบพื้นที่ว่างของฮาร์ดดิสก์บนเซิร์ฟเวอร์
df -h

# ตรวจสอบการใช้งาน RAM ของระบบ Debian
free -h

# ตรวจสอบว่าพอร์ต 5009 กำลัง Listen อยู่หรือไม่
sudo ss -tulpn | grep 5009

# ทำความสะอาด Image/Container เก่าที่ไม่ได้ใช้งานเพื่อคืนพื้นที่ดิสก์
docker system prune -f
```

#### ⚡ 3.5 คำสั่งจัดการภายใน Container (Shell & Tools)
```bash
# เข้าไปในคอนเทนเนอร์ app เพื่อรันคำสั่งเชลล์ภายใน
docker compose -f docker-compose.prod.yml exec app sh

# สั่งรันซิงค์เรท ธปท. ย้อนหลัง 1 ปีใหม่แบบ Manual
docker compose -f docker-compose.prod.yml exec app node prisma/seed-exchange-rates.js
```

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
