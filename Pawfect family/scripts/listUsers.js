const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/pawfect_family';

async function listUsers() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  const users = await User.find({}, 'name email role password').lean();
  console.log('Found', users.length, 'users');
  users.forEach(u => {
    console.log(`- ${u.name} <${u.email}> role=${u.role} passwordHash=${u.password ? u.password.substring(0,20) + '...' : 'N/A'}`);
  });
  await mongoose.disconnect();
}

listUsers().catch(err => {
  console.error(err);
  process.exit(1);
});
