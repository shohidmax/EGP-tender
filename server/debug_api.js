const mongoose = require('mongoose');
const Tender = require('./models/Tender');
require('dotenv').config();

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected DB');

        const tender = await Tender.findOne({});
        console.log('Found Tender:', tender.tenderId, tender._id);

        if (tender) {
            // Emulate fetch
            const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

            // We need a real token, but for 404 check, even without token it should be 401.
            // If it's 404, route is wrong or ID not found.

            console.log(`Testing URL: http://localhost:3000/api/tenders/${tender.tenderId}/like`);

            const res = await fetch(`http://localhost:3000/api/tenders/${tender.tenderId}/like`, { method: 'PUT' });
            console.log('Status:', res.status);
            if (res.status !== 404 && res.status !== 200) {
                const txt = await res.text();
                console.log('Body:', txt);
            }
        }
    } catch (e) {
        console.error(e);
    }
    process.exit();
})();
