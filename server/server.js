const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const Tender = require('./models/Tender');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
const authRoutes = require('./routes/auth');
const tenderRoutes = require('./routes/tenders');
const communityRoutes = require('./routes/community');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/tenders', tenderRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/user', userRoutes);
app.use('/api/gemini', require('./routes/gemini'));

// Scheduler (Every 10 Minutes)
const cron = require('node-cron');
const { scrapeAndNotify } = require('./services/scraperService');

// Schedule: Every 10 minutes
cron.schedule('*/10 * * * *', () => {
    console.log('[Scheduler] Triggering 10-minute scrape & update job...');
    scrapeAndNotify();
});

// Admin Route to manually trigger scrape
app.post('/api/admin/scrape-now', (req, res) => {
    scrapeAndNotify();
    res.send('Scraper triggered manually.');
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Open http://localhost:${PORT}/ in your browser to view the dashboard.`);

    // Run scraper on startup to ensure fresh data
    setTimeout(() => scrapeAndNotify(), 5000);
});
