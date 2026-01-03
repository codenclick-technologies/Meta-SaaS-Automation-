const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Lead = require('./models/Lead');
const Organization = require('./models/Organization');

dotenv.config();

const createTestLead = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Find the default organization to associate the lead with
        const organization = await Organization.findOne({ name: 'Default Organization' });
        if (!organization) {
            throw new Error(
                "Could not find 'Default Organization'. Please run the `seedAdmin.js` script first."
            );
        }
        console.log(`Found organization: ${organization.name}`);

        // Use the form ID that the seed script adds to the default org
        const testFormId = 'test_form_123';
        if (!organization.facebookFormIds.includes(testFormId)) {
            throw new Error(
                `The organization '${organization.name}' does not have the required test form ID '${testFormId}'. Please re-run seedAdmin.js.`
            );
        }

        const randomId = Math.floor(1000 + Math.random() * 9000);
        const names = ['Amit Patel', 'Priya Singh', 'Vikram Kumar', 'Anjali Devi', 'Sanjay Verma'];
        const randomName = names[Math.floor(Math.random() * names.length)];

        const testLead = new Lead({
            organizationId: organization._id, // ** CRITICAL FIX **
            fb_lead_id: `test_${Date.now()}`,
            name: `${randomName} #${randomId}`,
            email: `${randomName.split(' ')[0].toLowerCase()}.${randomId}@example.com`,
            phone: `+9198765${String(randomId).padStart(5, '0')}`,
            form_id: testFormId, // Use the org's valid form ID
            status: 'New',
            quality: 'Medium',
            score: 65,
            emailStatus: 'pending',
            whatsappStatus: 'pending'
        });

        await testLead.save();
        console.log('Test Lead Created Successfully!');
        console.log(JSON.stringify(testLead, null, 2));

        process.exit();
    } catch (error) {
        console.error('Error creating test lead:', error.message);
        process.exit(1);
    }
};

createTestLead();

