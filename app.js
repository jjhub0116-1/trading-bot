const express = require('express');
require('dotenv').config();
const roleManagement = require('../role-management');

console.log('🔍 MONGO_URI:', process.env.MONGO_URI ? '✅ Loaded' : '❌ Not loaded');
console.log('🔍 JWT_SECRET:', process.env.JWT_SECRET ? '✅ Loaded' : '❌ Not loaded');

const app = express();

// Initialize the role management module
roleManagement(app, process.env.MONGO_URI, process.env.JWT_SECRET);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));