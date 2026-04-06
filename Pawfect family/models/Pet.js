const mongoose = require('mongoose');

const PetSchema = new mongoose.Schema({
    name: { type: String, required: true },
    breed: { type: String, required: true },
    age: { type: Number, required: true },
    description: { type: String },
    image: { type: String }, // URL or path to image
    available: { type: Boolean, default: true },
    adoptionStatus: { type: String, enum: ['available', 'requested', 'adopted'], default: 'available' },
    approved: { type: Boolean, default: false }, // Admin approval required
    submittedBy: { type: String }, // Email or user ID who submitted
    submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Pet', PetSchema);