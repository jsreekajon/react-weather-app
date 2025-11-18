const app = require("./app");
const helmet = require("helmet");

// เพิ่มความปลอดภัย Header
app.use(helmet());

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
  console.log(`📍 CORS origin: ${process.env.FRONTEND_URL || "https://weather-31ba2.web.app"}`);
});
