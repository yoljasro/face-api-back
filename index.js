const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const moment = require('moment-timezone'); // Tashkent vaqti uchun

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB ulanishi
mongoose.connect('mongodb+srv://yoljasron:9B4vu5ZWnHf8xl0u@face.60end2q.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB ga ulandi');
}).catch(err => {
  console.error('MongoDB ulanish xatosi:', err);
});

// Body parser middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Multer fayllar yuklash uchun
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

// MongoDB Schema
const faceLogSchema = new mongoose.Schema({
  employeeId: String,
  name: String,
  status: String,
  timestamp: Date,
  files: [String], // Fayl nomlari uchun array
  descriptor: [Number], // descriptor uchun array
});

const FaceLog = mongoose.model('FaceLog', faceLogSchema);

// Yuzni tasdiqlash logikasi
const verifyFaceLogic = async (descriptor) => {
  const users = await FaceLog.find();

  for (const user of users) {
    // Distance ni hisoblash uchun face-api.jsning 'euclideanDistance' funktsiyasidan foydalanish
    const distance = faceapi.euclideanDistance(user.descriptor, descriptor);
    if (distance < 0.6) { // 0.6 mos kelish chegarasi
      return { id: user.employeeId, name: user.name, descriptor: user.descriptor, files: user.files };
    }
  }

  return null;
};

// Routes
app.post('/api/verify', async (req, res) => {
  const { descriptor } = req.body;
  try {
    const match = await verifyFaceLogic(descriptor);
    if (match) {
      const timestamp = moment().tz('Asia/Tashkent').toDate(); // Tashkent vaqti

      const logEntry = new FaceLog({
        employeeId: match.id,
        name: match.name,
        status: 'success',
        timestamp,
        descriptor: match.descriptor,
        files: match.files, // Fayllarni ham saqlaymiz
      });

      await logEntry.save();

      res.json(logEntry);
    } else {
      res.status(404).send('Yuz aniqlanmadi');
    }
  } catch (error) {
    console.error('Yuzni tasdiqlash xatosi:', error);
    res.status(500).send('Yuzni tasdiqlash xatosi');
  }
});

app.post('/api/log', async (req, res) => {
  const { employeeId, name, status } = req.body;
  const timestamp = moment().tz('Asia/Tashkent').toDate(); // Tashkent vaqti

  const logEntry = new FaceLog({
    employeeId,
    name,
    status,
    timestamp,
  });

  try {
    await logEntry.save();
    console.log('Yuz ma\'lumotlari muvaffaqiyatli yozildi');
    res.status(200).send('Yuz ma\'lumotlari muvaffaqiyatli yozildi');
  } catch (error) {
    console.error('Yuz ma\'lumotlari yozish xatosi:', error);
    res.status(500).send('Yuz ma\'lumotlari yozish xatosi');
  }
});

app.post('/api/upload', upload.array('files', 10), async (req, res) => {
  const { employeeId, name, descriptor } = req.body;
  const files = req.files;

  if (!employeeId || !name || !descriptor || !files) {
    return res.status(400).json({ error: 'Hodim ID, ism, descriptor va fayllar talab qilinadi' });
  }

  try {
    const timestamp = moment().tz('Asia/Tashkent').toDate(); // Tashkent vaqti

    const fileNames = files.map(file => file.filename);
    const parsedDescriptor = JSON.parse(descriptor); // descriptor uchun saqlanadi

    const logEntry = new FaceLog({
      employeeId,
      name,
      status: 'uploaded',
      timestamp,
      files: fileNames,
      descriptor: parsedDescriptor,
    });

    await logEntry.save();

    res.status(200).send('Fayllar va ma\'lumotlar muvaffaqiyatli yuklandi');
  } catch (error) {
    console.error('Fayllarni va ma\'lumotlarni yuklash xatosi:', error);
    res.status(500).send('Fayllarni va ma\'lumotlarni yuklash xatosi');
  }
});

// uploads papkasidan static fayllarni xizmat qilish
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Barcha yozuvlarni olish
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await FaceLog.find();
    res.json(logs);
  } catch (error) {
    console.error('Yozuvlarni olishda xato:', error);
    res.status(500).send('Yozuvlarni olishda xato');
  }
});

// Yuklangan fayllarni olish
app.get('/api/files', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads');
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error('Yuklanganlar papkasini oqishda xato:', err);
      return res.status(500).send('Yuklanganlar papkasini o\'qishda xato');
    }
    res.json(files);
  });
});

app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT} da ishlayapti`);
});
