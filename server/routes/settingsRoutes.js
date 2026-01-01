const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, verifySendGrid, verifyMeta } = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, admin, getSettings)
    .put(protect, admin, updateSettings);

router.post('/verify-email', protect, admin, verifySendGrid);
router.post('/verify-whatsapp', protect, admin, verifyMeta);

module.exports = router;