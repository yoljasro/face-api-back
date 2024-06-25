const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const faceapi = require('face-api.js');
const canvas = require('canvas');

const Employee = require('./models/Employee');
const EmployeeLog = require('./models/EmployeeLog');

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

  // Load face-api.js models
  await faceapi.nets.ssdMobilenetv1.loadFromDisk('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json');
  await faceapi.nets.faceLandmark68Net.loadFromDisk('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json');
  await faceapi.nets.faceRecognitionNet.loadFromDisk('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json');

  const images = [];
  for (const file of files) {
    const imagePath = path.join(__dirname, 'uploads', employeeId, file.filename);
    const img = await canvas.loadImage(imagePath);
    const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

    if (detections) {
      images.push({
        filename: file.filename,
        descriptor: Array.from(detections.descriptor),
      });
    }
  }

  await Employee.updateOne(
    { id: employeeId },
    { $set: { id: employeeId, images } },
    { upsert: true }
  );

  res.status(200).send('Files uploaded successfully');
});

app.post('/api/log', async (req, res) => {
  const { employeeId, name, status, timestamp } = req.body;
  const log = new EmployeeLog({ employeeId, name, status, timestamp });
  await log.save();
  res.status(200).send('Log saved successfully');
});

app.post('/api/verify', async (req, res) => {
  const { descriptor } = req.body;
  const employees = await Employee.find();

  const faceMatcher = new faceapi.FaceMatcher(
    employees.map(emp => {
      return new faceapi.LabeledFaceDescriptors(
        emp.id,
        emp.images.map(img => new Float32Array(img.descriptor))
      );
    })
  );

  const bestMatch = faceMatcher.findBestMatch(new Float32Array(descriptor));
  if (bestMatch.label !== 'unknown') {
    const employee = employees.find(emp => emp.id === bestMatch.label);
    res.json({ id: employee.id, name: employee.name });
  } else {
    res.status(404).json({ message: 'Face not recognized' });
  }
});

app.get('/api/employees', async (req, res) => {
  const employees = await Employee.find();
  res.json(employees);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
