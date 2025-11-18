/**
 * Serviço de Sincronização Automática com a Nuvem
 * 
 * Sincroniza automaticamente mudanças de usuários do banco local para a nuvem
 * em tempo real quando há criação, modificação ou remoção de usuários.
 */

const https = require('https');
const http = require('http');

// Configuração
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'https://launcherpro.onrender.com';
const CLOUD_ADMIN_EMAIL = process.env.CLOUD_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'cursorsemanal@gmail.com';
const CLOUD_ADMIN_SENHA = process.env.CLOUD_ADMIN_SENHA || process.env.ADMIN_SENHA || 'Senha123';
const ENABLE_AUTO_SYNC = process.env.ENABLE_AUTO_SYNC !== 'false'; // Por padrão, habilitado

// Cache do token admin para evitar logins repetidos
let adminTokenCache = null;
let tokenExpiry = null;

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
      },
      timeout: 10000 // 10 segundos de timeout
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

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Faz login como admin na nuvem e retorna o token
 */
async function loginAdmin() {
  // Verificar cache de token
  if (adminTokenCache && tokenExpiry && new Date() < tokenExpiry) {
    return { success: true, token: adminTokenCache };
  }

  try {
    const body = { email: CLOUD_ADMIN_EMAIL, senha: CLOUD_ADMIN_SENHA };
    const response = await makeRequest(`${CLOUD_API_URL}/api/auth/login`, 'POST', body);
    
    if (response.statusCode === 200 && response.body.token) {
      // Cachear token por 6 dias (token expira em 7 dias, renovar antes)
      adminTokenCache = response.body.token;
      tokenExpiry = new Date();
      tokenExpiry.setDate(tokenExpiry.getDate() + 6);
      
      return { success: true, token: response.body.token };
    } else {
      return { success: false, message: response.body.error || 'Erro no login' };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Verifica se está rodando na própria nuvem (evitar loop)
 */
function isRunningInCloud() {
  // Se a URL da nuvem aponta para localhost ou se NODE_ENV é production no Render
  const urlObj = new URL(CLOUD_API_URL);
  return urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1';
}

/**
 * Sincroniza um usuário (CREATE ou UPDATE) para a nuvem
 */
async function syncUsuarioToCloud(usuario, operacao = 'create') {
  // Verificar se sync está habilitado
  if (!ENABLE_AUTO_SYNC) {
    return { success: true, skipped: true, message: 'Sincronização automática desabilitada' };
  }

  // Verificar se está rodando na própria nuvem
  if (isRunningInCloud()) {
    return { success: true, skipped: true, message: 'Rodando na nuvem, não precisa sincronizar' };
  }

  try {
    // Fazer login como admin na nuvem
    const loginResult = await loginAdmin();
    
    if (!loginResult.success) {
      console.error(`❌ Erro ao fazer login na nuvem para sincronizar usuário ${usuario.email}:`, loginResult.message);
      return { success: false, message: loginResult.message };
    }

    const adminToken = loginResult.token;

    // Buscar dados completos do usuário (pode não ter senha no objeto)
    // Para UPDATE, precisamos verificar se já existe na nuvem
    let response;
    
    if (operacao === 'update') {
      // Para UPDATE, precisamos buscar o ID do usuário na nuvem pelo email
      const usuariosResponse = await makeRequest(
        `${CLOUD_API_URL}/api/admin/usuarios`,
        'GET',
        null,
        { 'Authorization': `Bearer ${adminToken}` }
      );

      if (usuariosResponse.statusCode !== 200 || !Array.isArray(usuariosResponse.body)) {
        console.error(`❌ Erro ao buscar usuários na nuvem para atualizar ${usuario.email}`);
        return { success: false, message: 'Erro ao buscar usuários na nuvem' };
      }

      const usuarioNuvem = usuariosResponse.body.find(u => u.email === usuario.email);
      
      if (!usuarioNuvem) {
        // Usuário não existe na nuvem, criar novo
        const createData = {
          nome: usuario.nome,
          email: usuario.email,
          senha: 'TempSenha123', // Senha padrão temporária
          tipo: usuario.tipo || 'cliente',
          dias_mensalidade: usuario.dias_mensalidade || 30
        };

        if (usuario.data_vencimento) {
          createData.data_vencimento = usuario.data_vencimento;
        }

        response = await makeRequest(
          `${CLOUD_API_URL}/api/admin/usuarios`,
          'POST',
          createData,
          { 'Authorization': `Bearer ${adminToken}` }
        );
      } else {
        // Usuário existe, fazer UPDATE
        // Nota: senha não pode ser atualizada aqui sem a senha original
        // Apenas atualizar dados permitidos
        const updateData = {
          nome: usuario.nome,
          email: usuario.email,
          tipo: usuario.tipo || 'cliente',
          dias_mensalidade: usuario.dias_mensalidade || 30
        };

        // Se tiver data_vencimento, incluir no update
        if (usuario.data_vencimento) {
          updateData.data_vencimento = usuario.data_vencimento;
        }

        // Fazer UPDATE via PUT
        response = await makeRequest(
          `${CLOUD_API_URL}/api/admin/usuarios/${usuarioNuvem.id}`,
          'PUT',
          updateData,
          { 'Authorization': `Bearer ${adminToken}` }
        );
      }
    } else {
      // CREATE - criar novo usuário
      const createData = {
        nome: usuario.nome,
        email: usuario.email,
        senha: 'TempSenha123', // Senha padrão temporária
        tipo: usuario.tipo || 'cliente',
        dias_mensalidade: usuario.dias_mensalidade || 30
      };

      if (usuario.data_vencimento) {
        createData.data_vencimento = usuario.data_vencimento;
      }

      response = await makeRequest(
        `${CLOUD_API_URL}/api/admin/usuarios`,
        'POST',
        createData,
        { 'Authorization': `Bearer ${adminToken}` }
      );
    }

    if (response.statusCode === 201 || response.statusCode === 200) {
      console.log(`✅ Usuário sincronizado para nuvem: ${usuario.email} (${operacao})`);
      return { success: true, message: 'Usuário sincronizado com sucesso' };
    } else if (response.statusCode === 400 && response.body.error && 
               (response.body.error.includes('já existe') || response.body.error.includes('já cadastrado'))) {
      // Usuário já existe na nuvem - não é erro, é esperado em alguns casos
      console.log(`⏭️  Usuário já existe na nuvem: ${usuario.email} (${operacao})`);
      return { success: true, skipped: true, message: 'Usuário já existe na nuvem' };
    } else {
      console.error(`❌ Erro ao sincronizar usuário ${usuario.email}:`, response.body.error || 'Erro desconhecido');
      return { success: false, message: response.body.error || 'Erro desconhecido' };
    }
  } catch (error) {
    // Erro não deve bloquear a operação local
    console.error(`❌ Erro ao sincronizar usuário ${usuario.email} para nuvem:`, error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Sincroniza remoção de usuário (DELETE) para a nuvem
 */
async function syncDeleteUsuarioToCloud(email) {
  // Verificar se sync está habilitado
  if (!ENABLE_AUTO_SYNC) {
    return { success: true, skipped: true, message: 'Sincronização automática desabilitada' };
  }

  // Verificar se está rodando na própria nuvem
  if (isRunningInCloud()) {
    return { success: true, skipped: true, message: 'Rodando na nuvem, não precisa sincronizar' };
  }

  try {
    // Fazer login como admin na nuvem
    const loginResult = await loginAdmin();
    
    if (!loginResult.success) {
      console.error(`❌ Erro ao fazer login na nuvem para deletar usuário ${email}:`, loginResult.message);
      return { success: false, message: loginResult.message };
    }

    const adminToken = loginResult.token;

    // Buscar ID do usuário na nuvem pelo email
    const usuariosResponse = await makeRequest(
      `${CLOUD_API_URL}/api/admin/usuarios`,
      'GET',
      null,
      { 'Authorization': `Bearer ${adminToken}` }
    );

    if (usuariosResponse.statusCode !== 200 || !Array.isArray(usuariosResponse.body)) {
      console.error(`❌ Erro ao buscar usuários na nuvem para deletar ${email}`);
      return { success: false, message: 'Erro ao buscar usuários na nuvem' };
    }

    const usuarioNuvem = usuariosResponse.body.find(u => u.email === email);
    
    if (!usuarioNuvem) {
      // Usuário não existe na nuvem - não é erro
      console.log(`⏭️  Usuário não existe na nuvem: ${email} (já foi removido ou nunca existiu)`);
      return { success: true, skipped: true, message: 'Usuário não existe na nuvem' };
    }

    // Deletar usuário na nuvem
    const deleteResponse = await makeRequest(
      `${CLOUD_API_URL}/api/admin/usuarios/${usuarioNuvem.id}`,
      'DELETE',
      null,
      { 'Authorization': `Bearer ${adminToken}` }
    );

    if (deleteResponse.statusCode === 200 || deleteResponse.statusCode === 204) {
      console.log(`✅ Usuário deletado da nuvem: ${email}`);
      return { success: true, message: 'Usuário deletado da nuvem com sucesso' };
    } else {
      console.error(`❌ Erro ao deletar usuário ${email} da nuvem:`, deleteResponse.body.error || 'Erro desconhecido');
      return { success: false, message: deleteResponse.body.error || 'Erro desconhecido' };
    }
  } catch (error) {
    // Erro não deve bloquear a operação local
    console.error(`❌ Erro ao deletar usuário ${email} da nuvem:`, error.message);
    return { success: false, message: error.message };
  }
}

module.exports = {
  syncUsuarioToCloud,
  syncDeleteUsuarioToCloud,
  ENABLE_AUTO_SYNC
};

