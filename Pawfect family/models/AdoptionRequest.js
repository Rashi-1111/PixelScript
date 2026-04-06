const mongoose = require('mongoose');

const AdoptionRequestSchema = new mongoose.Schema({
    petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
    petName: { type: String, required: true },
    applicantName: { type: String, required: true },
    applicantEmail: { type: String, required: true },
    applicantPhone: { type: String, required: true },
    applicantAddress: { type: String, required: true },
    experience: { type: String },
    message: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdoptionRequest', AdoptionRequestSchema);