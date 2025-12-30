const twilio = require('twilio');
const Settings = require('../models/Settings');

exports.sendSMS = async (lead, message) => {
    try {
        const settings = await Settings.getSettings();

        if (!settings.twilioSid || !settings.twilioAuthToken || !settings.twilioPhone) {
            console.log('SMS Skipped: Twilio credentials missing.');
            return { status: 'skipped', error: 'No Credentials' };
        }

        const client = twilio(settings.twilioSid, settings.twilioAuthToken);

        // Logic: Agar manual message nahi hai, to Settings se Template use karein
        // aur {name} ko lead ke naam se replace karein.
        let smsBody = message;

        if (!smsBody) {
            // Default template agar settings me kuch save nahi hai
            const companyName = settings.companyName || "Meta Automation";
            const template = settings.smsTemplate || `Hello {name}, Thanks for your inquiry at ${companyName}! We have sent the details to your email.`;
            smsBody = template.replace(/{name}/g, lead.name);
        }

        await client.messages.create({
            body: smsBody,
            from: settings.twilioPhone,
            to: lead.phone
        });

        console.log(`SMS sent to ${lead.phone}`);
        return { status: 'sent', body: smsBody };
    } catch (error) {
        console.error('Twilio SMS Error:', error.message);
        return { status: 'failed', error: error.message };
    }
};