const express = require('express');
const router = express.Router();
const bibliotecaController = require('../controllers/bibliotecaController');

// IMPORTANTE: Rotas mais específicas devem vir ANTES das genéricas

// Listar contas válidas de um jogo na biblioteca (específica - deve vir antes)
router.get('/jogo/:jogoId/contas', bibliotecaController.listarContasJogoBiblioteca);

// Verificar se um jogo está na biblioteca (específica - deve vir antes)
router.get('/verificar/:jogoId', bibliotecaController.verificarJogoBiblioteca);

// Remover jogo da biblioteca (remove todas as entradas do jogo) (específica - deve vir antes)
router.delete('/jogo/:jogoId', bibliotecaController.removerJogoBiblioteca);

// Listar todos os jogos na biblioteca (agrupados) (genérica - deve vir por último)
router.get('/', bibliotecaController.listarBiblioteca);

// Adicionar jogo à biblioteca
router.post('/', bibliotecaController.adicionarJogoBiblioteca);

module.exports = router;

