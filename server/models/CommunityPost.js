const mongoose = require('mongoose');

const communityPostSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, default: 'Sub-Contract' }, // Sub-Contract, Joint Venture, Material Supply
    contactInfo: { type: String, required: true }, // Phone or Email
    status: { type: String, default: 'Open' }, // Open, Closed
    deadline: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('CommunityPost', communityPostSchema);
