const express = require('express');
const router = express.Router();
const { getCampaigns, syncCampaigns } = require('../controllers/campaignController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', getCampaigns);
router.post('/sync', syncCampaigns);

module.exports = router;