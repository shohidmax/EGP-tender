const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();
const Tender = require('./models/Tender');

const DATA_FILE = 'all_tenders_detailed.json';

(async () => {
    if (!fs.existsSync(DATA_FILE)) {
        console.error('No data file found to import.');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log(`Read ${data.length} entries from file.`);

    // Batch process
    const BATCH_SIZE = 500;
    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);

        const ops = batch.map(t => {
            // Ensure ID exists
            let tenderId = t.tenderId;
            if (!tenderId && t.reference) {
                const match = t.reference.match(/^(\d+),/);
                if (match) tenderId = match[1];
            }

            if (!tenderId && t.sNo) tenderId = "SNO_" + t.sNo; // Fallback

            if (!tenderId) return null;

            return {
                updateOne: {
                    filter: { tenderId: tenderId },
                    update: { $set: { ...t, tenderId } },
                    upsert: true
                }
            };
        }).filter(op => op !== null);

        if (ops.length > 0) {
            await Tender.bulkWrite(ops);
        }
        console.log(`Imported batch ${i} - ${i + ops.length}`);
    }

    console.log('Import complete.');
    process.exit(0);
})();
