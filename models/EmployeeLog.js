const mongoose = require('mongoose');

const EmployeeLogSchema = new mongoose.Schema({
  employeeId: String,
  timestamp: { type: Date, default: Date.now },
  status: String,
});

module.exports = mongoose.model('EmployeeLog', EmployeeLogSchema);
