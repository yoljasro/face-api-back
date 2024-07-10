// index.mjs

import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import moment from 'moment-timezone';
import cors from 'cors'
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import AdminJSMongoose from '@adminjs/mongoose';

// MongoDB connection
mongoose.connect('mongodb+srv://yoljasron:9B4vu5ZWnHf8xl0u@face.60end2q.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Express setup
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

// Schema for FaceLog
const faceLogSchema = new mongoose.Schema({
  employeeId: String,
  name: String,
  status: String,
  timestamp: Date,
  departureTimestamp: Date,
  files: [String],
  descriptor: [Number],
});

const FaceLog = mongoose.model('FaceLog', faceLogSchema);

// Function to calculate Euclidean distance
const euclideanDistance = (arr1, arr2) => {
  return Math.sqrt(arr1.reduce((sum, value, index) => sum + Math.pow(value - arr2[index], 2), 0));
};

// Function to verify face descriptor
const verifyFaceLogic = async (descriptor) => {
  const users = await FaceLog.find();
  return users.find(user => euclideanDistance(user.descriptor, descriptor) < 0.6);
};

// API endpoints
app.post('/api/verify', async (req, res) => {
  const { descriptor } = req.body;
  try {
    const match = await verifyFaceLogic(descriptor);
    if (match) {
      const timestamp = moment().tz('Asia/Tashkent').toDate();
      const logEntry = new FaceLog({
        employeeId: match.employeeId,
        name: match.name,
        status: 'success',
        timestamp,
        descriptor: match.descriptor,
        files: match.files,
      });

      // Find the last log entry for the employee to get the previous timestamp
      const lastLog = await FaceLog.findOne({ employeeId: match.employeeId }).sort({ timestamp: -1 });
      if (lastLog && lastLog.status === 'success') {
        logEntry.departureTimestamp = lastLog.timestamp;
      }

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
  if (!employeeId || !name || !files) {
    return res.status(400).json({ error: 'Employee ID, name, and files are required' });
  }
  try {
    const timestamp = moment().tz('Asia/Tashkent').toDate();
    const logEntry = new FaceLog({
      employeeId,
      name,
      status: 'uploaded',
      timestamp,
      files: files.map(file => file.filename),
      descriptor: descriptor ? JSON.parse(descriptor) : [],
    });
    await logEntry.save();
    res.status(200).send('Files and data uploaded successfully');
  } catch (error) {
    console.error('Error uploading files and data:', error);
    res.status(500).send('Error uploading files and data');
  }
});

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
  const uploadsDir = path.join(process.cwd(), 'uploads');
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error('Error reading uploads directory:', err);
      return res.status(500).send('Error reading uploads directory');
    }
    res.json(files);
  });
});

// AdminJS setup
AdminJS.registerAdapter(AdminJSMongoose);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentLoader = new AdminJS.ComponentLoader();
const showImageComponent = componentLoader.add('ShowImage', path.resolve(__dirname, './components/ShowImage.tsx'));

const adminJs = new AdminJS({
  databases: [mongoose],
  rootPath: '/admin',
  resources: [
    {
      resource: FaceLog,
      options: {
        properties: {
          employeeId: { isVisible: { list: false, show: false, filter: true, edit: false } },
          files: {
            isVisible: { list: false, show: true, filter: true, edit: false },
            components: {
              show: showImageComponent
            }
          },
          descriptor: { isVisible: { list: false, show: false, filter: true, edit: false } },
          id: { isVisible: { list: false, show: false, filter: true, edit: false } },
          status: { isVisible: { list: true, show: true, filter: true, edit: false } },
          timestamp: { isVisible: { list: true, show: true, filter: true, edit: false } },
          departureTimestamp: { isVisible: { list: true, show: true, filter: true, edit: false } }, // New field
        },
      },
    },
  ],
});

const router = AdminJSExpress.buildRouter(adminJs);
app.use(adminJs.options.rootPath, router);

app.delete('/api/clear-logs', async (req, res) => {
  try {
    const result = await FaceLog.deleteMany({});
    console.log(`Deleted ${result.deletedCount} documents`);
    res.status(200).send(`Deleted ${result.deletedCount} documents`);
  } catch (error) {
    console.error('Error clearing logs:', error);
    res.status(500).send('Error clearing logs');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
