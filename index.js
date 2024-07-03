const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const moment = require('moment-timezone');
const AdminJS = require('adminjs');
const AdminJSExpress = require('@adminjs/express');
const AdminJSMongoose = require('@adminjs/mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

mongoose.connect('mongodb+srv://yoljasron:9B4vu5ZWnHf8xl0u@face.60end2q.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

const faceLogSchema = new mongoose.Schema({
  employeeId: String,
  name: String,
  status: String,
  timestamp: Date,
  files: [String],
  descriptor: [Number],
});

const FaceLog = mongoose.model('FaceLog', faceLogSchema);

const verifyFaceLogic = async (descriptor) => {
  const users = await FaceLog.find();
  
  for (const user of users) {
    const isMatch = user.descriptor.every((val, index) => val === descriptor[index]);

    if (isMatch) {
      return { id: user.employeeId, name: user.name, descriptor: user.descriptor };
    }
  }

  return null;
};

app.post('/api/verify', async (req, res) => {
  const { descriptor } = req.body;
  try {
    const match = await verifyFaceLogic(descriptor);
    if (match) {
      const timestamp = moment().tz('Asia/Tashkent').toDate();

      const logEntry = new FaceLog({
        employeeId: match.id,
        name: match.name,
        status: 'success',
        timestamp,
        descriptor: match.descriptor,
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
  const timestamp = moment().tz('Asia/Tashkent').toDate();

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
    const timestamp = moment().tz('Asia/Tashkent').toDate();

    files.forEach(file => {
      console.log(`File uploaded: ${file.filename}`);
    });

    const logEntry = new FaceLog({
      employeeId,
      name,
      status: 'uploaded',
      timestamp,
      files: files.map(file => file.filename),
      descriptor: JSON.parse(descriptor),
    });

    await logEntry.save();

    res.status(200).send('Files and data uploaded successfully');
  } catch (error) {
    console.error('Error uploading files and data:', error);
    res.status(500).send('Error uploading files and data');
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/logs', async (req, res) => {
  try {
    const logs = await FaceLog.find();
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).send('Error fetching logs');
  }
});

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

AdminJS.registerAdapter(AdminJSMongoose);

const adminJS = new AdminJS({
  resources: [
    { resource: FaceLog, options: { parent: { name: 'Database' } } }
  ],
  rootPath: '/admin',
});

const adminRouter = AdminJSExpress.buildAuthenticatedRouter(adminJS, {
  authenticate: async (email, password) => {
    if (email === '1' && password === '1') {
      return true;
    }
    return false;
  },
  cookieName: '1',
  cookiePassword: '1',
});

app.use(adminJS.options.rootPath, adminRouter);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
