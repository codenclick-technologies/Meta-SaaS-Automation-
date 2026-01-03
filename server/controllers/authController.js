const User = require('../models/User');
const Organization = require('../models/Organization');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { sendResetEmail, sendSecurityAlert } = require('../services/emailService');
const { logAudit } = require('../middleware/security');
const intelligenceService = require('../services/intelligenceService');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const sessionService = require('../services/sessionService');

const generateTokenAndSession = async (user, req) => {
    const token = jwt.sign({ id: user._id, organizationId: user.organizationId }, config.jwtSecret, { expiresIn: '30d' });
    await sessionService.createSession(user, req, token);

    // Asynchronously send security alert email
    sendSecurityAlert(user, {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
    }).catch(err => logger.error('Alert Email Error', err));

    return token;
};

// POST /auth/2fa/generate
exports.generate2FASecret = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('+twoFactorSecret');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const secret = speakeasy.generateSecret({
            name: `MetaSaaS (${user.email})`,
        });

        user.twoFactorSecret = secret.base32;
        await user.save();

        qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) {
                logger.error('QR Code Generation Error', err);
                return res.status(500).json({ message: 'Could not generate QR code' });
            }
            res.json({
                secret: secret.base32,
                qrCodeUrl: data_url,
            });
        });
    } catch (error) {
        logger.error('2FA Secret Generation Error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /auth/2fa/enable
exports.enable2FA = async (req, res) => {
    const { token } = req.body;

    try {
        const user = await User.findById(req.user.id).select('+twoFactorSecret');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1
        });

        if (verified) {
            user.twoFactorEnabled = true;
            await user.save();
            res.json({ message: '2FA has been enabled successfully' });
        } else {
            res.status(400).json({ message: 'Invalid 2FA token' });
        }
    } catch (error) {
        logger.error('2FA Enable Error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /auth/2fa/disable
exports.disable2FA = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.twoFactorEnabled = false;
        user.twoFactorSecret = undefined; // Also clear the secret
        await user.save();

        res.json({ message: '2FA has been disabled' });
    } catch (error) {
        logger.error('2FA Disable Error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /auth/2fa/verify
exports.verify2FAToken = async (req, res) => {
    const { userId, token } = req.body;

    try {
        const user = await User.findById(userId).select('+twoFactorSecret');

        if (!user) {
            return res.status(401).json({ message: 'Invalid user or 2FA token' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token,
            window: 1,
        });

        if (verified) {
            // Token is valid, now issue the real JWT
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
                token: await generateTokenAndSession(user, req),
            });
        } else {
            res.status(401).json({ message: 'Invalid 2FA token' });
        }
    } catch (error) {
        logger.error('2FA Verify Error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /auth/register
exports.register = async (req, res) => {
    const { name, email, password, organizationName } = req.body;

    if (!name || !email || !password || !organizationName) {
        return res.status(400).json({ message: 'Please provide name, email, password, and organization name' });
    }

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User with that email already exists' });
        }

        let organization = await Organization.findOne({ name: organizationName });
        let userRole = 'sales'; // Default role for users joining an existing org

        if (!organization) {
            // If organization doesn't exist, create it
            organization = new Organization({ name: organizationName });
            await organization.save();
            userRole = 'admin'; // First user of an org is an admin
        }

        const user = await User.create({
            name,
            email,
            password, // Password will be hashed by the model's pre-save hook
            organizationId: organization._id,
            role: userRole,
        });

        // Add user to the organization's list of users
        organization.users.push(user._id);
        await organization.save();

        // Assign a Default Plan to the Organization (Free Tier / Starter)
        const Plan = require('../models/Plan');
        await Plan.create({
            name: 'Starter',
            price: 0,
            features: ['Basic Automation', 'Up to 5 Users', 'Email Support'],
            maxUsers: 5,
            organizationId: organization._id
        });

        // Find the created user to get the populated data
        const createdUser = await User.findById(user._id).select('-password');

        if (createdUser) {
            res.status(201).json({
                _id: createdUser._id,
                name: createdUser.name,
                email: createdUser.email,
                role: createdUser.role,
                organizationId: createdUser.organizationId,
                token: await generateTokenAndSession(createdUser, req),
            });
            await logAudit(req, 'USER_REGISTER', 'success', { userId: createdUser._id, organizationId: createdUser.organizationId });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        logger.error('Registration Error', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
};


// POST /auth/login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            // Check if 2FA is enabled for this user
            if (user.twoFactorEnabled) {
                // If 2FA is enabled, do not send token.
                // Signal to the frontend that a second factor is required.
                return res.status(200).json({
                    status: '2fa_required',
                    userId: user._id,
                    message: 'Please provide your 2FA token to complete login.',
                });
            }

            // Calculate Security Risk
            const riskScore = await intelligenceService.calculateLoginRisk(user, req);

            // If 2FA is not enabled, proceed with normal login and issue token
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
                riskScore, // Inform client of risk level
                token: await generateTokenAndSession(user, req)
            });
            await logAudit(req, 'USER_LOGIN', 'success', {
                userId: user._id,
                organizationId: user.organizationId,
                riskScore
            });
        } else {
            await logAudit(req, 'USER_LOGIN_FAILED', 'failure', { email });
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        logger.error('Login Error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /auth/forgotpassword
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            // We send a generic success message to prevent email enumeration
            logger.warn(`Password reset attempt for non-existent user: ${email}`);
            return res.status(200).json({ success: true, data: 'If a user with that email exists, a reset link has been sent.' });
        }

        const resetToken = user.getResetPasswordToken();

        await user.save({ validateBeforeSave: false });

        // IMPORTANT: Use your frontend URL here
        const resetUrl = `${config.frontendUrl || 'http://localhost:5173'}/reset-password/${resetToken}`;

        try {
            await sendResetEmail(user.email, resetUrl);
            res.status(200).json({ success: true, data: 'Email sent' });
        } catch (err) {
            logger.error('Failed to send password reset email', err);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
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

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Set new password
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        // Log the user in by sending back a new token
        res.json({
            success: true,
            _id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
            token: await generateTokenAndSession(user, req),
            message: 'Password reset successful'
        });

    } catch (error) {
        logger.error('Reset Password Error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// GET /auth/me
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        logger.error('GetMe Error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /auth/change-password
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!(await user.matchPassword(currentPassword))) {
            return res.status(401).json({ message: 'Incorrect current password' });
        }

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        logger.error('Change Password Error', error);
        res.status(500).json({ message: 'Server error' });
    }
};
// PUT /auth/profile
exports.updateProfile = async (req, res) => {
    const { name, email, profilePicture } = req.body;

    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (name) user.name = name;
        if (email) {
            // Check if email is already taken by another user
            const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
            if (emailExists) {
                return res.status(400).json({ message: 'Email is already in use' });
            }
            user.email = email;
        }
        if (profilePicture !== undefined) user.profilePicture = profilePicture;

        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            profilePicture: user.profilePicture
        });
    } catch (error) {
        logger.error('Update Profile Error', error);
        res.status(500).json({ message: 'Server error' });
    }
};
const securityService = require('../services/securityService');

// --- WEBAUTHN / BIOMETRICS ---

// Step 1: Registration Options
exports.getBiometricRegisterOptions = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const options = await securityService.getRegistrationOptions(user);
        res.json(options);
    } catch (error) {
        logger.error('WebAuthn Reg Options Error', error);
        res.status(500).json({ message: 'Security error' });
    }
};

