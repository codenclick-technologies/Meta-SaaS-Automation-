const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { sendResetEmail } = require('../services/emailService');

const generateToken = (id) => {
    return jwt.sign({ id }, config.jwtSecret, { expiresIn: '30d' });
};

// POST /auth/login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if it's the env-seeded super admin (immune to lockout for recovery)
        if (config.admin && email === config.admin.email && password === config.admin.password) {
            return res.json({
                _id: 'super-admin',
                email: email,
                token: generateToken('super-admin')
            });
        }

        // Check DB Admin
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check Lockout
        if (admin.isLocked) {
            admin.loginAttempts = 0; // Optional: reset attempts on lock expiry logic or keep incrementing? 
            // Logic: failed attempts > 5 sets lock for 1 hour.
            // If lockUntil > now, return 423 Locked
            return res.status(423).json({
                message: 'Account is temporarily locked due to too many failed attempts. Please try again later.'
            });
        }

        // Check Password
        if (await admin.matchPassword(password)) {
            // Success: Reset attempts
            admin.loginAttempts = 0;
            admin.lockUntil = undefined;
            await admin.save();

            res.json({
                _id: admin._id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
                token: generateToken(admin._id)
            });
        } else {
            // Fail: Increment attempts
            admin.loginAttempts += 1;

            // Lock if attempts >= 5
            if (admin.loginAttempts >= 5) {
                admin.lockUntil = Date.now() + 60 * 60 * 1000; // 1 Hour Lock
            }

            await admin.save();
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        logger.error('Login Error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Middleware to protect routes
exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, config.jwtSecret);

            // Simplified: just pass if token valid
            if (!decoded) throw new Error('Not authorized');

            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// POST /auth/forgotpassword
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(404).json({ message: 'Email could not be sent' });
        }

        const resetToken = admin.getResetPasswordToken();

        await admin.save({ validateBeforeSave: false });

        // Create Reset URL (Frontend URL)
        // Adjust port if client is on 5173
        const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

        try {
            await sendResetEmail(admin.email, resetUrl);
            res.status(200).json({ success: true, data: 'Email sent' });
        } catch (err) {
            admin.resetPasswordToken = undefined;
            admin.resetPasswordExpire = undefined;
            await admin.save({ validateBeforeSave: false });
            return res.status(500).json({ message: 'Email could not be sent' });
        }

    } catch (error) {
        logger.error('Forgot Password Error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /auth/resetpassword/:resetToken
exports.resetPassword = async (req, res) => {
    try {
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(req.params.resetToken)
            .digest('hex');

        const admin = await Admin.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!admin) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Set new password
        admin.password = req.body.password;
        admin.resetPasswordToken = undefined;
        admin.resetPasswordExpire = undefined;
        // Also unlock account if it was locked
        admin.loginAttempts = 0;
        admin.lockUntil = undefined;

        await admin.save();

        res.json({
            success: true,
            _id: admin._id,
            email: admin.email,
            token: generateToken(admin._id),
            message: 'Password reset successful'
        });

    } catch (error) {
        logger.error('Reset Password Error', error);
        res.status(500).json({ message: 'Server error' });
    }
};
