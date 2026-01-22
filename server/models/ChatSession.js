const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tenderId: { type: String, required: true },
    messages: [{
        role: { type: String, enum: ['user', 'ai'], required: true },
        text: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

// Index for fast lookup by user+tender
chatSessionSchema.index({ userId: 1, tenderId: 1 });

module.exports = mongoose.model('ChatSession', chatSessionSchema);
