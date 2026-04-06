const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
    consumer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    story: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Story',
        required: true
    },
    chapter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Story.chapters' // Reference to specific chapter
    },
    purchaseType: {
        type: String,
        enum: ['chapter', 'full_story'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    paymentMethod: {
        type: String,
        default: 'stripe' // Or whatever payment processor you use
    },
    paymentId: {
        type: String,
        required: true
    },
    purchasedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to prevent duplicate purchases
purchaseSchema.index({ consumer: 1, story: 1, chapter: 1 }, { unique: true });

module.exports = mongoose.model('Purchase', purchaseSchema);