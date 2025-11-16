const express = require('express');
const router = express.Router();
const contasController = require('../controllers/contasController');

/**
 * Rotas para gerenciamento de contas
 */

// POST /api/contas - Adiciona uma nova conta
router.post('/', contasController.adicionarConta);

// POST /api/contas/testar - Testa uma conta específica
router.post('/testar', contasController.testarConta);

// POST /api/contas/testar/:contaId - Testa uma conta específica por ID
router.post('/testar/:contaId', contasController.testarContaPorId);

// POST /api/contas/testar-jogo/:jogoId - Testa contas de um jogo
router.post('/testar-jogo/:jogoId', contasController.testarContasJogo);

// POST /api/contas/atualizar-status - Atualiza status das contas
router.post('/atualizar-status', contasController.atualizarStatusContas);

// GET /api/contas/:jogoId - Lista contas de um jogo específico (deve ser a última)
router.get('/:jogoId', contasController.listarContasPorJogo);

module.exports = router;

