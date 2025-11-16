const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimiter');

// Rotas públicas
router.post('/login', loginRateLimiter, authController.login);
router.post('/register', authController.register);

// Rota protegida
router.get('/me', authenticateToken, authController.getCurrentUser);

module.exports = router;

