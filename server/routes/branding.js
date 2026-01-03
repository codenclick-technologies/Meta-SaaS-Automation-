const dns = require('dns').promises;
const express = require('express');
const router = express.Router();
const Branding = require('../models/Branding');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/security');

// @route   GET /branding
// @desc    Get organization branding settings
router.get('/', auth, async (req, res) => {
    try {
        let branding = await Branding.findOne({ organizationId: req.user.organizationId });
        if (!branding) {
            // Return defaults if not set
            branding = new Branding({ organizationId: req.user.organizationId });
        }
        res.json(branding);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST /branding
// @desc    Update organization branding settings
router.post('/', auth, authorize(['admin']), async (req, res) => {
    try {
        let branding = await Branding.findOne({ organizationId: req.user.organizationId });

        if (branding) {
            branding = await Branding.findOneAndUpdate(
                { organizationId: req.user.organizationId },
                { $set: req.body },
                { new: true }
            );
        } else {
            branding = new Branding({
                ...req.body,
                organizationId: req.user.organizationId
            });
            await branding.save();
        }

        res.json(branding);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST /branding/verify-domain
// @desc    Verify DNS records for custom domain
router.post('/verify-domain', auth, authorize(['admin']), async (req, res) => {
    try {
        const branding = await Branding.findOne({ organizationId: req.user.organizationId });
        if (!branding || !branding.customDomain) {
            return res.status(400).json({ message: 'No custom domain configured' });
        }

        const domain = branding.customDomain;
        let verified = false;

        try {
            const cnames = await dns.resolveCname(domain);
            if (cnames.some(c => c.includes('proxy.metasaas.com'))) {
                verified = true;
            }
        } catch (e) {
            try {
                const addresses = await dns.resolve4(domain);
                if (addresses.includes('159.203.187.120')) {
                    verified = true;
                }
            } catch (aErr) { }
        }

        branding.dnsVerified = verified;
        branding.mappingStatus = verified ? 'verified' : 'failed';
        await branding.save();

        res.json({
            success: verified,
            domain: domain,
            status: branding.mappingStatus,
            message: verified ? 'Domain successfully mapped!' : 'DNS records not found or incorrect.'
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Public GET for login page (resolving by domain or orgId in query)
router.get('/public', async (req, res) => {
    try {
        const { domain, orgId } = req.query;
        let query = {};
        if (domain) query.customDomain = domain;
        if (orgId) query.organizationId = orgId;

        const branding = await Branding.findOne(query);
        res.json(branding || { companyName: 'Meta-SaaS' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
