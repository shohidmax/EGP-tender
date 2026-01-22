const express = require('express');
const router = express.Router();
const Tender = require('../models/Tender');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_this';

// Middleware to optionally get user (for view) or require user (for actions)
const getUser = (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
};

const requireAuth = (req, res, next) => {
    const user = getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    next();
};

const Comment = require('../models/Comment');

// GET MY COMMENTS (Placed before generic /:id routes)
router.get('/comments/my', requireAuth, async (req, res) => {
    try {
        const comments = await Comment.find({ user: req.user.id })
            .sort({ createdAt: -1 });
        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET ALL TENDERS
router.get('/', async (req, res) => {
    try {
        const { search, type } = req.query;
        let query = {};

        if (type && type !== 'All') {
            query['$or'] = [
                { detailed_procurementNature: type },
                { dtl_procurement_nature: type }
            ];
        }

        if (search) {
            query['$or'] = [
                { reference: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
                { ministry: { $regex: search, $options: 'i' } },
                { dtl_district: { $regex: search, $options: 'i' } },
                { dtl_procuring_entity_name: { $regex: search, $options: 'i' } }
            ];
        }

        const tenders = await Tender.find(query)
            .sort({ createdAt: -1 })
            .limit(1000)
            .lean(); // Convert to plain JS objects

        // If user is logged in, we could mark which ones they liked/pinned here, 
        // OR let frontend handle it by fetching user profile. 
        // Frontend handling is usually more efficient for large lists.

        res.json(tenders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// GET SINGLE TENDER
router.get('/:id', async (req, res) => {
    try {
        const tender = await Tender.findOne({ tenderId: req.params.id }).lean();
        if (!tender) return res.status(404).json({ error: 'Tender not found' });
        res.json(tender);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// LIKE / UNLIKE TENDER
router.put('/:id/like', requireAuth, async (req, res) => {
    try {
        const tender = await Tender.findOne({ tenderId: req.params.id });
        if (!tender) return res.status(404).json({ error: 'Tender not found' });

        const userId = req.user.id;
        const index = tender.likes.indexOf(userId);

        if (index === -1) {
            tender.likes.push(userId);
        } else {
            tender.likes.splice(index, 1);
        }

        await tender.save();
        res.json(tender.likes);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// PIN / UNPIN TENDER (User Action)
router.put('/:id/pin', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const tenderId = req.params.id; // We use the string ID (e.g. 12345)

        const index = user.pins.indexOf(tenderId);
        if (index === -1) {
            user.pins.push(tenderId);
        } else {
            user.pins.splice(index, 1);
        }

        await user.save();
        res.json(user.pins);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET COMMENTS FOR A TENDER
router.get('/:id/comments', async (req, res) => {
    try {
        const comments = await Comment.find({ tenderId: req.params.id })
            .populate('user', 'name avatar')
            .sort({ createdAt: -1 });
        res.json(comments);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST COMMENT
router.post('/:id/comments', requireAuth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Text required' });

        const comment = new Comment({
            user: req.user.id,
            tenderId: req.params.id,
            text
        });

        const saved = await comment.save();
        // Populate user for immediate display
        await saved.populate('user', 'name avatar');

        res.json(saved);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
