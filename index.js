const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const faceapi = require('face-api.js');
const { loadImage } = require('canvas');
const Employee = require('./models/Employee');
const EmployeeLog = require('./models/EmployeeLog');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect('mongodb+srv://yoljasron:9B4vu5ZWnHf8xl0u@face.60end2q.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.once('open', () => {
  console.log('Connected to MongoDB');
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { employeeId } = req.body;
    const uploadPath = path.join(__dirname, 'uploads', employeeId);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Load face-api.js models
const loadFaceModels = async () => {
  await faceapi.nets.tinyFaceDetector.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json');
  await faceapi.nets.faceLandmark68Net.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json');
  await faceapi.nets.faceRecognitionNet.loadFromUri('https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json');
};
loadFaceModels();

// Routes
app.post('/api/upload', upload.array('files'), async (req, res) => {
  const { employeeId } = req.body;
  const files = req.files;

  if (!employeeId || !files) {
    return res.status(400).send('Employee ID and files are required.');
  }

  const images = [];
  for (const file of files) {
    const imagePath = path.join(__dirname, 'uploads', employeeId, file.filename);
    if (!fs.existsSync(imagePath)) {
      console.error(`File not found: ${imagePath}`);
      res.status(404).send(`File not found: ${imagePath}`);
      return;
    }

    try {
      const img = await loadImage(imagePath);
      const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

      if (detections) {
        images.push({
          filename: file.filename,
          descriptor: Array.from(detections.descriptor),
        });
      }
    } catch (error) {
      console.error(`Error processing file ${file.filename}:`, error);
      res.status(500).send(`Error processing file ${file.filename}.`);
      return;
    }
  }

  try {
    const employee = await Employee.findOneAndUpdate(
      { id: employeeId },
      { $set: { id: employeeId, images } },
      { upsert: true, new: true }
    );
    res.status(200).send('Files uploaded and face data saved successfully.');
  } catch (error) {
    console.error('Error saving employee data:', error);
    res.status(500).send('Error uploading files and saving face data.');
  }
});

app.post('/api/log', async (req, res) => {
  const { employeeId, name, status, timestamp } = req.body;
  const log = new EmployeeLog({ employeeId, name, status, timestamp });
  try {
    await log.save();
    res.status(200).send('Log saved successfully');
  } catch (error) {
    console.error('Error saving log:', error);
    res.status(500).send('Error saving log.');
  }
});

app.post('/api/verify', async (req, res) => {
  const { descriptor } = req.body;
  try {
    const employees = await Employee.find();

    const faceMatcher = new faceapi.FaceMatcher(
      employees.map(emp => new faceapi.LabeledFaceDescriptors(
        emp.id,
        emp.images.map(img => new Float32Array(img.descriptor))
      ))
    );

    const bestMatch = faceMatcher.findBestMatch(new Float32Array(descriptor));
    if (bestMatch.label !== 'unknown') {
      const employee = employees.find(emp => emp.id === bestMatch.label);
      res.json({ id: employee.id, name: employee.name });
    } else {
      res.status(404).json({ message: 'Face not recognized' });
    }
  } catch (error) {
    console.error('Error verifying face:', error);
    res.status(500).send('Error verifying face.');
  }
});

app.get("/", async (req, res) => {
  res.status(200).send("Hello world");
});

app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).send('Error fetching employees.');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
