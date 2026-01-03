const express = require('express');
const router = express.Router();
const { getIntegrations, addIntegration, deleteIntegration } = require('../controllers/integrationController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', getIntegrations);
router.post('/', addIntegration);
router.delete('/:id', deleteIntegration);

module.exports = router;
