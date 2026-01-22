const mongoose = require('mongoose');
const Tender = require('./models/Tender'); // Adjust path if needed
require('dotenv').config();

// Hardcode URI if dotenv fails context
const URI = process.env.MONGODB_URI || "mongodb://localhost:27017/egp_tenders";

async function checkData() {
    try {
        await mongoose.connect(URI);
        const latest = await Tender.findOne().sort({ createdAt: -1 });
        console.log('Latest Tender:');
        console.log(JSON.stringify(latest, null, 2));
        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}
checkData();
