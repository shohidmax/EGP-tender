const mongoose = require('mongoose');
require('dotenv').config();
const Tender = require('./models/Tender');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        const count = await Tender.countDocuments();
        console.log(`Total tenders: ${count}`);
        const pending = await Tender.countDocuments({ detailed_full_scraping_complete: { $ne: true } });
        console.log(`Pending details: ${pending}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
