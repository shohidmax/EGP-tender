const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true }, // Recipient
    type: { type: String, enum: ['NEW_TENDER', 'TENDER_UPDATE', 'SYSTEM'], default: 'NEW_TENDER' },
    title: { type: String, required: true },
    message: { type: String },
    relatedId: { type: String }, // e.g. tenderId
    isRead: { type: Boolean, default: false },
}, {
    timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
