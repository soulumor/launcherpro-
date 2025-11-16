const express = require('express');
const router = express.Router();
const jogosController = require('../controllers/jogosController');

/**
 * Rotas para gerenciamento de jogos
 * IMPORTANTE: Rotas específicas devem vir ANTES de rotas com parâmetros dinâmicos
 */

// GET /api/jogos - Lista todos os jogos
router.get('/', jogosController.listarJogos);

// POST /api/jogos - Adiciona um novo jogo
router.post('/', jogosController.adicionarJogo);

// GET /api/jogos/buscar?q=termo - Busca jogos no banco de dados (rota específica)
router.get('/buscar', jogosController.buscarJogosNoBanco);

// POST /api/jogos/sincronizar/:jogoId - Sincroniza um jogo específico com o site (rota específica)
router.post('/sincronizar/:jogoId', jogosController.sincronizarJogo);

// GET /api/jogos/:id - Busca um jogo específico (deve ser a última - rota genérica)
router.get('/:id', jogosController.buscarJogo);

module.exports = router;

