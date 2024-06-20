const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// MongoDB ulanish
mongoose.connect('mongodb+srv://yoljasron:<password>@face.60end2q.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const EmployeeLog = mongoose.model('EmployeeLog', new mongoose.Schema({
  employeeId: String,
  timestamp: { type: Date, default: Date.now },
  status: String,
}));

const Employee = mongoose.model('Employee', new mongoose.Schema({
  id: String,
  images: [String],
}));

app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

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

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
