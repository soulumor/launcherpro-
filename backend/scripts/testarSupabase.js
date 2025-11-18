/**
 * Script para testar conexão e funcionalidades do Supabase
 */

// Carregar variáveis de ambiente
try {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim();
      }
    });
  }
} catch (err) {
  // Ignorar erros
}

const { initDatabase, getDatabase } = require('../database/database');

async function testarSupabase() {
  console.log('');
  console.log('=== TESTE DE CONEXÃO SUPABASE ===');
  console.log('');

  try {
    // 1. Testar inicialização
    console.log('1️⃣ Testando inicialização do banco...');
    await initDatabase();
    console.log('✅ Banco inicializado com sucesso!');
    console.log('');

    // 2. Testar conexão
    console.log('2️⃣ Testando conexão...');
    const db = getDatabase();
    console.log('✅ Conexão obtida com sucesso!');
    console.log('');

    // 3. Testar SELECT
    console.log('3️⃣ Testando SELECT (verificar tabelas)...');
    await new Promise((resolve, reject) => {
      db.all('SELECT COUNT(*) as count FROM jogos', [], (err, rows) => {
        if (err) {
          console.error('❌ Erro ao fazer SELECT:', err.message);
          reject(err);
          return;
        }
        console.log(`✅ SELECT funcionou! Encontrados ${rows[0].count} jogos`);
        resolve();
      });
    });
    console.log('');

    // 4. Testar INSERT
    console.log('4️⃣ Testando INSERT...');
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO jogos (nome, descricao, preco) VALUES (?, ?, ?)',
        ['Teste Supabase', 'Jogo de teste para verificar conexão', 0.01],
        function(err) {
          if (err) {
            console.error('❌ Erro ao fazer INSERT:', err.message);
            reject(err);
            return;
          }
          console.log(`✅ INSERT funcionou! ID criado: ${this.lastID}`);
          
          // 5. Testar SELECT do registro inserido
          db.get('SELECT * FROM jogos WHERE id = ?', [this.lastID], (err, row) => {
            if (err) {
              console.error('❌ Erro ao buscar registro inserido:', err.message);
              reject(err);
              return;
            }
            console.log('✅ SELECT do registro inserido funcionou!');
            console.log(`   Nome: ${row.nome}`);
            console.log(`   ID: ${row.id}`);
            
            // 6. Limpar teste (DELETE)
            db.run('DELETE FROM jogos WHERE id = ?', [this.lastID], (err) => {
              if (err) {
                console.log('⚠️  Aviso: Não foi possível deletar registro de teste:', err.message);
              } else {
                console.log('✅ DELETE funcionou! Registro de teste removido');
              }
              resolve();
            });
          });
        }
      );
    });
    console.log('');

    // 7. Testar todas as tabelas
    console.log('5️⃣ Verificando todas as tabelas...');
    const tabelas = ['jogos', 'contas', 'usuarios', 'biblioteca', 'sincronizacoes'];
    
    for (const tabela of tabelas) {
      await new Promise((resolve, reject) => {
        db.all(`SELECT COUNT(*) as count FROM ${tabela}`, [], (err, rows) => {
          if (err) {
            console.error(`❌ Erro ao verificar tabela ${tabela}:`, err.message);
            reject(err);
            return;
          }
          console.log(`✅ Tabela ${tabela}: ${rows[0].count} registros`);
          resolve();
        });
      });
    }
    console.log('');

    // 8. Verificar tipo de banco
    console.log('6️⃣ Verificando tipo de banco...');
    if (process.env.DATABASE_URL) {
      console.log('✅ Usando PostgreSQL (Supabase)');
      const urlMasked = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
      console.log(`   DATABASE_URL: ${urlMasked}`);
    } else {
      console.log('⚠️  Usando SQLite (DATABASE_URL não encontrada)');
    }
    console.log('');

    console.log('=== ✅ TODOS OS TESTES PASSARAM! ===');
    console.log('');
    console.log('🎉 Supabase está funcionando perfeitamente!');
    console.log('');

    // Fechar conexão se for PostgreSQL
    if (db.pool) {
      await db.pool.end();
      console.log('✅ Conexão fechada');
    }

    process.exit(0);
  } catch (err) {
    console.error('');
    console.error('=== ❌ ERRO NOS TESTES ===');
    console.error('');
    console.error('Erro:', err.message);
    console.error('Stack:', err.stack);
    console.error('');
    console.error('Verifique:');
    console.error('1. DATABASE_URL está configurada corretamente?');
    console.error('2. A senha está correta?');
    console.error('3. O projeto Supabase está ativo?');
    console.error('4. A conexão de rede está funcionando?');
    console.error('');
    process.exit(1);
  }
}

testarSupabase();

