const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Todas as rotas de admin requerem autenticação e privilégios de admin
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/usuarios', adminController.listarUsuarios);
router.post('/usuarios', adminController.criarUsuario);
router.get('/usuarios/:id', adminController.detalhesUsuario);
router.put('/usuarios/:id', adminController.editarUsuario);
router.delete('/usuarios/:id', adminController.desativarUsuario);

module.exports = router;

