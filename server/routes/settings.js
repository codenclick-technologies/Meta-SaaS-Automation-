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

// POST /settings/verify-openai
router.post('/verify-openai', async (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'API Key is required' });

    try {
        const OpenAI = require('openai'); // Dynamic require to prevent crash if missing
        const openai = new OpenAI({ apiKey });
        
        await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: "Test" }],
            max_tokens: 1
        });

        res.json({ success: true });
    } catch (error) {
        console.error('OpenAI Verification Error:', error.message);
        res.status(500).json({ error: error.message || 'Invalid API Key' });
    }
});

module.exports = router;