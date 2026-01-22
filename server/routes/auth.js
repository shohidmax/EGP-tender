const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_this';

// REGISTER
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields required' });
        }

        // Check exists
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const newUser = new User({
            name,
            email,
            passwordHash
        });

        const savedUser = await newUser.save();

        // Generate Token
        const token = jwt.sign({ id: savedUser._id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { id: savedUser._id, name: savedUser.name, email: savedUser.email } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'All fields required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET CURRENT USER (Protected)
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: 'No token' });

        const verified = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(verified.id).select('-passwordHash');

        res.json(user);
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// GOOGLE LOGIN
router.post('/google', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token required' });

        console.log('[Auth] Verifying Google Token:', token.substring(0, 15) + '...');

        // Verify Firebase ID Token via Identity Toolkit (Correct method for Firebase Auth)
        const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
        if (!FIREBASE_API_KEY) {
            console.error('FIREBASE_API_KEY is missing in environment variables.');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const googleRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: token })
        });
        const googleData = await googleRes.json();

        // Log response
        console.log('[Auth] Firebase Response:', JSON.stringify(googleData, null, 2));

        if (googleData.error || !googleData.users || googleData.users.length === 0) {
            console.error('[Auth] Token Validation Failed:', googleData);
            return res.status(400).json({ error: `Invalid Token: ${googleData.error?.message || 'Unknown Error'}` });
        }

        const firebaseUser = googleData.users[0];
        const email = firebaseUser.email;
        const name = firebaseUser.displayName || email.split('@')[0]; // Fallback if name missing
        const picture = firebaseUser.photoUrl;
        const googleId = firebaseUser.localId; // Using Firebase UID as the external ID

        let user = await User.findOne({ email });

        if (user) {
            // Mixed Data Validation: Link Google ID to existing account
            // If user logged in with password before, now they can use Google too
            if (!user.googleId) {
                user.googleId = googleId;
            }
            // Update avatar if it's the default one
            if (user.avatar && user.avatar.includes('blank-profile-picture')) {
                user.avatar = picture;
            }
            await user.save();
        } else {
            // Create new user
            user = new User({
                name,
                email,
                googleId,
                avatar: picture,
                passwordHash: '' // No password (can set later if needed)
            });
            await user.save();
        }

        const jwtToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token: jwtToken, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } });

    } catch (err) {
        console.error('Google Auth Error:', err);
        res.status(500).json({ error: 'Server error during Google Auth' });
    }
});

module.exports = router;
