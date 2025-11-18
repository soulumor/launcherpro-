/**
 * Proxy local simples para fazer scraping sem Puppeteer
 * Mais rápido e leve que Puppeteer, funciona como intermediário CORS
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = parseInt(process.env.PROXY_PORT || '3003');

/**
 * Extrai credenciais do HTML (mesma lógica do backend)
 */
function extrairCredenciaisDoHTML(html) {
  const credenciais = [];
  
  if (!html || html.length < 100) {
    return credenciais;
  }
  
  // Normalizar texto
  const textoLimpo = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  
  // Padrões para extrair credenciais
  // Padrão 1: USER: valor PASS: valor (combinado)
  const padraoCombinado = /(?:USER|Username|Login|Usuário|Usuário)[\s:]*([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,50})[\s\n\r]*(?:PASS|Password|Senha)[\s:]+(?![Pp][Aa][Ss][Ss]\b|password\b|senha\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})/gi;
  
  // Padrão 2: USER\nvalor\nPASS\nvalor (linhas separadas)
  const padraoLinhas = /(?:USER|Username|Login|Usuário)[\s:]*\n?[\s:]*([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,50})\s*\n?\s*(?:PASS|Password|Senha)[\s:]*\n?[\s:]+(?![Pp][Aa][Ss][Ss]\b|password\b|senha\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})/gi;
  
  // Padrão 3: Em tags <code> ou <pre>
  const padraoCode = /<(?:code|pre)[^>]*>[\s\S]*?(?:USER|Username|Login)[\s:]*([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,50})[\s\n\r]*(?:PASS|Password|Senha)[\s:]+(?![Pp][Aa][Ss][Ss]\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})[\s\S]*?<\/(?:code|pre)>/gi;
  
  const usuariosEncontrados = new Set();
  
  // Função auxiliar para adicionar credencial
  const adicionarCredencial = (user, pass) => {
    if (user && pass && 
        user.length >= 3 && pass.length >= 3 &&
        !user.toLowerCase().includes('user') &&
        !pass.toLowerCase().includes('pass') &&
        !usuariosEncontrados.has(user.toLowerCase())) {
      credenciais.push({ user: user.trim(), pass: pass.trim() });
      usuariosEncontrados.add(user.toLowerCase());
    }
  };
  
  // Tentar padrão combinado
  let match;
  while ((match = padraoCombinado.exec(textoLimpo)) !== null) {
    adicionarCredencial(match[1], match[2]);
  }
  
  // Tentar padrão de linhas
  while ((match = padraoLinhas.exec(textoLimpo)) !== null) {
    adicionarCredencial(match[1], match[2]);
  }
  
  // Tentar padrão em tags code/pre (no HTML original)
  while ((match = padraoCode.exec(html)) !== null) {
    adicionarCredencial(match[1], match[2]);
  }
  
  // Se ainda não encontrou, tentar padrões separados
  if (credenciais.length === 0) {
    const usuarios = [];
    const senhas = [];
    
    const padraoUser = /(?:USER|Username|Login|Usuário)[\s:]+([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,50})(?:\s|$|\n|<|PASS|Password|Senha)/gi;
    const padraoPass = /(?:PASS|Password|Senha)[\s:]+(?![Pp][Aa][Ss][Ss]\b|password\b|senha\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})(?:\s|$|\n|<|USER|Username)/gi;
    
    while ((match = padraoUser.exec(textoLimpo)) !== null) {
      const user = match[1].trim();
      if (user && user.length >= 3 && !user.toLowerCase().includes('user')) {
        usuarios.push(user);
      }
    }
    
    while ((match = padraoPass.exec(textoLimpo)) !== null) {
      const pass = match[1].trim();
      if (pass && pass.length >= 3 && !pass.toLowerCase().includes('pass')) {
        senhas.push(pass);
      }
    }
    
    // Combinar (assumir mesma ordem)
    const maxLen = Math.min(usuarios.length, senhas.length);
    for (let i = 0; i < maxLen; i++) {
      adicionarCredencial(usuarios[i], senhas[i]);
    }
  }
  
  return credenciais;
}

