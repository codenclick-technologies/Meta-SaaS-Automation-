const axios = require('axios');

// Using the correct webhook route defined in server.js: app.use('/webhook', ...)
const API_URL = 'http://localhost:4000/webhook';

const sampleLeads = [
    { name: 'Aditi Sharma', email: 'aditi.sharma@corporate-tech.com', phone: '+919876543210', city: 'Delhi' },
    { name: 'John Smith', email: 'john.smith@gmail.com', phone: '+15550199888', city: 'New York' }, // Generic email
    { name: 'Rahul Verma', email: 'rahul.v@startup.io', phone: '+919988776655', city: 'Mumbai' },
    { name: 'Spam Bot', email: 'bot1234@spam.net', phone: '+0000000000', city: 'Unknown' }, // Should be low score
    { name: 'Sarah Connor', email: 'sarah@skynet.com', phone: '+442079460958', city: 'London' }
];

async function runTest() {
    console.log('🚀 Starting Smart Workflow Test Simulation...');

    // 1. Simulate Leads hitting the Webhook
    for (const lead of sampleLeads) {
        try {
            // Mimic Meta Webhook Payload Structure
            const payload = {
                object: 'page',
                entry: [{
                    changes: [{
                        field: 'leadgen',
                        value: {
                            leadgen_id: 'LEAD_' + Math.floor(Math.random() * 100000), // Required by controller
                            form_id: 'FORM_123456789', // Matches our mock Workflow Trigger
                            created_time: Math.floor(Date.now() / 1000),
                            field_data: [
                                { name: 'full_name', values: [lead.name] },
                                { name: 'email', values: [lead.email] },
                                { name: 'phone_number', values: [lead.phone] },
                                { name: 'city', values: [lead.city] }
                            ]
                        }
                    }]
                }]
            };

            await axios.post(API_URL, payload);
            console.log(`✅ Sent Lead: ${lead.name} (${lead.email})`);

            // Artificial delay to see logs clearly
            await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error(`❌ Failed to send ${lead.name}: `, error.code ? error.code : (error.response ? `${error.response.status} - ${error.response.data}` : error.message));
        }
    }

    console.log('\n✨ Simulation Complete. Check Server Logs for "Workflow Execution".');
}

runTest();
