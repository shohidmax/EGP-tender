const mongoose = require('mongoose');
const Tender = require('./models/Tender');
require('dotenv').config();

const URI = process.env.MONGODB_URI || "mongodb://localhost:27017/egp_tenders";

async function checkStatus() {
    try {
        await mongoose.connect(URI);
        const count = await Tender.countDocuments({ status: { $exists: true } });
        const liveCount = await Tender.countDocuments({ status: 'Live' });
        const sample = await Tender.findOne({ status: 'Live' });

        console.log(`Total Tenders with Status: ${count}`);
        console.log(`Total 'Live' Tenders: ${liveCount}`);
        if (sample) console.log('Sample Status:', sample.status, 'Nature:', sample.detailed_procurementNature);

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}
checkStatus();
