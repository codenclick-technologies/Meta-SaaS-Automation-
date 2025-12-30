const sgMail = require('@sendgrid/mail');
const Settings = require('../models/Settings');

exports.sendWelcomeEmail = async (lead) => {
    try {
        const settings = await Settings.getSettings();

        if (!settings.sendgridApiKey) {
            console.log('Email skipped: No SendGrid API Key configured.');
            return { status: 'skipped', error: 'No API Key' };
        }

        sgMail.setApiKey(settings.sendgridApiKey);

        // Dynamic Content Replacement
        let body = settings.emailBody.replace(/{name}/g, lead.name || 'Customer');

        // Append Brochure if enabled
        if (settings.includeBrochure && settings.brochureUrl) {
            body += `\n\nDownload our brochure here: ${settings.brochureUrl}`;
        }

        // Compliance Footer
        const footer = `
        <br><br>
        <hr style="border:0; border-top:1px solid #eee;">
        <p style="font-size:12px; color:#888;">
            You received this email because you inquired about our services.<br>
            To stop receiving emails, please reply with "UNSUBSCRIBE".
        </p>`;

        // --- TRACKING PIXEL INJECTION ---
        // Ensure process.env.API_URL is set in your .env (e.g., https://api.yourdomain.com)
        const trackingUrl = `${process.env.API_URL || 'http://localhost:4000'}/tracking/email/${lead._id}`;
        const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
        const htmlBody = body.replace(/\n/g, '<br>') + footer + trackingPixel;
        // --------------------------------

        const msg = {
            to: lead.email,
            from: settings.emailFrom, // Must be verified in SendGrid
            subject: settings.emailSubject,
            text: body,
            html: htmlBody, // Send HTML to support tracking pixel
        };

        await sgMail.send(msg);
        console.log(`Email sent to ${lead.email}`);
        return { status: 'sent' };
    } catch (error) {
        console.error('SendGrid Error:', error.response?.body || error.message);
        return { status: 'failed', error: error.message };
    }
};

exports.sendTeamCredentials = async (user, password) => {
    try {
        const settings = await Settings.getSettings();
        if (!settings.sendgridApiKey) return;

        sgMail.setApiKey(settings.sendgridApiKey);

        const companyName = settings.companyName || 'Meta Automation';

        const msg = {
            to: user.email,
            from: settings.emailFrom,
            subject: `Your ${companyName} Login Credentials`,
            text: `Hello ${user.name},\n\nYou have been added to the ${companyName} Team.\n\nLogin URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}\nEmail: ${user.email}\nPassword: ${password}\n\nPlease login and change your password immediately.\n\nBest,\nAdmin Team`
        };

        await sgMail.send(msg);
        console.log(`Credentials sent to ${user.email}`);
    } catch (error) {
        console.error('SendGrid Credential Error:', error.message);
        // Don't throw, just log
    }
};

exports.sendResetEmail = async (email, resetUrl) => {
    try {
        const settings = await Settings.getSettings();
        if (!settings.sendgridApiKey) throw new Error('Email service not configured');

        sgMail.setApiKey(settings.sendgridApiKey);

        const msg = {
            to: email,
            from: settings.emailFrom,
            subject: 'Password Reset Request',
            html: `
                <h3>Password Reset Requested</h3>
                <p>Please click the link below to reset your password:</p>
                <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
                <p>If you did not request this, please ignore this email.</p>
            `
        };

        await sgMail.send(msg);
        console.log(`Reset email sent to ${email}`);
    } catch (error) {
        console.error('SendGrid Reset Error:', error.message);
        throw error;
    }
};