const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Lead = require('./models/Lead');

dotenv.config();

const createTestLead = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const testLead = new Lead({
            fb_lead_id: 'test_' + Date.now(),
            name: 'Rahul Sharma',
            email: 'rahul.demo@example.com',
            phone: '+919876543210',
            form_id: 'test_form_123',
            status: 'New',
            emailStatus: 'sent',
            whatsappStatus: 'pending'
        });

        await testLead.save();
        console.log('Test Lead Created!');
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

createTestLead();
