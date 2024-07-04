// Backend kodni yuzni tanishish uchun moslashtirish
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const moment = require('moment-timezone'); // vaqtni Tashkent vaqtiga o'zgartirish uchun

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect('mongodb+srv://yoljasron:9B4vu5ZWnHf8xl0u@face.60end2q.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Body parser middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

// Models
const faceLogSchema = new mongoose.Schema({
  employeeId: String,
  name: String,
  status: String,
  timestamp: Date,
  files: [String], // Fayl nomlarini saqlash uchun array
  descriptor: [Number], // descriptor arrayni saqlash uchun
});

const FaceLog = mongoose.model('FaceLog', faceLogSchema);

// Euclidean distance hisoblash
const euclideanDistance = (arr1, arr2) => {
  return Math.sqrt(arr1.reduce((sum, value, index) => sum + Math.pow(value - arr2[index], 2), 0));
};

// Face verification logic (placeholder function)
const verifyFaceLogic = async (descriptor) => {
  // Placeholder logic to find a match, replace with actual implementation
  const users = await FaceLog.find();
  return users.find(user => euclideanDistance(user.descriptor, descriptor) < 0.6);
};

// Routes
app.post('/api/verify', async (req, res) => {
  const { descriptor } = req.body;
  try {
    const match = await verifyFaceLogic(descriptor);
    if (match) {
      const timestamp = moment().tz('Asia/Tashkent').toDate(); // Tashkent vaqti

      const logEntry = new FaceLog({
        employeeId: match.employeeId,
        name: match.name,
        status: 'success',
        timestamp,
        descriptor: match.descriptor,
        files: match.files, // Fayllarni ham saqlaymiz
      });

      await logEntry.save();

      res.json(logEntry);
    } else {
      res.status(404).send('Face not recognized');
    }
  } catch (error) {
    console.error('Error verifying face:', error);
    res.status(500).send('Error verifying face');
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
    console.log('Face data logged successfully');
    res.status(200).send('Face data logged successfully');
  } catch (error) {
    console.error('Error logging face data:', error);
    res.status(500).send('Error logging face data');
  }
});

app.post('/api/upload', upload.array('files', 10), async (req, res) => {
  const { employeeId, name, descriptor } = req.body;
  const files = req.files;

  if (!employeeId || !name || !descriptor || !files) {
    return res.status(400).json({ error: 'Employee ID, name, descriptor, and files are required' });
  }

  try {
    const timestamp = moment().tz('Asia/Tashkent').toDate(); // Tashkent vaqti

    files.forEach(file => {
      console.log(`File uploaded: ${file.filename}`);
    });

    const logEntry = new FaceLog({
      employeeId,
      name,
      status: 'uploaded',
      timestamp,
      files: files.map(file => file.filename), // Fayl nomlarini saqlash
      descriptor: JSON.parse(descriptor), // descriptorni saqlash
    });

    await logEntry.save();

    res.status(200).send('Files and data uploaded successfully');
  } catch (error) {
    console.error('Error uploading files and data:', error);
    res.status(500).send('Error uploading files and data');
  }
});

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Get all logs
app.get('/api/logs', async (req, res) => {
  try {
    const logs = await FaceLog.find();
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).send('Error fetching logs');
  }
});

// Get uploaded files
app.get('/api/files', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads');
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error('Error reading uploads directory:', err);
      return res.status(500).send('Error reading uploads directory');
    }
    res.json(files);
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
