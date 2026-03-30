const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function authenticate(email, password) {
  try {
    const user = await User.findOne({ email });
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    return user;
  } catch (err) {
    console.error('Auth error:', err);
    return null;
  }
}

module.exports = { authenticate };