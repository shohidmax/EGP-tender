const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String }, // Optional for Google Auth users
    avatar: { type: String, default: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png' },

    // Interactions
    favorites: [{ type: String }], // Array of Tender IDs (or MongoDB _ids if we prefer)
    pins: [{ type: String }],      // Array of Tender IDs

    googleId: { type: String, sparse: true },
    geminiApiKey: { type: String, select: false },
    role: { type: String, default: 'user' }, // user, admin
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
