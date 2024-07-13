import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';
import cors from 'cors';
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import AdminJSMongoose from '@adminjs/mongoose';

// MongoDB connection
mongoose.connect('mongodb+srv://yoljasron:9B4vu5ZWnHf8xl0u@face.60end2q.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB successfully');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Express setup
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
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
  role: String,
  status: String,
  timestamp: { type: Date, default: Date.now },
  departureTimestamp: Date,
  files: [String],
  descriptor: [Number],
});

const FaceLog = mongoose.model('FaceLog', faceLogSchema);

// Flag to prevent multiple writes
let isWriting = false;

// Function to log face data
const logFaceData = async (employeeId, name, role) => {
  if (isWriting) return;
  isWriting = true;

  try {
    const timestamp = moment().tz('Asia/Tashkent').toDate();
    const logEntry = new FaceLog({
      employeeId,
      name,
      role,
      status: 'uploaded',
      timestamp,
    });

    // Calculate departure timestamp conditionally based on role
    if (role === 'chef') {
      const departureTime = moment(timestamp).startOf('day').set({ hour: 11, minute: 40 }).tz('Asia/Tashkent').toDate();
      logEntry.departureTimestamp = departureTime;
    } else if (role === 'waiter') {
      const departureTime = moment(timestamp).startOf('day').set({ hour: 11, minute: 40 }).tz('Asia/Tashkent').toDate();
      logEntry.departureTimestamp = departureTime;
    }

    await logEntry.save();
    console.log('Face data logged successfully');
  } catch (error) {
    console.error('Error logging face data:', error);
  } finally {
    isWriting = false;
  }
};

// API endpoints
app.post('/api/log', async (req, res) => {
  const { employeeId, name, role } = req.body;
  if (isWriting) return res.status(429).send('Currently processing another request. Please try again.');
  
  isWriting = true;

  try {
    const timestamp = moment().tz('Asia/Tashkent').toDate();
    const logEntry = new FaceLog({
      employeeId,
      name,
      role,
      status: 'uploaded',
      timestamp,
    });

    await logEntry.save();
    console.log('Face data logged successfully');
    res.status(200).send('Face data logged successfully');
  } catch (error) {
    console.error('Error logging face data:', error);
    res.status(500).send('Error logging face data');
  } finally {
    isWriting = false;
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const logs = await FaceLog.find().sort({ timestamp: -1 }); // Sort logs by timestamp in descending order
    res.json(logs);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).send('Error fetching logs');
  }
});

// AdminJS setup
AdminJS.registerAdapter(AdminJSMongoose);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adding components to AdminJS
const componentLoader = new AdminJS.ComponentLoader();
const showImageComponent = componentLoader.add('ShowImage', path.resolve(__dirname, './components/ShowImage.tsx'));
const showRoleComponent = componentLoader.add('ShowRole', path.resolve(__dirname, './components/ShowRole.js'));

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
              show: showImageComponent,
            },
          },
          descriptor: { isVisible: { list: false, show: false, filter: true, edit: false } },
          id: { isVisible: { list: false, show: false, filter: true, edit: false } },
          status: { isVisible: { list: true, show: true, filter: true, edit: false } },
          timestamp: { isVisible: { list: true, show: true, filter: true, edit: false } },
          departureTimestamp: { isVisible: { list: true, show: true, filter: true, edit: false } },
        },
        actions: {
          list: {
            sort: {
              sortBy: 'timestamp',
              direction: 'desc', // Ensures the latest logs are on top
            },
          },
        },
      },
    },
  ],
  locale: {
    translations: {
      labels: {
        FaceLog: 'User Logs',
      },
    },
  },
});

const router = AdminJSExpress.buildRouter(adminJs);
app.use(adminJs.options.rootPath, router);

// Listening to the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