/**
 * Faz fetch de uma URL (sem CORS no Node.js)
 */
function fetchURL(url) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      };
      
      const req = client.request(options, (res) => {
        let data = '';
        
        // Tratar redirecionamentos
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(fetchURL(new URL(res.headers.location, url).href));
        }
        
        res.on('data', (chunk) => {
          data += chunk.toString();
        });
        
        res.on('end', () => {
          resolve(data);
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      
      req.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Servidor HTTP simples
 */
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Rota: POST /buscar
  if (req.method === 'POST' && req.url === '/buscar') {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const { url } = JSON.parse(body);
        
        if (!url || !url.includes('pokopow.com')) {
          res.writeHead(400);
          res.end(JSON.stringify({ 
            sucesso: false,
            erro: 'URL inválida. Deve ser do pokopow.com',
            credenciais: [],
            encontradas: 0
          }));
          return;
        }
        
        console.log(`🔍 [PROXY] Buscando: ${url}`);
        
        // Fazer fetch direto (sem CORS no Node.js)
        const html = await fetchURL(url);
        
        if (!html || html.length < 100) {
          console.log(`⚠️ [PROXY] HTML muito curto ou vazio (${html?.length || 0} chars)`);
          res.writeHead(200);
          res.end(JSON.stringify({ 
            sucesso: true,
            credenciais: [],
            encontradas: 0,
            aviso: 'HTML vazio ou muito curto'
          }));
          return;
        }
        
        console.log(`✅ [PROXY] HTML recebido (${html.length} caracteres)`);
        
        // Extrair credenciais
        const credenciais = extrairCredenciaisDoHTML(html);
        
        console.log(`✅ [PROXY] Encontradas ${credenciais.length} credencial(is)`);
        
        if (credenciais.length > 0) {
          // Mostrar primeiras credenciais (sem senha completa)
          credenciais.slice(0, 3).forEach((cred, idx) => {
            console.log(`   📋 Credencial ${idx + 1}: ${cred.user} / ${cred.pass.substring(0, 3)}***`);
          });
        } else {
          // Debug: verificar se página contém palavras-chave
          const textoPreview = html.substring(0, 1000).toLowerCase();
          if (textoPreview.includes('user') || textoPreview.includes('pass')) {
            console.log(`   💡 Página contém "user" ou "pass" mas padrão não encontrou credenciais`);
          } else {
            console.log(`   ⚠️  Página não contém palavras-chave "user" ou "pass"`);
          }
        }
        
        res.writeHead(200);
        res.end(JSON.stringify({ 
          sucesso: true,
          credenciais: credenciais || [],
          encontradas: credenciais ? credenciais.length : 0,
          url: url
        }));
      } catch (error) {
        console.error(`❌ [PROXY] Erro ao processar: ${error.message}`);
        res.writeHead(200); // Retornar 200 mesmo com erro para não quebrar o frontend
        res.end(JSON.stringify({ 
          sucesso: false,
          erro: error.message,
          credenciais: [],
          encontradas: 0
        }));
      }
    });
  } 
  // Rota: GET /status
  else if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200);
    res.end(JSON.stringify({ 
      status: 'online',
      tipo: 'proxy-simples',
      porta: PORT
    }));
  } 
  // Rota não encontrada
  else {
    res.writeHead(404);
    res.end(JSON.stringify({ erro: 'Rota não encontrada' }));
  }
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log('');
  console.log('✅ Proxy simples iniciado!');
  console.log(`   Porta: ${PORT}`);
  console.log(`   Endpoint: http://localhost:${PORT}/buscar`);
  console.log(`   Status: http://localhost:${PORT}/status`);
  console.log('');
  console.log('💡 Este proxy é mais rápido que Puppeteer e não precisa de navegador');
  console.log('💡 Pressione Ctrl+C para parar');
  console.log('');
});

// Gerenciar encerramento
process.on('SIGINT', () => {
  console.log('\n🛑 Parando proxy...');
  server.close(() => {
    console.log('✅ Proxy parado\n');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

