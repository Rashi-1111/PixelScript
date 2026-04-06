const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
    room: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    canvasState: {
        type: String,
        default: ''
    },
    chat: [{
        sender: {
            type: String,
            trim: true,
            default: 'Collaborator'
        },
        message: {
            type: String,
            required: true,
            trim: true
        },
        sentAt: {
            type: Date,
            default: Date.now
        }
    }],
    assets: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        url: {
            type: String,
            required: true
        },
        type: {
            type: String,
            default: 'application/octet-stream'
        },
        uploadedBy: {
            type: String,
            trim: true,
            default: 'Collaborator'
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Workspace', workspaceSchema);
