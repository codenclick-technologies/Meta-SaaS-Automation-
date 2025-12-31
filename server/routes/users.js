const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Lead = require('../models/Lead');
const { sendTeamCredentials } = require('../services/emailService');

// @route   GET /users/team
// @desc    Get all team members with server-side stats and search
// @access  Private (Admin)
router.get('/team', async (req, res) => {
    try {
        const { search } = req.query;
        const pipeline = [];

        // Server-side search
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            pipeline.push({
                $match: {
                    $or: [
                        { name: searchRegex },
                        { email: searchRegex }
                    ]
                }
            });
        }

        pipeline.push(
            {
                $lookup: {
                    from: 'leads',
                    localField: '_id',
                    foreignField: 'assignedTo',
                    as: 'leads'
                }
            },
            {
                $project: {
                    name: 1, email: 1, role: 1, profilePicture: 1, createdAt: 1, lastActive: 1,
                    assignedCount: { $size: '$leads' },
                    convertedCount: {
                        $size: {
                            $filter: {
                                input: '$leads',
                                as: 'lead',
                                cond: { $eq: ['$$lead.status', 'Converted'] }
                            }
                        }
                    }
                }
            },
            { $sort: { createdAt: -1 } }
        );

        const team = await User.aggregate(pipeline);

        res.json(team);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /users
// @desc    Create a new team member
// @access  Private (Admin)
router.post('/', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });
        user = new User({ name, email, password, role: role || 'sales' });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        await sendTeamCredentials(user, password);
        if (req.io) req.io.emit('team_updated');
        res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /users/:id
// @desc    Update a team member's details
// @access  Private (Admin)
router.put('/:id', async (req, res) => {
    const { name, role } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.name = name || user.name;
        user.role = role || user.role;
        await user.save();

        if (req.io) {
            req.io.emit('team_updated');
            req.io.emit('admin_notification', {
                type: 'success',
                title: 'User Updated',
                message: `Details for ${user.name} have been updated successfully.`,
                timestamp: new Date()
            });
        }
        res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch (err) {
        console.error(err.message);
        if (req.io) req.io.emit('admin_notification', {
            type: 'error',
            title: 'Update Failed',
            message: `Could not update user. Please try again.`
        });
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /users/:id
// @desc    Delete a team member
// @access  Private (Admin)
router.delete('/:id', async (req, res) => {
    try {
        if (req.params.id === req.user.id) return res.status(400).json({ message: 'Cannot delete yourself' });
        await User.findByIdAndDelete(req.params.id);
        await Lead.updateMany({ assignedTo: req.params.id }, { $unset: { assignedTo: "" } });
        if (req.io) req.io.emit('team_updated');
        res.json({ message: 'User removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;