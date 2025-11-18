/**
 * Script para criar admin no Render via API
 * 
 * Execute: node criar-admin-render.js
 */

// Usar axios para requisições HTTP
const axios = require('axios');

const BACKEND_URL = 'https://launcherpro.onrender.com';
const NOME = 'Admin';
const EMAIL = 'cursorsemanal@gmail.com';
const SENHA = '12345';

async function criarAdminNoRender() {
  console.log('\n🔧 Criando Admin no Render...\n');
  console.log(`📡 Backend: ${BACKEND_URL}`);
  console.log(`📧 Email: ${EMAIL}\n`);

  try {
    // Primeiro, tentar fazer login (se já existe)
    console.log('1️⃣ Verificando se admin já existe...');
    try {
      const loginResponse = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email: EMAIL,
        senha: SENHA
      });
      
      if (loginResponse.data.token) {
        console.log('✅ Admin já existe e senha está correta!');
        console.log('\n📋 Credenciais:');
        console.log(`   Email: ${EMAIL}`);
        console.log(`   Senha: ${SENHA}`);
        return;
      }
    } catch (loginError) {
      console.log('ℹ️ Admin não existe ou senha está incorreta, criando novo...\n');
    }

    // Tentar criar via rota de registro (se existir e for público)
    console.log('2️⃣ Tentando criar admin...');
    
    // Opção 1: Se houver rota de registro pública
    try {
      const registerResponse = await axios.post(`${BACKEND_URL}/api/auth/register`, {
        nome: NOME,
        email: EMAIL,
        senha: SENHA,
        tipo: 'admin'
      });
      
      console.log('✅ Admin criado com sucesso via API!');
      console.log('\n📋 Credenciais:');
      console.log(`   Email: ${EMAIL}`);
      console.log(`   Senha: ${SENHA}`);
      return;
    } catch (registerError) {
      if (registerError.response?.status === 400) {
        console.log('⚠️ Erro:', registerError.response.data.error);
      } else {
        console.log('ℹ️ Rota de registro não disponível ou requer autenticação');
      }
    }

    // Se chegou aqui, precisa criar manualmente ou via Render Shell
    console.log('\n❌ Não foi possível criar via API automática.');
    console.log('\n📝 OPÇÕES PARA CRIAR O ADMIN:');
    console.log('\n1️⃣ Via Render Shell (RECOMENDADO):');
    console.log('   - Acesse: https://dashboard.render.com');
    console.log('   - Clique no seu serviço "launcherpro"');
    console.log('   - Vá em "Shell" ou "Logs"');
    console.log('   - Execute:');
    console.log(`   node scripts/criarAdmin.js "${NOME}" ${EMAIL} ${SENHA}`);
    
    console.log('\n2️⃣ Via SQL direto no banco:');
    console.log('   - Use uma ferramenta SQLite online');
    console.log('   - Ou faça upload do banco local para o Render');
    
    console.log('\n3️⃣ Verificar se já existe outro admin:');
    console.log('   - Email: admin@launcherpro.com');
    console.log('   - Senha: admin123');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Mensagem:', error.response.data);
    }
  }
}

criarAdminNoRender();

