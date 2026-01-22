const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const User = require('./models/User');
require('dotenv').config();

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne();
    if (user) {
        console.log('Seeding notification for user:', user.email);
        await Notification.create({
            userId: user._id,
            type: 'NEW_TENDER',
            title: 'Test Notification 🚀',
            message: 'This is a test alert to verify the system.',
            relatedId: '123456',
            createdAt: new Date()
        });
        console.log('Done');
    } else {
        console.log('No user found');
    }
    process.exit(0);
})();
