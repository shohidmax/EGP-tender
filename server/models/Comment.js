const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tenderId: { type: String, required: true }, // Linking to our custom tender ID
    text: { type: String, required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }, // For replies
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);
