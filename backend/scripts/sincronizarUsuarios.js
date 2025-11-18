/**
 * Script para sincronizar usuários do banco local para a nuvem
 * 
 * Este script:
 * 1. Lê todos os usuários do banco local (SQLite)
 * 2. Envia cada usuário para a API da nuvem via /api/auth/register
 * 3. Ignora usuários que já existem na nuvem
 * 
 * Uso: node scripts/sincronizarUsuarios.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const https = require('https');
const http = require('http');

// Configuração
const LOCAL_DB_PATH = path.join(__dirname, '../database/launcherpro.db');
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://launcherpro.onrender.com';

// Credenciais do admin na nuvem (para autenticação na API admin)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'cursorsemanal@gmail.com';
const ADMIN_SENHA = process.env.ADMIN_SENHA || 'Senha123';

/**
 * Faz uma requisição HTTP/HTTPS
 */
function makeRequest(url, method, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Lê todos os usuários do banco local
 */
function lerUsuariosLocal() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(LOCAL_DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
    });

    db.all('SELECT id, nome, email, senha, tipo, dias_mensalidade, data_vencimento, ativo FROM usuarios', (err, rows) => {
      db.close();
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

/**
 * Faz login como admin na nuvem
 */
async function loginAdmin(email, senha) {
  try {
    const body = { email, senha };
    const response = await makeRequest(`${CLOUD_API_URL}/api/auth/login`, 'POST', body);
    
    if (response.statusCode === 200 && response.body.token) {
      return { success: true, token: response.body.token };
    } else {
      return { success: false, message: response.body.error || 'Erro no login' };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Sincroniza um usuário para a nuvem usando API admin
 */
async function sincronizarUsuario(usuario, adminToken) {
  try {
    // Senha padrão temporária - o admin deve alterar depois
    const senhaPadrao = 'TempSenha123'; // Senha padrão forte
    
    const body = {
      nome: usuario.nome,
      email: usuario.email,
      senha: senhaPadrao, // Senha padrão temporária
      tipo: usuario.tipo || 'cliente',
      dias_mensalidade: usuario.dias_mensalidade || 30
    };

    const response = await makeRequest(
      `${CLOUD_API_URL}/api/admin/usuarios`, 
      'POST', 
      body,
      { 'Authorization': `Bearer ${adminToken}` }
    );
    
    if (response.statusCode === 201 || response.statusCode === 200) {
      return { success: true, message: 'Usuário criado com sucesso', senhaPadrao };
    } else if (response.statusCode === 400 && response.body.error && (
      response.body.error.includes('já existe') || 
      response.body.error.includes('já cadastrado')
    )) {
      return { success: true, message: 'Usuário já existe na nuvem', skipped: true };
    } else {
      return { success: false, message: response.body.error || 'Erro desconhecido' };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🔄 Iniciando sincronização de usuários...');
  console.log(`📡 API da nuvem: ${CLOUD_API_URL}`);
  console.log('');

  try {
    // Ler usuários do banco local
    console.log('📖 Lendo usuários do banco local...');
    const usuarios = await lerUsuariosLocal();
    console.log(`✅ Encontrados ${usuarios.length} usuário(s) no banco local`);
    console.log('');

    if (usuarios.length === 0) {
      console.log('⚠️  Nenhum usuário encontrado no banco local');
      return;
    }

    // Fazer login como admin na nuvem
    console.log('🔐 Fazendo login como admin na nuvem...');
    const loginResult = await loginAdmin(ADMIN_EMAIL, ADMIN_SENHA);
    
    if (!loginResult.success) {
      console.error('❌ Erro ao fazer login como admin:', loginResult.message);
      console.error('');
      console.error('💡 Verifique as credenciais do admin na nuvem:');
      console.error(`   Email: ${ADMIN_EMAIL}`);
      console.error(`   Senha: ${ADMIN_SENHA}`);
      console.error('');
      console.error('💡 Ou defina as variáveis de ambiente:');
      console.error('   $env:ADMIN_EMAIL="seu-email@admin.com"');
      console.error('   $env:ADMIN_SENHA="sua-senha"');
      return;
    }
    
    const adminToken = loginResult.token;
    console.log('✅ Login realizado com sucesso');
    console.log('');

    // Sincronizar cada usuário
    console.log('🔄 Sincronizando usuários...');
    console.log('');
    
    let sucesso = 0;
    let ignorados = 0;
    let erros = 0;
    const usuariosComSenhaPadrao = [];

    for (const usuario of usuarios) {
      // Pular o próprio admin (já existe na nuvem)
      if (usuario.email === ADMIN_EMAIL) {
        console.log(`⏭️  Pulando admin: ${usuario.nome} (${usuario.email})`);
        ignorados++;
        continue;
      }
      
      console.log(`📤 Sincronizando: ${usuario.nome} (${usuario.email})...`);
      
      const resultado = await sincronizarUsuario(usuario, adminToken);
      
      if (resultado.success) {
        if (resultado.skipped) {
          console.log(`   ⏭️  Ignorado (já existe na nuvem)`);
          ignorados++;
        } else {
          console.log(`   ✅ Sincronizado com sucesso`);
          if (resultado.senhaPadrao) {
            usuariosComSenhaPadrao.push({ ...usuario, senhaPadrao: resultado.senhaPadrao });
          }
          sucesso++;
        }
      } else {
        console.log(`   ❌ Erro: ${resultado.message}`);
        erros++;
      }
      
      // Pequeno delay para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('');
    console.log('='.repeat(50));
    console.log('📊 RESUMO DA SINCRONIZAÇÃO');
    console.log('='.repeat(50));
    console.log(`✅ Sincronizados: ${sucesso}`);
    console.log(`⏭️  Ignorados (já existiam): ${ignorados}`);
    console.log(`❌ Erros: ${erros}`);
    
    if (usuariosComSenhaPadrao.length > 0) {
      console.log('');
      console.log('⚠️  USUÁRIOS CRIADOS COM SENHA PADRÃO TEMPORÁRIA:');
      usuariosComSenhaPadrao.forEach(u => {
        console.log(`   - ${u.nome} (${u.email}) - Senha: ${u.senhaPadrao}`);
      });
      console.log('');
      console.log('💡 IMPORTANTE:');
      console.log('   Estes usuários foram criados com senha padrão temporária.');
      console.log('   O admin deve alterar a senha de cada usuário no painel admin.');
      console.log('');
      console.log('💡 SOLUÇÃO:');
      console.log('   1. Faça login como admin na nuvem');
      console.log('   2. Vá no painel admin');
      console.log('   3. Edite cada usuário e redefina a senha');
    }
    
    console.log('');

  } catch (error) {
    console.error('❌ Erro durante sincronização:', error.message);
    process.exit(1);
  }
}

// Executar
main();

