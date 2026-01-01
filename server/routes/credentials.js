const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize, logAudit } = require('../middleware/security');
const ExternalCredential = require('../models/ExternalCredential');
const { encrypt, decrypt } = require('../utils/encryption');

// @route   GET /api/credentials
// @desc    Get all configured integrations (masked)
router.get('/', auth, authorize(['admin']), async (req, res) => {
    try {
        const credentials = await ExternalCredential.find({ organizationId: req.user.organizationId })
            .select('-encryptedValue'); // Exclude sensitive data by default

        // Return masked versions
        const safeCredentials = credentials.map(cred => ({
            _id: cred._id,
            provider: cred.provider,
            name: cred.name,
            isActive: cred.isActive,
            updatedAt: cred.updatedAt,
            metadata: cred.metadata
        }));

        res.json(safeCredentials);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/credentials
// @desc    Securely add/update a 3rd party credential
router.post('/', auth, authorize(['admin']), async (req, res) => {
    try {
        const { provider, name, value, metadata } = req.body;

        if (!value) return res.status(400).json({ message: 'Value is required' });

        // Check if exists to update
        let credential = await ExternalCredential.findOne({
            organizationId: req.user.organizationId,
            provider,
            name
        });

        const encryptedValue = encrypt(value);

        if (credential) {
            credential.encryptedValue = encryptedValue;
            credential.metadata = metadata;
            credential.isActive = true;
            await credential.save();
            await logAudit(req, 'CREDENTIAL_UPDATED', 'success', { provider, credentialId: credential._id });
        } else {
            credential = new ExternalCredential({
                organizationId: req.user.organizationId,
                provider,
                name,
                encryptedValue,
                metadata
            });
            await credential.save();
            await logAudit(req, 'CREDENTIAL_ADDED', 'success', { provider, credentialId: credential._id });
        }

        res.json({ message: 'Credential securely stored', id: credential._id });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE /api/credentials/:id
// @desc    Revoke a credential
router.delete('/:id', auth, authorize(['admin']), async (req, res) => {
    try {
        const credential = await ExternalCredential.findOne({
            _id: req.params.id,
            organizationId: req.user.organizationId
        });

        if (!credential) return res.status(404).json({ message: 'Credential not found' });

        await credential.deleteOne();
        await logAudit(req, 'CREDENTIAL_REVOKED', 'success', { provider: credential.provider, credentialId: credential._id });

        res.json({ message: 'Credential revoked' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
