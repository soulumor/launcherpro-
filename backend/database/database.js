// Detectar se deve usar PostgreSQL (Supabase) ou SQLite
// Se DATABASE_URL estiver definida, usa PostgreSQL
// Caso contrário, usa SQLite (comportamento padrão)

// Verificar DATABASE_URL de forma mais robusta
const databaseUrl = process.env.DATABASE_URL || '';

// Log de debug
console.log('🔍 Verificando configuração do banco de dados...');
console.log(`   DATABASE_URL existe: ${!!process.env.DATABASE_URL}`);
if (process.env.DATABASE_URL) {
  const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
  console.log(`   DATABASE_URL: ${maskedUrl.substring(0, 80)}...`);
}

if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
  // Usar PostgreSQL (Supabase)
  console.log('✅ DATABASE_URL detectada, usando PostgreSQL (Supabase)');
  module.exports = require('./postgres');
} else {
  // Usar SQLite (código original)
  console.log('⚠️  DATABASE_URL não encontrada, usando SQLite');
  console.log('   Para usar Supabase, configure DATABASE_URL no Render (Environment Variables)');
  
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
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
      
      // Inserir jogos de exemplo (sem capas - serão buscadas automaticamente)
      const jogos = [
        {
          nome: 'The Witcher 3: Wild Hunt',
          descricao: 'Uma aventura épica de RPG em mundo aberto onde você é Geralt de Rivia, um caçador de monstros.',
          preco: 79.99
        },
        {
          nome: 'Cyberpunk 2077',
          descricao: 'Um RPG de ação e aventura ambientado em Night City, uma megalópole obcecada por poder, glamour e modificações corporais.',
          preco: 149.99
        },
        {
          nome: 'Grand Theft Auto V',
          descricao: 'Explore o mundo de Los Santos e Blaine County nesta versão completa do GTA V com gráficos aprimorados.',
          preco: 89.99
        },
        {
          nome: 'Red Dead Redemption 2',
          descricao: 'Viva a história épica de Arthur Morgan e a gangue Van der Linde enquanto eles fogem através de uma América hostil.',
          preco: 199.99
        }
      ];
      
      // Função para inserir jogos com busca automática de capas
      async function inserirJogosComCapas() {
        const stmt = db.prepare('INSERT INTO jogos (nome, descricao, preco, capa) VALUES (?, ?, ?, ?)');
        
        for (const jogo of jogos) {
          try {
            console.log(`🔍 Buscando capa para: ${jogo.nome}...`);
            const capa = await buscarCapaJogo(jogo.nome);
            
            if (capa) {
              console.log(`✅ Capa encontrada para: ${jogo.nome}`);
            } else {
              console.log(`⚠️ Capa não encontrada para: ${jogo.nome}, usando placeholder`);
            }
            
            stmt.run([jogo.nome, jogo.descricao, jogo.preco, capa || null]);
            
            // Aguardar um pouco entre requisições para não sobrecarregar
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (err) {
            console.error(`❌ Erro ao buscar capa para ${jogo.nome}:`, err.message);
            // Inserir mesmo sem capa
            stmt.run([jogo.nome, jogo.descricao, jogo.preco, null]);
          }
        }
        
        stmt.finalize((err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Inserir contas de exemplo para cada jogo
          db.all('SELECT id FROM jogos', (err, jogos) => {
            if (err || !jogos || jogos.length === 0) {
              resolve(); // Continuar mesmo sem contas
              return;
            }
            
            const contasStmt = db.prepare('INSERT INTO contas (jogo_id, usuario, senha, status) VALUES (?, ?, ?, ?)');
            
            // Adicionar 2 contas para cada jogo
            jogos.forEach((jogo, index) => {
              const contas = [
                { jogo_id: jogo.id, usuario: `player${jogo.id}_1`, senha: 'senha123', status: 'disponivel' },
                { jogo_id: jogo.id, usuario: `player${jogo.id}_2`, senha: 'senha456', status: 'disponivel' }
              ];
              
              contas.forEach((conta) => {
                contasStmt.run([conta.jogo_id, conta.usuario, conta.senha, conta.status]);
              });
            });
            
            contasStmt.finalize((err) => {
              if (err) {
                reject(err);
                return;
              }
              resolve();
            });
          });
        });
      }
      
      // Executar inserção assíncrona
      inserirJogosComCapas().catch(reject);
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

} // Fim do bloco else (SQLite)

