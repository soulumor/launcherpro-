/**
 * Script para contar usuários no banco Supabase
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

const { Pool } = require('pg');

async function contarUsuarios() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não encontrada!');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Contar total
    const countResult = await pool.query('SELECT COUNT(*) as total FROM usuarios');
    const total = parseInt(countResult.rows[0].total);

    console.log('');
    console.log('=== USUÁRIOS NO BANCO SUPABASE ===');
    console.log('');
    console.log(`Total de usuários: ${total}`);
    console.log('');

    if (total > 0) {
      // Listar todos os usuários
      const usuariosResult = await pool.query(`
        SELECT id, nome, email, tipo, ativo, data_criacao 
        FROM usuarios 
        ORDER BY id
      `);

      console.log('Lista de usuários:');
      console.log('');
      usuariosResult.rows.forEach((u, index) => {
        const status = u.ativo === 1 ? '✅ Ativo' : '❌ Inativo';
        console.log(`${index + 1}. ID: ${u.id}`);
        console.log(`   Nome: ${u.nome}`);
        console.log(`   Email: ${u.email}`);
        console.log(`   Tipo: ${u.tipo}`);
        console.log(`   Status: ${status}`);
        console.log(`   Criado em: ${u.data_criacao || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  Nenhum usuário encontrado no banco.');
      console.log('');
      console.log('Para criar um usuário admin, use:');
      console.log('  node scripts/criarAdmin.js "Nome" email@exemplo.com senha');
      console.log('');
    }

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    await pool.end();
    process.exit(1);
  }
}

contarUsuarios();








