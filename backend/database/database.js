const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { buscarCapaJogo } = require('../services/capaService');

// Caminho do banco de dados
const DB_PATH = path.join(__dirname, 'launcherpro.db');

let db = null;

/**
 * Inicializa a conexão com o banco de dados SQLite
 * @returns {Promise} Promise que resolve quando o banco está pronto
 */
function initDatabase() {
  return new Promise((resolve, reject) => {
    // Criar ou conectar ao banco de dados
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Erro ao conectar ao banco de dados:', err);
        reject(err);
        return;
      }
      console.log('✅ Conectado ao banco de dados SQLite');
      
      // Criar tabelas
      createTables()
        .then(() => {
          console.log('✅ Tabelas criadas/verificadas com sucesso');
          // Garantir que a tabela biblioteca existe (para bancos antigos)
          ensureBibliotecaTable()
            .then(() => {
              // Inserir dados de exemplo
              insertSampleData()
                .then(() => {
                  console.log('✅ Dados de exemplo inseridos');
                  resolve();
                })
                .catch(reject);
            })
            .catch(reject);
        })
        .catch(reject);
    });
  });
}

/**
 * Garante que a tabela biblioteca existe (para bancos criados antes da adição desta tabela)
 */
function ensureBibliotecaTable() {
  return new Promise((resolve, reject) => {
    const createBibliotecaTable = `
      CREATE TABLE IF NOT EXISTS biblioteca (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jogo_id INTEGER NOT NULL,
        conta_id INTEGER,
        data_adicao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (jogo_id) REFERENCES jogos(id),
        FOREIGN KEY (conta_id) REFERENCES contas(id),
        UNIQUE(jogo_id, conta_id)
      )
    `;
    
    db.run(createBibliotecaTable, (err) => {
      if (err) {
        console.error('❌ Erro ao criar tabela biblioteca:', err);
        reject(err);
        return;
      }
      console.log('✅ Tabela biblioteca verificada/criada');
      resolve();
    });
  });
}

/**
 * Cria as tabelas do banco de dados se elas não existirem
 * @returns {Promise}
 */
function createTables() {
  return new Promise((resolve, reject) => {
    // Tabela de jogos
    const createJogosTable = `
      CREATE TABLE IF NOT EXISTS jogos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        descricao TEXT,
        preco REAL NOT NULL,
        capa TEXT
      )
    `;
    
    // Tabela de contas
    const createContasTable = `
      CREATE TABLE IF NOT EXISTS contas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jogo_id INTEGER NOT NULL,
        usuario TEXT NOT NULL,
        senha TEXT NOT NULL,
        status TEXT DEFAULT 'disponivel',
        FOREIGN KEY (jogo_id) REFERENCES jogos(id)
      )
    `;
    
    // Tabela de sincronizações (histórico)
    const createSincronizacoesTable = `
      CREATE TABLE IF NOT EXISTS sincronizacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_hora TEXT NOT NULL,
        tipo TEXT NOT NULL,
        jogos_encontrados INTEGER DEFAULT 0,
        jogos_adicionados INTEGER DEFAULT 0,
        jogos_atualizados INTEGER DEFAULT 0,
        contas_adicionadas INTEGER DEFAULT 0,
        status TEXT DEFAULT 'sucesso',
        mensagem TEXT
      )
    `;
    
    // Tabela de biblioteca (jogos adicionados pelo usuário)
    const createBibliotecaTable = `
      CREATE TABLE IF NOT EXISTS biblioteca (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jogo_id INTEGER NOT NULL,
        conta_id INTEGER,
        data_adicao TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (jogo_id) REFERENCES jogos(id),
        FOREIGN KEY (conta_id) REFERENCES contas(id),
        UNIQUE(jogo_id, conta_id)
      )
    `;
    
    // Tabela de usuários
    const createUsuariosTable = `
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        tipo TEXT DEFAULT 'cliente',
        dias_mensalidade INTEGER DEFAULT 30,
        data_vencimento TEXT,
        ativo INTEGER DEFAULT 1,
        data_criacao TEXT DEFAULT CURRENT_TIMESTAMP,
        ultimo_token TEXT,
        ultimo_login TEXT
      )
    `;
    
    db.serialize(() => {
      db.run(createJogosTable, (err) => {
        if (err) {
          reject(err);
          return;
        }
      });
      
      db.run(createContasTable, (err) => {
        if (err) {
          reject(err);
          return;
        }
      });
      
      db.run(createSincronizacoesTable, (err) => {
        if (err) {
          reject(err);
          return;
        }
      });
      
      db.run(createBibliotecaTable, (err) => {
        if (err) {
          reject(err);
          return;
        }
      });
      
      db.run(createUsuariosTable, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Adicionar colunas se não existirem (para bancos antigos)
        db.run('ALTER TABLE usuarios ADD COLUMN ultimo_token TEXT', (alterErr) => {
          // Ignorar erro se a coluna já existir
        });
        db.run('ALTER TABLE usuarios ADD COLUMN ultimo_login TEXT', (alterErr) => {
          // Ignorar erro se a coluna já existir
          resolve();
        });
      });
    });
  });
}

