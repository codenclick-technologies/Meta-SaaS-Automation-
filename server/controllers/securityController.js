const UserSecurity = require('../models/UserSecurity');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const config = require('../config');
const axios = require('axios'); // For GeoIP lookup
const sessionService = require('../services/sessionService');
const AuditLog = require('../models/AuditLog');


// Configuration
const RP_NAME = 'Meta SaaS Enterprise';
const RP_ID = process.env.DOMAIN || 'localhost';
const ORIGIN = process.env.CLIENT_URL || 'http://localhost:5173';

// Email Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

/**
 * @desc    Set PIN with Device Binding
 */
exports.setPin = async (req, res) => {
    try {
        const { pin, deviceId } = req.body;
        if (!pin || pin.length < 4) return res.status(400).json({ error: 'PIN must be at least 4 digits' });

        const userId = req.user.id || req.user._id;
        let security = await UserSecurity.findOne({ user: userId });
        if (!security) security = new UserSecurity({ user: userId });

        const salt = await bcrypt.genSalt(10);
        security.pinHash = await bcrypt.hash(pin, salt);
        security.deviceId = deviceId; // Bind to this specific device
        security.pinLocked = false;
        security.pinAttempts = 0;
        security.lockoutUntil = undefined;
        security.lastFailedAttempt = undefined;

        await security.save();
        res.json({ success: true, message: 'Security PIN set and bound to this device.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error setting PIN' });
    }
};

/**
 * @desc    Verify PIN (Checks Device ID)
 */
