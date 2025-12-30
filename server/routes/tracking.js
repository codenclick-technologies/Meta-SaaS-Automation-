const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');

router.get('/email/:id', trackingController.trackEmailOpen);

module.exports = router;