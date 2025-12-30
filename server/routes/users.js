const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../controllers/authController');

// All routes here should be protected and restricted to Admin ideally
// For now, protect check is base. Real RBAC check can be added middleware or inside controller.
router.post('/', protect, userController.createUser);
router.get('/team', protect, userController.getTeam);
router.delete('/:id', protect, userController.deleteUser);

module.exports = router;
