const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

// GET /settings - Fetch current configuration
router.get('/', async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// PUT /settings - Update configuration
router.put('/', async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        const updates = req.body;

        Object.keys(updates).forEach(key => {
            if (key !== '_id' && key !== 'createdAt' && key !== 'updatedAt') {
                settings[key] = updates[key];
            }
        });

        await settings.save();
        res.json({ success: true, settings });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;