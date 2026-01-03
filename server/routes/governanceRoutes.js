const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const {
    getRoles,
    createRole,
    assignRoleToUser
} = require('../controllers/governanceController');

// All governance routes are protected and require admin role
router.get('/roles', auth, authorize('admin'), getRoles);
router.post('/roles', auth, authorize('admin'), createRole);
router.put('/users/:userId/role', auth, authorize('admin'), assignRoleToUser);

module.exports = router;
