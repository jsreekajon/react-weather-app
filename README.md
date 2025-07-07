# React Weather App

แอปพลิเคชันพยากรณ์อากาศที่สร้างด้วย React  
A simple weather forecast application built with React.

## คุณสมบัติ (Features)

- แสดงข้อมูลสภาพอากาศปัจจุบันและรายวัน
- แผนที่แสดงตำแหน่งจังหวัด
- กราฟแสดงข้อมูลสภาพอากาศ
- รองรับการเชื่อมต่อกับ Firebase
- มีเวอร์ชันสำหรับมือถือ (WeatherAppMobile)

## โครงสร้างโปรเจกต์ (Project Structure)

```
react-weather-app/
  ├── client/           # React frontend
  ├── server/           # Node.js backend server
  ├── functions/        # Firebase Cloud Functions
  └── WeatherAppMobile/ # Mobile version (optional)
```

## การเริ่มต้นใช้งาน (Getting Started)

### 1. ติดตั้ง dependencies

```bash
cd client
npm install
cd ../server
npm install
cd ../functions
npm install
```

### 2. รันฝั่ง Frontend

```bash
cd client
npm start
```

### 3. รันฝั่ง Backend

```bash
cd server
node index.js
```

## การตั้งค่า Firebase (Firebase Setup)

1. สร้างโปรเจกต์ Firebase ที่ [Firebase Console](https://console.firebase.google.com/)
2. คัดลอกค่าการตั้งค่าจาก Firebase ไปใส่ใน `client/src/firebase.js`

## การปรับแต่ง (Customization)

- สามารถแก้ไขข้อมูลจังหวัดและพิกัดได้ที่ `client/src/data/provinces.js` และ `provinceCoordinates.js`
- ปรับแต่งกราฟได้ที่ `client/src/components/VPDDailyChart.js`

## เครดิต (Credits)

- ข้อมูลสภาพอากาศ: [OpenWeatherMap](https://openweathermap.org/) หรือ API ที่ใช้งาน
- พัฒนาโดยทีมงาน/ผู้พัฒนา

## License

MIT 