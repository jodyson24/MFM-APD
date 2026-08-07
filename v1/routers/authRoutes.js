const express = require('express');
const router = express.Router();
const { validate } = require('../../middlewares/validation');
const { loginSchema, setPasswordSchema } = require('../../lib/validationSchemas');
const { authLimiter } = require('../../middlewares/security');
const { login, setPassword, refreshToken, logout } = require('../controllers/authController');

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/set-password', validate(setPasswordSchema), setPassword);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

module.exports = router;