/**
 * Insere dados de exemplo no banco de dados
 * @returns {Promise}
 */
function insertSampleData() {
  return new Promise((resolve, reject) => {
    // Verificar se já existem jogos
    db.get('SELECT COUNT(*) as count FROM jogos', (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Se já houver dados, não inserir novamente
      if (row.count > 0) {
        resolve();
        return;
      }
      
      // Tentar carregar jogos do arquivo JSON de inicialização
      const jogosIniciaisPath = path.join(__dirname, '../data/jogos-iniciais.json');
      let jogos = [];
      
      try {
        if (fs.existsSync(jogosIniciaisPath)) {
          console.log('📦 Carregando jogos iniciais do arquivo JSON...');
          const dadosJson = fs.readFileSync(jogosIniciaisPath, 'utf8');
          const dadosExportados = JSON.parse(dadosJson);
          
          if (dadosExportados.jogos && Array.isArray(dadosExportados.jogos)) {
            jogos = dadosExportados.jogos;
            console.log(`✅ Carregados ${jogos.length} jogos do arquivo de inicialização`);
          } else {
            throw new Error('Formato inválido no arquivo JSON');
          }
        } else {
          console.log('⚠️  Arquivo jogos-iniciais.json não encontrado, usando jogos de exemplo padrão');
        }
      } catch (jsonErr) {
        console.log('⚠️  Erro ao carregar jogos-iniciais.json, usando jogos de exemplo padrão:', jsonErr.message);
      }
      
      // Se não conseguiu carregar do JSON, usar jogos de exemplo padrão
      if (jogos.length === 0) {
        jogos = [
          {
            nome: 'The Witcher 3: Wild Hunt',
            descricao: 'Uma aventura épica de RPG em mundo aberto onde você é Geralt de Rivia, um caçador de monstros.',
            preco: 79.99,
            capa: null
          },
          {
            nome: 'Cyberpunk 2077',
            descricao: 'Um RPG de ação e aventura ambientado em Night City, uma megalópole obcecada por poder, glamour e modificações corporais.',
            preco: 149.99,
            capa: null
          },
          {
            nome: 'Grand Theft Auto V',
            descricao: 'Explore o mundo de Los Santos e Blaine County nesta versão completa do GTA V com gráficos aprimorados.',
            preco: 89.99,
            capa: null
          },
          {
            nome: 'Red Dead Redemption 2',
            descricao: 'Viva a história épica de Arthur Morgan e a gangue Van der Linde enquanto eles fogem através de uma América hostil.',
            preco: 199.99,
            capa: null
          }
        ];
        console.log(`📋 Usando ${jogos.length} jogos de exemplo padrão`);
      }
      
      // Função para inserir jogos
      async function inserirJogos() {
        const stmt = db.prepare('INSERT INTO jogos (nome, descricao, preco, capa) VALUES (?, ?, ?, ?)');
        let inseridos = 0;
        
        for (const jogo of jogos) {
          try {
            // Se já tem capa no JSON, usar ela. Senão, buscar automaticamente
            let capa = jogo.capa || null;
            
            if (!capa) {
              // Buscar capa apenas se não tiver no JSON (para não sobrecarregar na primeira inicialização)
              try {
                console.log(`🔍 Buscando capa para: ${jogo.nome}...`);
                capa = await buscarCapaJogo(jogo.nome);
                if (capa) {
                  console.log(`✅ Capa encontrada para: ${jogo.nome}`);
                }
              } catch (err) {
                // Ignorar erro de busca de capa e continuar
              }
            }
            
            stmt.run([jogo.nome || '', jogo.descricao || '', jogo.preco || 0, capa]);
            inseridos++;
            
            // Log a cada 100 jogos para não sobrecarregar console
            if (inseridos % 100 === 0) {
              console.log(`📊 Inseridos ${inseridos}/${jogos.length} jogos...`);
            }
            
            // Aguardar um pouco entre requisições se estiver buscando capas
            if (!jogo.capa) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          } catch (err) {
            console.error(`❌ Erro ao inserir ${jogo.nome}:`, err.message);
            // Continuar mesmo com erro
          }
        }
        
        stmt.finalize((err) => {
          if (err) {
            reject(err);
            return;
          }
          
          console.log(`✅ ${inseridos} jogos inseridos com sucesso!`);
          // Não inserir contas de exemplo - serão adicionadas via sincronização
          resolve();
        });
      }
      
      // Executar inserção assíncrona
      inserirJogos().catch(reject);
    });
  });
}

/**
 * Retorna a instância do banco de dados
 * @returns {sqlite3.Database}
 */
function getDatabase() {
  if (!db) {
    throw new Error('Banco de dados não foi inicializado. Chame initDatabase() primeiro.');
  }
  return db;
}

module.exports = {
  initDatabase,
  getDatabase
};

