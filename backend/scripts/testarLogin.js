/**
 * Script para testar login e verificar senha
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

const bcrypt = require('bcryptjs');
const { initDatabase, getDatabase } = require('../database/database');

async function testarLogin() {
  const email = 'ailtonbergnovo@gmail.com';
  const senha = 'amelanegomes';

  console.log('');
  console.log('=== TESTE DE LOGIN ===');
  console.log('');
  console.log(`Email: ${email}`);
  console.log(`Senha: ${senha}`);
  console.log('');

  try {
    await initDatabase();
    const db = getDatabase();

    // Buscar usuário
    await new Promise((resolve, reject) => {
      db.get('SELECT * FROM usuarios WHERE email = ?', [email], async (err, usuario) => {
        if (err) {
          console.error('❌ Erro ao buscar usuário:', err.message);
          reject(err);
          return;
        }

        if (!usuario) {
          console.error('❌ Usuário não encontrado!');
          console.log('');
          console.log('Verifique se o email está correto.');
          reject(new Error('Usuário não encontrado'));
          return;
        }

        console.log('✅ Usuário encontrado:');
        console.log(`   ID: ${usuario.id}`);
        console.log(`   Nome: ${usuario.nome}`);
        console.log(`   Email: ${usuario.email}`);
        console.log(`   Tipo: ${usuario.tipo}`);
        console.log(`   Ativo: ${usuario.ativo}`);
        console.log(`   Senha hash (primeiros 30 chars): ${usuario.senha.substring(0, 30)}...`);
        console.log('');

        // Verificar senha
        console.log('🔐 Verificando senha...');
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        
        if (senhaValida) {
          console.log('✅ Senha CORRETA!');
          console.log('');
          console.log('O login deve funcionar.');
        } else {
          console.log('❌ Senha INCORRETA!');
          console.log('');
          console.log('Possíveis causas:');
          console.log('1. A senha foi digitada errada');
          console.log('2. A senha foi criptografada de forma diferente');
          console.log('3. Há espaços extras na senha');
          console.log('');
          console.log('Vou recriar o usuário com a senha correta...');
          
          // Recriar usuário com senha correta
          const senhaHash = await bcrypt.hash(senha, 10);
          const dataVencimento = new Date();
          dataVencimento.setDate(dataVencimento.getDate() + 30);
          
          db.run(
            'UPDATE usuarios SET senha = ?, data_vencimento = ? WHERE id = ?',
            [senhaHash, dataVencimento.toISOString(), usuario.id],
            async function(err) {
              if (err) {
                console.error('❌ Erro ao atualizar senha:', err.message);
                reject(err);
                return;
              }
              
              console.log('✅ Senha atualizada com sucesso!');
              console.log('');
              console.log('Tente fazer login novamente.');
              resolve();
            }
          );
          return;
        }

        if (db.pool) {
          await db.pool.end();
        }
        resolve();
      });
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

testarLogin();