exports.verifyPin = async (req, res) => {
    try {
        const { pin, deviceId } = req.body;
        // In a real flow, req.user might not be populated if this is a public login endpoint.
        // We assume the client sends a user identifier (like email) or we use a temporary session.
        // For this implementation, we assume the user is identified via a partial auth token or email in body.

        // If using email to find user:
        let userId = req.user?._id;
        if (!userId && req.body.email) {
            const user = await User.findOne({ email: req.body.email });
            if (user) userId = user._id;
        }

        if (!userId) {
            return res.status(401).json({ error: 'User not identified' });
        }
        const user = await User.findById(userId);
        if (!user) return res.status(401).json({ error: 'User not found' });

        const security = await UserSecurity.findOne({ user: userId });

        if (!security || !security.pinHash) {
            return res.status(400).json({ error: 'PIN not set up' });
        }

        // 1. Check Device Binding
        if (security.deviceId && security.deviceId !== deviceId) {
            return res.status(403).json({ error: 'Unrecognized device. Please login with password.' });
        }

        // Check Whitelisted IP
        const ip = req.ip || req.connection.remoteAddress;
        const isWhitelisted = security.whitelistedIPs && security.whitelistedIPs.includes(ip);

        // 2. Check Lockout
        if (!isWhitelisted && (security.pinLocked || (security.lockoutUntil && security.lockoutUntil > Date.now()))) {
            return res.status(403).json({
                error: 'Account locked due to too many failed attempts. Please reset your PIN using email OTP to regain access.'
            });
        }

        // 3. Verify PIN
        const isMatch = await bcrypt.compare(pin, security.pinHash);
        if (!isMatch) {
            security.pinAttempts += 1;
            security.lastFailedAttempt = Date.now();

            if (!isWhitelisted && security.pinAttempts >= 5) {
                security.pinLocked = true;
                // Lockout for 30 minutes (though the requirement implies a hard lock until reset)
                // We set a long lockout or just rely on pinLocked=true which requires reset
                security.lockoutUntil = Date.now() + 30 * 60 * 1000;

                // Notify Admin via Socket
                if (req.io) {
                    req.io.emit('admin_notification', {
                        type: 'critical',
                        title: 'Security Alert: Account Locked',
                        message: `User ${user.email} locked due to multiple failed PIN attempts from IP: ${req.ip}`,
                        timestamp: new Date()
                    });
                }
            }
            await security.save();

            return res.status(401).json({ error: `Invalid PIN. ${5 - security.pinAttempts} attempts remaining.` });
        }

        if (security.pinAttempts > 0) {
            security.pinAttempts = 0;
            await security.save();
        }
        security.lockoutUntil = undefined;
        security.lastFailedAttempt = undefined;

        // --- Threat Radar Logic ---
        let location = null;
        try {
            // Use a free GeoIP service. In production, use a paid, reliable one.
            const geoRes = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,city,lat,lon,query`);
            if (geoRes.data.status === 'success') {
                location = { city: geoRes.data.city, country: geoRes.data.country, lat: geoRes.data.lat, lon: geoRes.data.lon };
            }

            // Log successful login with location
            await new AuditLog({
                organizationId: user.organizationId,
                userId: user._id,
                action: 'USER_LOGIN',
                resource: 'AUTH',
                status: 'success',
                ipAddress: ip,
                location: location
            }).save();
        } catch (geoError) {
            console.error("GeoIP lookup failed:", geoError.message);
        }

        // Generate Token and create session
        const token = jwt.sign({ id: user._id, organizationId: user.organizationId }, config.jwtSecret, { expiresIn: '30d' });
        await sessionService.createSession(user, req, token);

        res.json({
            success: true,
            message: 'PIN Verified',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error verifying PIN' });
    }
};

// --- WebAuthn (Fingerprint) Logic ---

exports.generateWebAuthnRegistration = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });
        let security = await UserSecurity.findOne({ user: userId });
        if (!security) security = new UserSecurity({ user: userId });

        const options = await generateRegistrationOptions({
            rpName: RP_NAME,
            rpID: RP_ID,
            userID: user._id.toString(),
            userName: user.email,
            attestationType: 'none',
            authenticatorSelection: {
                authenticatorAttachment: 'platform', // Forces built-in fingerprint/FaceID
                userVerification: 'preferred',
                requireResidentKey: false
            },
        });

        security.currentChallenge = options.challenge;
        await security.save();
        res.json(options);
    } catch (error) {
        console.error('generateWebAuthnRegistration Error:', error);
        res.status(500).json({ error: 'Failed to generate options' });
    }
};

exports.verifyWebAuthnRegistration = async (req, res) => {
    try {
        const { response } = req.body;
        const userId = req.user.id || req.user._id;
        const security = await UserSecurity.findOne({ user: userId });

        const verification = await verifyRegistrationResponse({
            response,
            expectedChallenge: security.currentChallenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
        });

        if (verification.verified && verification.registrationInfo) {
            const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

            // Store as base64 strings
            const newAuthenticator = {
                credentialID: Buffer.from(credentialID).toString('base64'),
                credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64'),
                counter,
                transports: response.transports,
            };

            security.authenticators.push(newAuthenticator);
            security.currentChallenge = undefined;
            await security.save();
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Verification failed' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.generateWebAuthnLogin = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const security = await UserSecurity.findOne({ user: user._id });
        if (!security || security.authenticators.length === 0) {
            return res.status(404).json({ error: 'No biometric devices registered for this user' });
        }

        const options = await generateAuthenticationOptions({
            rpID: RP_ID,
            allowCredentials: security.authenticators.map(auth => ({
                id: Buffer.from(auth.credentialID, 'base64'),
                type: 'public-key',
                transports: auth.transports,
            })),
            userVerification: 'preferred',
        });

        security.currentChallenge = options.challenge;
        await security.save();

        res.json(options);
    } catch (error) {
        console.error('WebAuthn Login Options Error:', error);
        res.status(500).json({ error: 'Failed to generate login options' });
    }
};

exports.verifyWebAuthnLogin = async (req, res) => {
    try {
        const { email, response } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const security = await UserSecurity.findOne({ user: user._id });
        if (!security) return res.status(404).json({ error: 'Security profile not found' });

        const authenticator = security.authenticators.find(auth => auth.credentialID === response.id);
        if (!authenticator) return res.status(404).json({ error: 'Authenticator not found' });

        const verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge: security.currentChallenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            authenticator: {
                credentialID: Buffer.from(authenticator.credentialID, 'base64'),
                credentialPublicKey: Buffer.from(authenticator.credentialPublicKey, 'base64'),
                counter: authenticator.counter,
            },
        });

        if (verification.verified) {
            authenticator.counter = verification.authenticationInfo.newCounter;
            security.currentChallenge = undefined;
            await security.save();

            // Generate Token
            const token = jwt.sign({ id: user._id, organizationId: user.organizationId }, config.jwtSecret, { expiresIn: '30d' });
            await sessionService.createSession(user, req, token);

            res.json({
                success: true,
                token,
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    organizationId: user.organizationId
                }
            });
        } else {
            res.status(401).json({ error: 'Biometric verification failed' });
        }
    } catch (error) {
        console.error('WebAuthn Login Verify Error:', error);
        res.status(500).json({ error: 'Server Error during biometric login' });
    }
};


// --- Recovery & Admin ---

exports.forgotPin = async (req, res) => {
    try {
        let userId = req.user?.id || req.user?._id;
        if (!userId && req.body.email) {
            const user = await User.findOne({ email: req.body.email });
            if (user) userId = user._id;
        }

        if (!userId) return res.status(400).json({ error: 'User not identified' });

        const user = await User.findById(userId);
        const security = await UserSecurity.findOne({ user: userId });
        if (!security) return res.status(400).json({ error: 'Security profile not found' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = await bcrypt.genSalt(10);
        security.resetOtp = await bcrypt.hash(otp, salt);
        security.resetOtpExpires = Date.now() + 10 * 60 * 1000;
        await security.save();

        // Send Email (Mock if no creds)
        if (process.env.SMTP_USER) {
            await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: user.email,
                subject: 'PIN Reset OTP',
                text: `Your OTP is: ${otp}`
            });
        } else {
            console.log(`[DEV] OTP for ${user.email}: ${otp}`);
        }

        res.json({ success: true, message: 'OTP sent' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send OTP' });
    }
};

exports.resetPin = async (req, res) => {
    try {
        const { otp, newPin, deviceId, email } = req.body;

        let userId = req.user?.id || req.user?._id;
        if (!userId && email) {
            const user = await User.findOne({ email });
            if (user) userId = user._id;
        }

        if (!userId) return res.status(400).json({ error: 'User not identified' });

        const security = await UserSecurity.findOne({ user: userId });

        if (!security || !security.resetOtp || security.resetOtpExpires < Date.now()) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        const isMatch = await bcrypt.compare(otp, security.resetOtp);
        if (!isMatch) return res.status(400).json({ error: 'Invalid OTP' });

        const salt = await bcrypt.genSalt(10);
        security.pinHash = await bcrypt.hash(newPin, salt);
        security.deviceId = deviceId; // Re-bind to current device
        security.pinLocked = false;
        security.pinAttempts = 0;
        security.lockoutUntil = undefined;
        security.lastFailedAttempt = undefined;
        security.resetOtp = undefined;

        await security.save();
        res.json({ success: true, message: 'PIN reset successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

/**
 * @desc    Kill User Session (Force Logout)
 */
exports.killUserSession = async (req, res) => {
    try {
        const { userId } = req.body;
        // In a real implementation with Redis, you would delete the session key.
        // For JWT, we can't easily invalidate without a blacklist, but we can lock the account.

        await UserSecurity.findOneAndUpdate(
            { user: userId },
            { $set: { pinLocked: true, lockoutUntil: Date.now() + 24 * 60 * 60 * 1000 } } // Lock for 24 hours
        );

        // Emit socket event to force frontend logout if connected
        req.io.emit(`force_logout_${userId}`, { message: 'Session terminated by admin due to security risk.' });

        res.json({ success: true, message: 'User session terminated and account locked.' });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.adminUnlockUser = async (req, res) => {
    const { userId, clearDeviceBinding } = req.body;

    const updateOps = {
        $set: {
            pinLocked: false,
            pinAttempts: 0,
            lockoutUntil: null
        }
    };

    if (clearDeviceBinding) {
        updateOps.$unset = { deviceId: 1 };
    }

    await UserSecurity.findOneAndUpdate({ user: userId }, updateOps);
    res.json({ success: true, message: `User unlocked${clearDeviceBinding ? ' and device binding cleared' : ''}` });
};

/**
 * @desc    Add IP to Whitelist
 */
exports.addWhitelistedIP = async (req, res) => {
    try {
        const { ip } = req.body;
        if (!ip) return res.status(400).json({ error: 'IP address is required' });

        const userId = req.user.id || req.user._id;
        await UserSecurity.findOneAndUpdate(
            { user: userId },
            { $addToSet: { whitelistedIPs: ip } },
            { upsert: true }
        );

        res.json({ success: true, message: 'IP added to whitelist' });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

/**
 * @desc    Remove IP from Whitelist
 */
exports.removeWhitelistedIP = async (req, res) => {
    try {
        const { ip } = req.body;
        const userId = req.user.id || req.user._id;
        await UserSecurity.findOneAndUpdate(
            { user: userId },
            { $pull: { whitelistedIPs: ip } }
        );
        res.json({ success: true, message: 'IP removed from whitelist' });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

/**
 * @desc    Get Security Status (Device Binding & Last Login)
 */
exports.getSecurityStatus = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const security = await UserSecurity.findOne({ user: userId });
        const user = await User.findById(userId).select('lastActive');

        res.json({
            deviceId: security?.deviceId || null,
            lastActive: user?.lastActive,
            pinEnabled: !!security?.pinHash,
            biometricCount: security?.authenticators?.length || 0,
            whitelistedIPs: security?.whitelistedIPs || []
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};

/**
 * @desc    Unbind Device (User Action)
 */
exports.unbindDevice = async (req, res) => {
    try {
        await UserSecurity.findOneAndUpdate(
            { user: (req.user.id || req.user._id) },
            { $unset: { deviceId: 1 } }
        );
        res.json({ success: true, message: 'Device unbind successful' });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

/**
 * @desc    Whitelist Current Session IP (Called after 2FA)
 */
exports.whitelistCurrentSessionIP = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const ip = req.ip || req.connection.remoteAddress;

        await UserSecurity.findOneAndUpdate(
            { user: userId },
            { $addToSet: { whitelistedIPs: ip } },
            { upsert: true }
        );

        res.json({ success: true, message: 'Current IP whitelisted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server Error whitelisting IP' });
    }
};