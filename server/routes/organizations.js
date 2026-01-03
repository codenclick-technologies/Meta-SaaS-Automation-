const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const auth = require('../middleware/auth');

// GET /organizations/me
router.get('/me', auth, async (req, res) => {
    try {
        const org = await Organization.findById(req.user.organizationId);
        res.json(org);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// PUT /organizations/me
router.put('/me', auth, async (req, res) => {
    try {
        const { settings, compliance } = req.body;
        const org = await Organization.findByIdAndUpdate(
            req.user.organizationId,
            { $set: { settings, compliance } },
            { new: true }
        );
        res.json(org);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
