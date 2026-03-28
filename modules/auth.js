const User = require('../models/User');

async function authenticate(email, password) {
  try {
    const user = await User.findOne({ email, password });
    return user ? user : null;
  } catch (err) {
    return null;
  }
}

module.exports = { authenticate };