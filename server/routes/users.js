const express = require('express');
const router = express.Router();
const { createUser, getUsers, deleteUser } = require('../controllers/userController');
const auth = require('../middleware/auth');

// All user routes are protected and require a valid token
router.use(auth);

// @route   GET /users/team or /users
// @desc    Get all users in the organization
// @access  Private (All roles)
router.get('/', getUsers);
router.get('/team', getUsers);

// @route   POST /api/users
// @desc    Create a new user in the organization
// @access  Private (Admin only)
router.post('/', createUser);

// @route   DELETE /api/users/:id
// @desc    Delete a user from the organization
// @access  Private (Admin only)
router.delete('/:id', deleteUser);

module.exports = router;