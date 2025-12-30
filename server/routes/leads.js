const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { protect } = require('../controllers/authController');

router.get('/', protect, leadController.getLeads);
router.get('/:id', protect, leadController.getLeadById);
router.get('/:id/logs', protect, leadController.getLeadLogs);
router.post('/:id/retry-email', leadController.retryEmail);
router.post('/:id/retry-whatsapp', leadController.retryWhatsapp);
router.put('/:id/status', leadController.updateLeadStatus);
router.put('/:id/assign', protect, leadController.assignLead);
router.put('/:id/restore', protect, leadController.restoreLead);
router.put('/:id/spam', protect, leadController.markSpam);
router.delete('/:id', protect, leadController.deleteLead);
router.post('/delete-batch', protect, leadController.deleteLeads);

module.exports = router;
