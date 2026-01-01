const express = require('express');
const router = express.Router();
const {
    register,
    login,
    forgotPassword,
    resetPassword,
    generate2FASecret,
    enable2FA,
    disable2FA,
    verify2FAToken,
    getMe,
    changePassword,
    updateProfile,
    getBiometricRegisterOptions,
    verifyBiometricRegister,
    getBiometricLoginOptions,
    verifyBiometricLogin,
    logout
} = require('../controllers/authController');
const auth = require('../middleware/auth');

// @route   POST /auth/register
// @desc    Register a new user and organization
// @access  Public
router.post('/register', register);

// @route   POST /auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', login);

// @route   POST /auth/2fa/verify
// @desc    Verify 2FA token during login
// @access  Public
router.post('/2fa/verify', verify2FAToken);

// @route   POST /auth/2fa/generate
// @desc    Generate a new 2FA secret for the logged-in user
// @access  Private
router.post('/2fa/generate', auth, generate2FASecret);

// @route   POST /auth/2fa/enable
// @desc    Enable 2FA for the logged-in user
// @access  Private
router.post('/2fa/enable', auth, enable2FA);

// @route   POST /auth/2fa/disable
// @desc    Disable 2FA for the logged-in user
// @access  Private
router.post('/2fa/disable', auth, disable2FA);

// @route   PUT /auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, changePassword);

// @route   POST /auth/forgotpassword
// @desc    Send password reset email
// @access  Public
router.post('/forgotpassword', forgotPassword);

// @route   PUT /auth/resetpassword/:resetToken
// @desc    Reset user password
// @access  Public
router.put('/resetpassword/:resetToken', resetPassword);

router.get('/me', auth, getMe);

// @route   PUT /auth/profile
// @desc    Update user profile data
// @access  Private
router.put('/profile', auth, updateProfile);

router.post('/logout', auth, logout);

// --- Biometric (WebAuthn) Routes ---
router.post('/biometric/register-options', auth, getBiometricRegisterOptions);
router.post('/biometric/register-verify', auth, verifyBiometricRegister);
router.post('/biometric/login-options', getBiometricLoginOptions);
router.post('/biometric/login-verify', verifyBiometricLogin);

module.exports = router;