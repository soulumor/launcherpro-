const bcrypt = require('bcryptjs');
const { initDatabase, getDatabase } = require('../database/database');

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

  // Obter instância do banco (funciona com SQLite e PostgreSQL)
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    console.log('✅ Conectado ao banco de dados');

    // Verificar se já existe um admin com este email
    db.get('SELECT id FROM usuarios WHERE email = ?', [email], async (err, existingUser) => {
      if (err) {
        console.error('❌ Erro ao verificar email:', err);
        if (db.pool) {
          await db.pool.end();
        }
        reject(err);
        return;
      }

      if (existingUser) {
        console.log('⚠️ Já existe um usuário com este email!');
        if (db.pool) {
          await db.pool.end();
        }
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
        async function(err) {
          if (err) {
            console.error('❌ Erro ao criar admin:', err);
            if (db.pool) {
              await db.pool.end();
            }
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
          
          if (db.pool) {
            await db.pool.end();
          }
          resolve();
        }
      );
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

