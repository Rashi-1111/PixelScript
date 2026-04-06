const mongoose = require('mongoose');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/pawfect_family';

async function setPassword(email, newPassword) {
  await mongoose.connect(MONGO);
  const hashed = await bcrypt.hash(newPassword, 10);
  const user = await User.findOneAndUpdate({ email }, { password: hashed }, { new: true });
  if (!user) {
    console.error('User not found:', email);
    process.exit(2);
  }
  console.log(`Updated password for ${user.email} (role=${user.role})`);
  await mongoose.disconnect();
}

const [,, email, newPassword] = process.argv;
if (!email || !newPassword) {
  console.error('Usage: node setPassword.js <email> <newPassword>');
  process.exit(1);
}

setPassword(email, newPassword).catch(err => {
  console.error(err);
  process.exit(1);
});
