import mongoose from 'mongoose';
import express from 'express';
import bodyParser from 'body-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import AdminBro from 'admin-bro';
import AdminBroExpress from 'admin-bro-expressjs';
import AdminBroMongoose from 'admin-bro-mongoose';

import Employee from './models/Employee.js'; // .js kengaytmasi bilan import qilamiz
import EmployeeLog from './models/EmployeeLog.js'; // .js kengaytmasi bilan import qilamiz

const __dirname = path.dirname(new URL(import.meta.url).pathname);

const app = express();
const port = 5000;

mongoose.connect('mongodb+srv://yoljasron:9B4vu5ZWnHf8xl0u@face.60end2q.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(bodyParser.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads', req.body.employeeId);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

app.post('/api/upload', upload.array('files'), async (req, res) => {
  const employeeId = req.body.employeeId;
  const files = req.files;

  const images = files.map(file => file.filename);
  
  await Employee.updateOne(
    { id: employeeId },
    { $set: { id: employeeId, images } },
    { upsert: true }
  );

  res.status(200).send('Files uploaded successfully');
});

app.post('/api/log', async (req, res) => {
  const { employeeId, status } = req.body;
  const log = new EmployeeLog({ employeeId, status });
  await log.save();
  res.status(200).send('Log saved successfully');
});

app.get('/api/employees', async (req, res) => {
  const employees = await Employee.find();
  res.json(employees);
});

// Admin panelni tayyorlash
AdminBro.registerAdapter(AdminBroMongoose);

const adminBro = new AdminBro({
  databases: [mongoose],
  resources: [
    { resource: Employee },
    { resource: EmployeeLog },
  ],
  rootPath: '/admin',
});

const adminBroRouter = AdminBroExpress.buildRouter(adminBro);

app.use(adminBro.options.rootPath, adminBroRouter);

// Serverni boshlash
app.listen(port, () => {
  
  console.log(`Server is running on http://localhost:${port}`);
});
