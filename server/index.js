// server/index.js
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

// โหลด Firebase service account key
const serviceAccount = require('./serviceAccountKey.json');

// เริ่ม Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// Middleware
app.use(cors());
app.use(express.json());

// Auth Middleware
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null;

    if (!idToken) return res.status(401).json({ error: 'Unauthorized - no token' });

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// ✅ API Routes
app.get('/api/profile', verifyToken, async (req, res) => {
  res.json({ uid: req.user.uid, email: req.user.email });
});

app.get('/api/profile/data', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return res.status(404).json({ message: 'User not found' });
    res.json(userDoc.data());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/profile', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    await db.collection('users').doc(uid).set(req.body, { merge: true });
    res.json({ message: 'Saved', data: req.body });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save' });
  }
});

// ✅ Serve React (from CRA build)
const buildPath = path.join(__dirname, '../build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// 🚀 Start server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
