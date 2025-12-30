const axios = require('axios');
const Lead = require('../models/Lead');
const Settings = require('../models/Settings');
const emailService = require('./emailService');
const whatsappService = require('./whatsappService');
const smsService = require('./smsService');
const metaCapiService = require('./metaCapiService'); // Import CAPI

exports.processNewLead = async (leadgenId, io) => {
    try {
        const settings = await Settings.getSettings();

        if (!settings.metaAccessToken) {
            throw new Error('Cannot fetch lead details: Meta Access Token missing in Settings.');
        }

        // 1. Fetch Lead Details from Facebook Graph API
        const response = await axios.get(`https://graph.facebook.com/v19.0/${leadgenId}`, {
            params: { access_token: settings.metaAccessToken }
        });

        const fbLead = response.data;

        // Safety Check: Ensure field_data exists to prevent crashes
        if (!fbLead || !fbLead.field_data) {
            console.error('Invalid Lead Data received from Facebook:', JSON.stringify(fbLead));
            return;
        }

        // Idempotency Check: Prevent duplicate leads if Facebook retries webhook
        const existingLead = await Lead.findOne({ fb_lead_id: fbLead.id });
        if (existingLead) {
            console.log(`[Idempotency] Lead already processed: ${fbLead.id}`);
            return;
        }

        // 2. Map Facebook Fields to our Schema
        // Facebook returns data in a 'field_data' array: [{ name: 'email', values: ['...'] }]
        const getField = (names) => {
            if (!Array.isArray(names)) names = [names];
            const field = fbLead.field_data.find(f => names.includes(f.name));
            return field ? field.values[0] : null;
        };

        // Try common field names used in Lead Forms
        const name = getField(['full_name', 'name', 'first_name']) || 'Unknown';
        const email = getField(['email', 'email_address', 'work_email']) || '';
        const phone = getField(['phone_number', 'phone', 'contact_number']) || '';
        let formattedPhone = phone; // Database me save karne ke liye clean version

        // --- ADVANCED SCORING ALGORITHM (Professional & Robust) ---
        let score = 0;

        // 1. Name Validation & Scoring
        if (name && name !== 'Unknown') {
            score += 10; // Base score
            const cleanName = name.trim();
            // Check for full name (First Last)
            if (cleanName.indexOf(' ') > 0) score += 5;
            // Penalize numbers in name (likely fake)
            if (/\d/.test(cleanName)) score -= 20;
            // Penalize very short names
            if (cleanName.length < 3) score -= 10;
        }

        // 2. Phone Validation & Scoring
        if (phone) {
            score += 20; // Base score

            // FIX: Remove spaces, dashes, brackets. Keep only digits and '+'
            formattedPhone = phone.replace(/[^\d+]/g, '');

            const cleanPhone = phone.replace(/\D/g, '');
            // Valid length check (10-15 digits for international standards)
            if (cleanPhone.length >= 10 && cleanPhone.length <= 15) {
                score += 10;
            } else {
                score -= 10; // Invalid length
            }
            // Check for repeated digits (e.g., 9999999999) - likely fake
            if (/^(\d)\1+$/.test(cleanPhone)) {
                score -= 30;
            }
        }

        // 3. Email Analysis
        if (email) {
            score += 20; // Base score

            const emailParts = email.split('@');
            if (emailParts.length === 2) {
                const domain = emailParts[1].toLowerCase();
                const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'rediffmail.com'];

                if (genericDomains.includes(domain)) {
                    score += 5; // Standard personal email
                } else {
                    score += 35; // High value for corporate/business emails
                }
            }
        }

        // 4. Normalize Score (0-100)
        score = Math.min(Math.max(score, 0), 100);

        // 5. Determine Quality Label
        let quality = 'Low';
        if (score >= 80) quality = 'High';
        else if (score >= 50) quality = 'Medium';
        else if (score <= 20) quality = 'Spam';

        // 3. Create Lead in Database
        const newLead = new Lead({
            fb_lead_id: fbLead.id,
            form_id: fbLead.form_id,
            name,
            email,
            phone: formattedPhone, // Clean phone number save karein (Twilio ready)
            score,
            quality,
            status: 'New',
            emailStatus: 'pending',
            whatsappStatus: 'pending',
            smsStatus: 'pending'
        });

        await newLead.save();
        console.log(`New Lead Saved: ${name} (${email})`);

        // COST SAVING CHECK:
        // Agar lead 'Spam' hai (Score <= 20), to expensive SMS/WhatsApp mat bhejo.
        if (quality === 'Spam') {
            console.log(`[Cost Saver] Skipped automation for SPAM lead: ${name}`);
            return;
        }

        // 4. Trigger Automation (Parallel)
        const [emailRes, whatsappRes, smsRes, capiRes] = await Promise.all([
            emailService.sendWelcomeEmail(newLead),
            whatsappService.sendWelcomeMessage(newLead),
            smsService.sendSMS(newLead),
            metaCapiService.sendConversionEvent(newLead) // Send Event to FB Pixel
        ]);

        // 5. Update Statuses
        newLead.emailStatus = emailRes.status;
        newLead.whatsappStatus = whatsappRes.status;
        newLead.smsStatus = smsRes.status;

        // Add logs
        if (emailRes.error) newLead.logs.push({ channel: 'email', status: 'failed', response: { error: emailRes.error } });
        else newLead.logs.push({ channel: 'email', status: 'sent' });

        if (whatsappRes.error) newLead.logs.push({ channel: 'whatsapp', status: 'failed', response: { error: whatsappRes.error } });
        else newLead.logs.push({ channel: 'whatsapp', status: 'sent' });

        if (smsRes.error) newLead.logs.push({ channel: 'sms', status: 'failed', response: { error: smsRes.error } });
        else {
            newLead.logs.push({ channel: 'sms', status: 'sent' });
            newLead.messages.push({
                direction: 'outbound',
                type: 'sms',
                body: smsRes.body // Saved from smsService return
            });
        }

        await newLead.save();

        // 6. Real-time Dashboard Update
        if (io) {
            io.emit('new_lead', newLead);
        }

    } catch (error) {
        console.error('Lead Processing Error:', error.message);
        // We don't throw here to prevent crashing the webhook response
    }
};