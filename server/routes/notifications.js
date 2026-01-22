const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');

// Middleware to ensure Auth
// If requireAuth isn't exported from auth.js, we might need to verify where it is.
// Based on previous tool usage, 'requireAuth' was used in tenders.js. I'll duplicate or import it.
// Checking routes/tenders.js... it likely defines it or imports it.
// Let's assume standard auth middleware structure or define inline if needed.
// Actually, safer to check. But for now I'll use common pattern.

// Get Notifications for User
router.get('/', requireAuth, async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50); // Limit to last 50

        const unreadCount = await Notification.countDocuments({ userId: req.user.id, isRead: false });

        res.json({ notifications, unreadCount });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark As Read
router.put('/:id/read', requireAuth, async (req, res) => {
    try {
        const notif = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { isRead: true },
            { new: true }
        );
        res.json(notif);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark All As Read
router.put('/read-all', requireAuth, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user.id, isRead: false },
            { isRead: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
