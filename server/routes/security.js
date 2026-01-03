const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { authorize, logAudit } = require('../middleware/security');
const ApiKey = require('../models/ApiKey');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');
const backupService = require('../services/backupService');

// @route   POST /security/backup/now
router.post('/backup/now', auth, authorize(['admin']), async (req, res) => {
    try {
        const result = await backupService.performFullBackup();
        if (result.success) {
            res.json({ message: 'Cloud backup successful', path: result.path });
        } else {
            res.status(500).json({ message: 'Backup failed', error: result.error });
        }
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

const reportingService = require('../services/reportingService');
const Role = require('../models/Role');

// @route   GET /security/reports/security
// @desc    Download Security Audit PDF
router.get('/reports/security', auth, authorize(['admin']), async (req, res) => {
    try {
        const pdfBuffer = await reportingService.generateSecurityReport(req.user.organizationId);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=security-report.pdf',
            'Content-Length': pdfBuffer.length
        });
        res.send(pdfBuffer);
    } catch (err) {
        console.error('PDF Gen Error:', err);
        res.status(500).send('Could not generate report');
    }
});

// @route   POST /security/roles
// @desc    Create a custom role
router.post('/roles', auth, authorize(['admin']), async (req, res) => {
    try {
        const role = new Role({
            ...req.body,
            organizationId: req.user.organizationId
        });
        await role.save();
        await logAudit(req, 'ROLE_CREATED', 'success', { roleName: role.name });
        res.json(role);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET /security/roles
// @desc    Get all roles
router.get('/roles', auth, authorize(['admin', 'manager']), async (req, res) => {
    try {
        const roles = await Role.find({ organizationId: req.user.organizationId });
        res.json(roles);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});
// @desc    Get organization audit logs
router.get('/audit-logs', auth, authorize(['admin', 'auditor']), async (req, res) => {
    try {
        const logs = await AuditLog.find({ organizationId: req.user.organizationId })
            .sort({ createdAt: -1 })
            .limit(100)
            .populate('userId', 'name email');
        res.json(logs);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   POST /security/api-keys
// @desc    Generate a new API key
router.post('/api-keys', auth, authorize(['admin']), async (req, res) => {
    try {
        const { name, role } = req.body;
        const keyData = ApiKey.generate(req.user.organizationId, name, role);

        const apiKey = new ApiKey({
            ...keyData,
            secret: 'MANAGED_IDENTITY' // Placeholder for enterprise secret management
        });

        await apiKey.save();
        await logAudit(req, 'API_KEY_CREATED', 'success', { keyName: name });

        res.json({
            message: 'API Key generated successfully. Please store it safely as it will not be shown again.',
            apiKey: keyData.rawKey, // Only shown once
            id: apiKey._id
        });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   GET /security/api-keys
// @desc    List active API keys (masked)
router.get('/api-keys', auth, authorize(['admin']), async (req, res) => {
    try {
        const keys = await ApiKey.find({ organizationId: req.user.organizationId, status: true })
            .select('name displayKey role lastUsed createdAt');
        res.json(keys);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
