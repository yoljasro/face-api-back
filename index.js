const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const { Canvas, Image, ImageData } = canvas;

// Mongoose Employee modeli
const EmployeeSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  name: { type: String, required: true },
  descriptors: { type: [[Number]], required: true },
});
const Employee = mongoose.model('Employee', EmployeeSchema);

// Yuzni aniqlash va yuzlandirish modellarini yuklash
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const loadModels = async () => {
  const modelUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
  console.log('Model path:', modelUrl); // URL manzilini chiqarish
  await faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl);
  await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl);
  await faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl);
};

const euclideanDistance = (a, b) => {
  return Math.sqrt(a.map((val, i) => (val - b[i]) ** 2).reduce((sum, dist) => sum + dist, 0));
};

loadModels();

const app = express();
const PORT = 5000;

mongoose.connect('mongodb+srv://yoljasron:9B4vu5ZWnHf8xl0u@face.60end2q.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.once('open', () => {
  console.log('Connected to MongoDB');
});

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const upload = multer({ dest: 'uploads/' });

app.post('/api/upload', upload.array('files'), async (req, res) => {
  const { employeeId, name } = req.body;

  if (!req.files || req.files.length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  const descriptors = [];

  for (const file of req.files) {
    const imagePath = path.join(__dirname, file.path);
    console.log('Processing file:', imagePath); // Fayl yo'lini chiqarish

    if (!fs.existsSync(imagePath)) {
      console.error('File does not exist:', imagePath);
      return res.status(400).send('File does not exist.');
    }

    try {
      const img = await canvas.loadImage(imagePath);
      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

      if (detection) {
        descriptors.push(Array.from(detection.descriptor));
      }
    } catch (error) {
      console.error('Error processing file:', error);
      return res.status(500).send('Error processing file.');
    }

    fs.unlinkSync(imagePath); // Remove file after processing
  }

  if (descriptors.length > 0) {
    const employee = new Employee({ employeeId, name, descriptors });
    await employee.save();
    res.send('Files uploaded and face data saved successfully.');
  } else {
    res.status(400).send('No face detected in uploaded images.');
  }
});

app.post('/api/verify', async (req, res) => {
  const { descriptor } = req.body;

  if (!descriptor) {
    return res.status(400).send('Descriptor is required.');
  }

  const employees = await Employee.find();

  let bestMatch = null;
  let smallestDistance = Infinity;

  employees.forEach(employee => {
    employee.descriptors.forEach(empDescriptor => {
      const distance = euclideanDistance(empDescriptor, descriptor);

      if (distance < smallestDistance) {
        smallestDistance = distance;
        bestMatch = {
          id: employee.employeeId,
          name: employee.name,
          distance,
        };
      }
    });
  });

  if (bestMatch && smallestDistance < 0.6) {
    res.send(bestMatch);
  } else {
    res.status(404).send('No matching face found.');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
