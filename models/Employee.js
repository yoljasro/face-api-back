const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  id: String,
  images: [String],
});

module.exports = mongoose.model('Employee', EmployeeSchema);
