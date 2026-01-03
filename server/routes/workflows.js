const express = require('express');
const router = express.Router();
const {
    getWorkflows,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    getWorkflowLogs
} = require('../controllers/workflowController');

// Workflow CRUD
router.get('/', getWorkflows);
router.post('/', createWorkflow);
router.put('/:id', updateWorkflow);
router.delete('/:id', deleteWorkflow);

// Logs
router.get('/logs', getWorkflowLogs);

module.exports = router;