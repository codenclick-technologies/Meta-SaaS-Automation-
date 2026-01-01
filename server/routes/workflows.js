const express = require('express');
const router = express.Router();
const { getWorkflows, createWorkflow, updateWorkflow, deleteWorkflow } = require('../controllers/workflowController');
const { getWorkflowLogs, getWorkflowLogById } = require('../controllers/workflowLogController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', getWorkflows);
router.get('/logs', getWorkflowLogs);
router.get('/logs/:id', getWorkflowLogById);
router.post('/', createWorkflow);
router.put('/:id', updateWorkflow);
router.delete('/:id', deleteWorkflow);

module.exports = router;
