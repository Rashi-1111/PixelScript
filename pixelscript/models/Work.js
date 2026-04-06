const mongoose = require('mongoose');

const workSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        default: '',
        trim: true,
        maxlength: 1000
    },
    fileData: {
        type: Buffer,
        required: true,
        validate: {
            validator: function(v) {
                return v && v.length > 0;
            },
            message: 'File data cannot be empty'
        }
    },
    mimeType: {
        type: String,
        required: true,
        enum: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
    },
    fileType: {
        type: String,
        required: true,
        enum: ['image', 'document']
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Create compound index for better query performance
workSchema.index({ user: 1, createdAt: -1 });

// Add a pre-save hook to validate file data and ensure fileType matches mimeType
workSchema.pre('save', function(next) {
    if (!this.fileData || this.fileData.length === 0) {
        next(new Error('File data is required'));
        return;
    }

    if (!this.mimeType) {
        next(new Error('MIME type is required'));
        return;
    }

    if (!this.fileType) {
        next(new Error('File type is required'));
        return;
    }

    // Validate that fileType matches mimeType
    const isImage = this.mimeType.startsWith('image/');
    if ((isImage && this.fileType !== 'image') || (!isImage && this.fileType !== 'document')) {
        next(new Error('File type does not match MIME type'));
        return;
    }

    next();
});

const Work = mongoose.model('Work', workSchema);

module.exports = Work; 