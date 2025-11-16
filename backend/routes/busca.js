const express = require('express');
const router = express.Router();
const buscaController = require('../controllers/buscaController');

/**
 * Rotas para busca e extração de credenciais
 */

// GET /api/busca?q=termo - Busca jogos no pokopow.com
router.get('/', buscaController.buscarJogos);

// GET /api/busca/credenciais?url=url_do_jogo - Extrai credenciais de uma URL
router.get('/credenciais', buscaController.extrairCredenciais);

module.exports = router;