// Step 2: Verify Registration
exports.verifyBiometricRegister = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const success = await securityService.verifyRegistration(user, req.body);
        if (success) {
            res.json({ message: 'Biometric device registered successfully' });
        } else {
            res.status(400).json({ message: 'Verification failed' });
        }
    } catch (error) {
        logger.error('WebAuthn Reg Verify Error', error);
        res.status(500).json({ message: 'Security error' });
    }
};

// Step 3: Login Options (Public)
exports.getBiometricLoginOptions = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user || user.authenticators.length === 0) {
            return res.status(404).json({ message: 'No biometric devices registered for this user' });
        }
        const options = await securityService.getAuthenticationOptions(user);
        res.json(options);
    } catch (error) {
        logger.error('WebAuthn Login Options Error', error);
        res.status(500).json({ message: 'Security error' });
    }
};

// Step 4: Verify Login (Public)
exports.verifyBiometricLogin = async (req, res) => {
    const { email, body } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const success = await securityService.verifyAuthentication(user, body);
        if (success) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
                token: await generateTokenAndSession(user, req)
            });
        } else {
            res.status(401).json({ message: 'Biometric verification failed' });
        }
    } catch (error) {
        logger.error('WebAuthn Login Verify Error', error);
        res.status(401).json({ message: error.message });
    }
};
// POST /auth/logout
exports.logout = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        await sessionService.revokeSession(token);
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        logger.error('Logout Error', error);
        res.status(500).json({ message: 'Server error' });
    }
};
