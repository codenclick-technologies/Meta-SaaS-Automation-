const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    setPin,
    verifyPin,
    generateWebAuthnRegistration,
    verifyWebAuthnRegistration,
    generateWebAuthnLogin,
    verifyWebAuthnLogin,
    forgotPin,
    resetPin,
    adminUnlockUser,
    getSecurityStatus,
    unbindDevice,
    killUserSession,
    addWhitelistedIP,
    removeWhitelistedIP,
    whitelistCurrentSessionIP
} = require('../controllers/securityController');

// PIN & Device Binding
router.post('/pin/set', auth, setPin);
router.post('/pin/verify', verifyPin); // Public endpoint (uses email/deviceId)
router.post('/pin/forgot', forgotPin);
router.post('/pin/reset', resetPin);

// Biometrics
router.get('/webauthn/register/options', auth, generateWebAuthnRegistration);
router.post('/webauthn/register/verify', auth, verifyWebAuthnRegistration);
router.post('/admin/unlock', auth, adminUnlockUser); // Admin only middleware should be added in server.js or here

// Biometric Login (Public)
router.post('/webauthn/login/options', generateWebAuthnLogin);
router.post('/webauthn/login/verify', verifyWebAuthnLogin);

// Status & Management
router.get('/status', auth, getSecurityStatus);
router.post('/device/unbind', auth, unbindDevice);

// Threat Response
router.post('/session/kill', auth, killUserSession);

// Whitelist IPs
router.post('/whitelist/add', auth, addWhitelistedIP);
router.post('/whitelist/remove', auth, removeWhitelistedIP);
router.post('/whitelist/current', auth, whitelistCurrentSessionIP);

module.exports = router;