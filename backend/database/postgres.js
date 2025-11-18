const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const { buscarCapaJogo } = require('../services/capaService');

let pool = null;

/**
 * Inicializa a conexão com o banco de dados PostgreSQL (Supabase)
 * @returns {Promise} Promise que resolve quando o banco está pronto
 */
function initDatabase() {
  return new Promise(async (resolve, reject) => {
    try {
      // Criar pool de conexões
      const connectionString = process.env.DATABASE_URL;
      
      if (!connectionString) {
        throw new Error('DATABASE_URL não está definida nas variáveis de ambiente');
      }

      pool = new Pool({
        connectionString: connectionString,
        ssl: connectionString.includes('supabase') || connectionString.includes('amazonaws') 
          ? { rejectUnauthorized: false } 
          : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
      
      // Log da URL (sem senha) para debug
      const urlMasked = connectionString.replace(/:[^:@]+@/, ':****@');
      console.log(`🔗 Tentando conectar: ${urlMasked}`);

      // Testar conexão
      const client = await pool.connect();
      console.log('✅ Conectado ao banco de dados PostgreSQL (Supabase)');
      client.release();

      // Criar tabelas
      await createTables();
      console.log('✅ Tabelas criadas/verificadas com sucesso');

      // Garantir que a tabela biblioteca existe
      await ensureBibliotecaTable();
      console.log('✅ Tabela biblioteca verificada/criada');

      // Inserir dados de exemplo
      await insertSampleData();
      console.log('✅ Dados de exemplo inseridos');

      resolve();
    } catch (err) {
      console.error('❌ Erro ao conectar ao banco de dados:', err);
      reject(err);
    }
  });
}

/**
 * Garante que a tabela biblioteca existe
 */
async function ensureBibliotecaTable() {
  const createBibliotecaTable = `
    CREATE TABLE IF NOT EXISTS biblioteca (
      id SERIAL PRIMARY KEY,
      jogo_id INTEGER NOT NULL,
      conta_id INTEGER,
      data_adicao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (jogo_id) REFERENCES jogos(id) ON DELETE CASCADE,
      FOREIGN KEY (conta_id) REFERENCES contas(id) ON DELETE CASCADE,
      UNIQUE(jogo_id, conta_id)
    )
  `;
  
  await pool.query(createBibliotecaTable);
}

/**
 * Cria as tabelas do banco de dados
 */
async function createTables() {
  const createJogosTable = `
    CREATE TABLE IF NOT EXISTS jogos (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      descricao TEXT,
      preco REAL NOT NULL,
      capa TEXT
    )
  `;
  
  const createContasTable = `
    CREATE TABLE IF NOT EXISTS contas (
      id SERIAL PRIMARY KEY,
      jogo_id INTEGER NOT NULL,
      usuario TEXT NOT NULL,
      senha TEXT NOT NULL,
      status TEXT DEFAULT 'disponivel',
      FOREIGN KEY (jogo_id) REFERENCES jogos(id) ON DELETE CASCADE
    )
  `;
  
  const createSincronizacoesTable = `
    CREATE TABLE IF NOT EXISTS sincronizacoes (
      id SERIAL PRIMARY KEY,
      data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      tipo TEXT NOT NULL,
      jogos_encontrados INTEGER DEFAULT 0,
      jogos_adicionados INTEGER DEFAULT 0,
      jogos_atualizados INTEGER DEFAULT 0,
      contas_adicionadas INTEGER DEFAULT 0,
      status TEXT DEFAULT 'sucesso',
      mensagem TEXT
    )
  `;
  
  const createBibliotecaTable = `
    CREATE TABLE IF NOT EXISTS biblioteca (
      id SERIAL PRIMARY KEY,
      jogo_id INTEGER NOT NULL,
      conta_id INTEGER,
      data_adicao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (jogo_id) REFERENCES jogos(id) ON DELETE CASCADE,
      FOREIGN KEY (conta_id) REFERENCES contas(id) ON DELETE CASCADE,
      UNIQUE(jogo_id, conta_id)
    )
  `;
  
  const createUsuariosTable = `
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      tipo TEXT DEFAULT 'cliente',
      dias_mensalidade INTEGER DEFAULT 30,
      data_vencimento TEXT,
      ativo INTEGER DEFAULT 1,
      data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ultimo_token TEXT,
      ultimo_login TEXT
    )
  `;
  
  await pool.query(createJogosTable);
  await pool.query(createContasTable);
  await pool.query(createSincronizacoesTable);
  await pool.query(createBibliotecaTable);
  await pool.query(createUsuariosTable);

  // Tentar adicionar colunas se não existirem
  try {
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='usuarios' AND column_name='ultimo_token') THEN
          ALTER TABLE usuarios ADD COLUMN ultimo_token TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='usuarios' AND column_name='ultimo_login') THEN
          ALTER TABLE usuarios ADD COLUMN ultimo_login TEXT;
        END IF;
      END $$;
    `);
  } catch (err) {
    // Ignorar erro
  }
}

/**
 * Insere dados de exemplo no banco de dados
 */
async function insertSampleData() {
  const result = await pool.query('SELECT COUNT(*) as count FROM jogos');
  const count = parseInt(result.rows[0].count);
  
  if (count > 0) {
    return;
  }
  
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
      }
    }
  } catch (jsonErr) {
    console.log('⚠️  Erro ao carregar jogos-iniciais.json:', jsonErr.message);
  }
  
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
  
  let inseridos = 0;
  for (const jogo of jogos) {
    try {
      let capa = jogo.capa || null;
      
      if (!capa) {
        try {
          console.log(`🔍 Buscando capa para: ${jogo.nome}...`);
          capa = await buscarCapaJogo(jogo.nome);
          if (capa) {
            console.log(`✅ Capa encontrada para: ${jogo.nome}`);
          }
        } catch (err) {
          // Ignorar erro
        }
      }
      
      await pool.query(
        'INSERT INTO jogos (nome, descricao, preco, capa) VALUES ($1, $2, $3, $4)',
        [jogo.nome || '', jogo.descricao || '', jogo.preco || 0, capa]
      );
      inseridos++;
      
      if (inseridos % 100 === 0) {
        console.log(`📊 Inseridos ${inseridos}/${jogos.length} jogos...`);
      }
      
      if (!jogo.capa) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (err) {
      console.error(`❌ Erro ao inserir ${jogo.nome}:`, err.message);
    }
  }
  
  console.log(`✅ ${inseridos} jogos inseridos com sucesso!`);
}

/**
 * Retorna wrapper compatível com SQLite
 */
function getDatabase() {
  if (!pool) {
    throw new Error('Banco de dados não foi inicializado. Chame initDatabase() primeiro.');
  }
  
  return {
    run: function(query, params, callback) {
      const convertedQuery = convertPlaceholders(query);
      const convertedParams = params || [];
      
      let finalQuery = convertedQuery;
      const isInsert = /^\s*INSERT\s+INTO/i.test(query.trim());
      
      if (isInsert && !query.includes('RETURNING')) {
        finalQuery = convertedQuery.replace(/;\s*$/, '') + ' RETURNING id';
      }
      
      pool.query(finalQuery, convertedParams)
        .then(result => {
          if (callback) {
            const lastID = result.rows[0]?.id || null;
            const context = { lastID };
            try {
              callback.call(context, null);
            } catch (err) {
              if (callback.length === 1) {
                callback(null);
              } else {
                callback(null, { lastID, changes: result.rowCount });
              }
            }
          }
        })
        .catch(err => {
          if (callback) {
            callback(err);
          }
        });
    },
    
    get: function(query, params, callback) {
      const convertedQuery = convertPlaceholders(query);
      const convertedParams = params || [];
      
      pool.query(convertedQuery, convertedParams)
        .then(result => {
          if (callback) {
            callback(null, result.rows[0] || null);
          }
        })
        .catch(err => {
          if (callback) {
            callback(err);
          }
        });
    },
    
    all: function(query, params, callback) {
      const convertedQuery = convertPlaceholders(query);
      const convertedParams = params || [];
      
      pool.query(convertedQuery, convertedParams)
        .then(result => {
          if (callback) {
            callback(null, result.rows || []);
          }
        })
        .catch(err => {
          if (callback) {
            callback(err);
          }
        });
    },
    
    prepare: function(query) {
      const convertedQuery = convertPlaceholders(query);
      const isInsert = /^\s*INSERT\s+INTO/i.test(query.trim());
      let finalQuery = convertedQuery;
      
      if (isInsert && !query.includes('RETURNING')) {
        finalQuery = convertedQuery.replace(/;\s*$/, '') + ' RETURNING id';
      }
      
      return {
        run: function(params, callback) {
          pool.query(finalQuery, params || [])
            .then(result => {
              if (callback) {
                const lastID = result.rows[0]?.id || null;
                const context = { lastID };
                try {
                  callback.call(context, null);
                } catch (err) {
                  callback(null);
                }
              }
            })
            .catch(err => {
              if (callback) {
                callback(err);
              }
            });
        },
        finalize: function(callback) {
          if (callback) {
            callback(null);
          }
        }
      };
    },
    
    serialize: function(callback) {
      if (callback) {
        callback();
      }
    },
    
    query: function(query, params) {
      const convertedQuery = convertPlaceholders(query);
      return pool.query(convertedQuery, params || []);
    },
    
    pool: pool
  };
}

/**
 * Converte placeholders SQLite (?) para PostgreSQL ($1, $2, etc.)
 */
function convertPlaceholders(query) {
  if (!query) return query;
  
  let paramIndex = 1;
  return query.replace(/\?/g, () => `$${paramIndex++}`);
}

module.exports = {
  initDatabase,
  getDatabase
};

