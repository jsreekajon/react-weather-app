# React Weather App & Smart Farming Dashboard

เว็บแอปพลิเคชัน (Web Application) สำหรับติดตามและแสดงผลข้อมูลสภาพอากาศเพื่อการเกษตรแม่นยำ (Precision Agriculture) พัฒนาด้วย **React.js** เชื่อมต่อกับ **Firebase** เพื่อจัดการข้อมูลและระบบสมาชิก รองรับการคำนวณค่าสำคัญทางการเกษตร เช่น VPD (Vapor Pressure Deficit) และ ETo (Evapotranspiration) พร้อมแสดงผลในรูปแบบกราฟและแผนที่

---

## สารบัญ
- [ฟีเจอร์หลัก (Features)](#-ฟีเจอร์หลัก-features)
- [เทคโนโลยีที่ใช้ (Tech Stack)](#-เทคโนโลยีที่ใช้-tech-stack)
- [สิ่งที่ต้องติดตั้งก่อน (Prerequisites)](#-สิ่งที่ต้องติดตั้งก่อน-prerequisites)
- [การติดตั้ง (Installation)](#-การติดตั้ง-installation)
- [การตั้งค่า Environment Variables](#-การตั้งค่า-environment-variables)
- [การรันโปรเจกต์ (Running the App)](#-การรันโปรเจกต์-running-the-app)
- [โครงสร้างโปรเจกต์ (Project Structure)](#-โครงสร้างโปรเจกต์-project-structure)

---

## ฟีเจอร์หลัก (Features)
* **Real-time Weather Monitoring:** แสดงข้อมูลอุณหภูมิ ความชื้น และสภาพอากาศปัจจุบัน
* **Interactive Dashboard:** กราฟแสดงแนวโน้มค่า VPD และ ETo รายวัน/รายสัปดาห์ (ใช้ Chart.js)
* **Geospatial Data:** แสดงข้อมูลสภาพอากาศบนแผนที่ (Map Visualization)
* **Authentication:** ระบบเข้าสู่ระบบผ่าน Google (Google Login)
* **Automated Data Fetching:** ระบบดึงข้อมูลพยากรณ์อากาศอัตโนมัติ (Cron Job) ผ่าน Cloud Functions
* **Data Management:** จัดเก็บและดึงข้อมูลย้อนหลังด้วย Firebase Firestore

---

## เทคโนโลยีที่ใช้ (Tech Stack)
**Frontend:**
* React.js
* Chart.js / React-Chartjs-2
* CSS / Styled Components

**Backend & Database:**
* Node.js (Firebase Cloud Functions)
* Express.js
* Firebase Firestore (NoSQL Database)
* Firebase Hosting & Authentication

**External APIs:**
* Visual Crossing Weather API (หรือ API อื่นที่ใช้ในโปรเจกต์)

---

## สิ่งที่ต้องติดตั้งก่อน (Prerequisites)
ก่อนเริ่มรันโปรเจกต์ โปรดตรวจสอบว่าเครื่องของคุณติดตั้งโปรแกรมเหล่านี้แล้ว:
1.  **Node.js** (แนะนำเวอร์ชัน 16 หรือ 18 ขึ้นไป) - [ดาวน์โหลด](https://nodejs.org/)
2.  **Java JDK** (เวอร์ชัน 11 ขึ้นไป สำหรับรัน Firebase Emulators) - [ดาวน์โหลด OpenJDK](https://jdk.java.net/)
3.  **Firebase CLI** (ติดตั้งผ่าน terminal):
    ```bash
    npm install -g firebase-tools
    ```

---

## การติดตั้ง (Installation)

โปรเจกต์นี้แยกส่วน Frontend และ Backend จำเป็นต้องติดตั้ง Dependencies ทั้งสองส่วน

**1. ติดตั้งส่วนหน้าเว็บ (Client)**
```bash
cd client
npm install

**2. ติดตั้งส่วนฟังก์ชัน (Functions/Backend)** กลับไปที่ root folder แล้วเข้าโฟลเดอร์ functions
```bash
cd ../functions
npm install

**ส่วนที่ 2: การตั้งค่า Environment Variables**
สร้างไฟล์ .env ในโฟลเดอร์ client/ และ functions/ (หรือ backend/) โดยระบุค่า Key ที่จำเป็น:

ตัวอย่าง client/.env:
```bash
REACT_APP_API_KEY=your_firebase_api_key
REACT_APP_AUTH_DOMAIN=your_project.firebaseapp.com
... (ค่า Config อื่นๆ ของ Firebase)

ตัวอย่าง functions/.env:
```bash
WEATHER_API_KEY=your_visual_crossing_api_key

**ส่วนที่ 3: การรันโปรเจกต์ (Run Project)**
**Terminal หน้าต่างที่ 1: รัน Frontend**
```bash
cd client
npm start

**Terminal หน้าต่างที่ 2: รัน Backend (Emulators)**
```bash
# รันที่ root directory ของโปรเจกต์
firebase emulators:start
