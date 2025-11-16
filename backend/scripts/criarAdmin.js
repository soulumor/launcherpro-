const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { initDatabase } = require('../database/database');

const DB_PATH = path.join(__dirname, '../database/launcherpro.db');

// Obter argumentos da linha de comando
const args = process.argv.slice(2);
const nome = args[0] || 'Admin';
const email = args[1] || 'admin@launcherpro.com';
const senha = args[2] || 'admin123';

async function criarAdmin() {
  // Primeiro, inicializar o banco de dados para garantir que as tabelas existam
  try {
    await initDatabase();
    console.log('✅ Banco de dados inicializado');
  } catch (err) {
    console.error('❌ Erro ao inicializar banco de dados:', err);
    throw err;
  }

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Erro ao conectar ao banco de dados:', err);
        reject(err);
        return;
      }

      console.log('✅ Conectado ao banco de dados');

      // Verificar se já existe um admin com este email
      db.get('SELECT id FROM usuarios WHERE email = ?', [email], async (err, existingUser) => {
        if (err) {
          console.error('❌ Erro ao verificar email:', err);
          db.close();
          reject(err);
          return;
        }

        if (existingUser) {
          console.log('⚠️ Já existe um usuário com este email!');
          db.close();
          resolve();
          return;
        }

        // Criptografar senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // Calcular data de vencimento (30 dias)
        const dataVencimento = new Date();
        dataVencimento.setDate(dataVencimento.getDate() + 30);

        // Inserir admin
        db.run(
          'INSERT INTO usuarios (nome, email, senha, tipo, dias_mensalidade, data_vencimento, ativo) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [nome, email, senhaHash, 'admin', 30, dataVencimento.toISOString(), 1],
          function(err) {
            if (err) {
              console.error('❌ Erro ao criar admin:', err);
              db.close();
              reject(err);
              return;
            }

            console.log('✅ Admin criado com sucesso!');
            console.log('');
            console.log('📋 Credenciais:');
            console.log(`   Email: ${email}`);
            console.log(`   Senha: ${senha}`);
            console.log('');
            console.log('⚠️ IMPORTANTE: Altere a senha após o primeiro login!');
            
            db.close();
            resolve();
          }
        );
      });
    });
  });
}

// Executar
criarAdmin()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Erro:', err);
    process.exit(1);
  });

