const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// GET /api/user/profile
router.get('/profile', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-passwordHash');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// PUT /api/user/pin/:tenderId
router.put('/pin/:tenderId', requireAuth, async (req, res) => {
    try {
        const { tenderId } = req.params;
        const user = await User.findById(req.user.id);

        if (!user.pins) user.pins = [];

        const index = user.pins.indexOf(tenderId);
        if (index === -1) {
            user.pins.push(tenderId);
        } else {
            user.pins.splice(index, 1);
        }

        await user.save();
        res.json({ message: 'Pin updated', pins: user.pins });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// PUT /api/user/gemini-key
router.put('/gemini-key', requireAuth, async (req, res) => {
    try {
        const { apiKey } = req.body;
        // Basic validation or encryption could go here
        await User.findByIdAndUpdate(req.user.id, { geminiApiKey: apiKey });
        res.json({ message: 'API Key updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
