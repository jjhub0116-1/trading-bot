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
}

async function registerAccount(name, email, password) {
  try {
    const User = require('../models/User'); // Local require to avoid circular issues if any
    const existing = await User.findOne({ email });
    if (existing) return 'Email already in use';

    // Generate a simple unique user_id based on count
    const count = await User.countDocuments();
    const nextId = count + 101; // Start at 101 to avoid test user collisions

    const hashedPassword = await require('bcryptjs').hash(password, 12);

    const newUser = await User.create({
      user_id: nextId,
      user_name: name,
      email: email,
      password: hashedPassword,
      equity: 5000,      // Default 5000 shares limit
      loss_limit: 500    // Default $500 loss limit
    });

    return newUser;
  } catch (err) {
    console.error('Registration error:', err);
    return 'Registration failed';
  }
}

module.exports = { authenticate, registerAccount };