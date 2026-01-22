const express = require('express');
const router = express.Router();
const CommunityPost = require('../models/CommunityPost');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_this';

// Middleware
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

// GET ALL POSTS
router.get('/', async (req, res) => {
    try {
        const posts = await CommunityPost.find()
            .populate('user', 'name avatar')
            .sort({ createdAt: -1 });
        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// CREATE POST
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title, description, category, contactInfo, deadline } = req.body;

        const post = new CommunityPost({
            user: req.user.id,
            title,
            description,
            category,
            contactInfo,
            deadline
        });

        await post.save();
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
