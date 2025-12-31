const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { sendResetEmail } = require('../services/emailService');

// Helper: Validate Password Complexity
const validatePassword = (password) => {
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/\d/.test(password)) return 'Password must contain at least one number';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
    return null;
};

// @route   POST /auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        // Update last active timestamp
        user.lastActive = Date.now();
        await user.save();

        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            config.jwtSecret,
            { expiresIn: '5d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /auth/me
// @desc    Get logged in user
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await findUserOrAdmin(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Remove password from response
        const userObj = user.toObject();
        delete userObj.password;

        res.json(userObj);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ... (skip forgot/reset password routes as they are public and use email lookup which handles logic separately) ...

// @route   PUT /auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    try {
        const user = await findUserOrAdmin(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid current password' });
        }

        // Validate Password Complexity
        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            return res.status(400).json({ message: passwordError });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        await user.save();
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /auth/profile
// @desc    Update user profile (picture, name, email)
// @access  Private
router.put('/profile', auth, async (req, res) => {
    try {
        const user = await findUserOrAdmin(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (req.body.profilePicture !== undefined) {
            user.profilePicture = req.body.profilePicture;
        }
        if (req.body.name) {
            user.name = req.body.name;
        }
        if (req.body.email) {
            // Check if email is already taken by another user
            if (req.body.email !== user.email) {
                // Check both collections for duplicates
                const existingUser = await User.findOne({ email: req.body.email });
                const existingAdmin = await Admin.findOne({ email: req.body.email });

                if (existingUser || existingAdmin) {
                    return res.status(400).json({ message: 'Email already in use' });
                }
                user.email = req.body.email;
            }
        }

        await user.save();

        // Return updated user data
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            profilePicture: user.profilePicture
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;