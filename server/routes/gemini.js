const express = require('express');
const router = express.Router();
require('dotenv').config();

const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const ChatSession = require('../models/ChatSession');

router.post('/chat', requireAuth, async (req, res) => {
    try {
        const { message, tenderContext } = req.body;
        const tenderId = tenderContext.tenderId || tenderContext.reference?.match(/^(\d+)/)?.[1] || 'unknown';

        // Fetch User Preference
        const user = await User.findById(req.user.id).select('+geminiApiKey');
        const apiKey = (user && user.geminiApiKey) ? user.geminiApiKey : process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API Key not found (Set in Profile or Server Env).' });
        }

        const prompt = `You are an expert Procurement Consultant for the Bangladesh e-GP system.
        Analyze the following Tender Details and answer the user's question.
        
        TENDER CONTEXT:
        ${JSON.stringify(tenderContext, null, 2)}
        
        USER QUESTION: "${message}"
        
        Provide a helpful, professional, and concise answer. Highlight key requirements, dates, or risks if asked.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error('Gemini API Error:', data.error);
            return res.status(500).json({ error: data.error.message });
        }

        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "I could not generate an answer.";

        // Save to DB
        let chat = await ChatSession.findOne({ userId: req.user.id, tenderId });
        if (!chat) {
            chat = new ChatSession({ userId: req.user.id, tenderId, messages: [] });
        }
        chat.messages.push({ role: 'user', text: message });
        chat.messages.push({ role: 'ai', text: answer });
        await chat.save();

        res.json({ answer });

    } catch (error) {
        console.error('Gemini Route Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/gemini/history/:tenderId
router.get('/history/:tenderId', requireAuth, async (req, res) => {
    try {
        const { tenderId } = req.params;
        const chat = await ChatSession.findOne({ userId: req.user.id, tenderId });
        res.json(chat ? chat.messages : []);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
