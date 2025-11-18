/**
 * Proxy local simples para fazer scraping sem Puppeteer
 * Mais rápido e leve que Puppeteer, funciona como intermediário CORS
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const cheerio = require('cheerio');
const zlib = require('zlib');

const PORT = parseInt(process.env.PROXY_PORT || '3003');

// Gerenciar cookies entre requisições
let cookieJar = [];
let sessaoInicializada = false;

/**
 * Extrai credenciais do HTML usando Cheerio (mesma lógica do backend)
 */
function extrairCredenciaisDoHTML(html) {
  const credenciais = [];
  
  if (!html || html.length < 100) {
    return credenciais;
  }
  
  // Carregar HTML com Cheerio
  const $ = cheerio.load(html);
  
  // Função auxiliar para extrair credenciais de um elemento (mesma do backend)
  const extrairDeElemento = (html, texto) => {
    // Padrões melhorados - mais flexíveis para capturar credenciais
    const padraoUser = /(?:USER\s*:?\s*|Username\s*:?\s*|Login\s*:?\s*)([^\s\n<PASS<>]+?)(?:\s*PASS|\s*Password|\s*Senha|\s*$|\n|<|USER|PASS)/gi;
    const padraoPass = /(?:PASS\s*:?\s*|Password\s*:?\s*|Senha\s*:?\s*)(?![Pp][Aa][Ss][Ss]\b|password\b|senha\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})(?:\s*USER|\s*$|\n|<|USER|PASS|<\/|<\/span|<\/div)/gi;
    const padraoCombinado = /(?:USER|Username|Login)[\s:]*([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,50})[\s\n\r]*(?:PASS|Password|Senha)[\s:]+(?![Pp][Aa][Ss][Ss]\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})/gi;
    
    // Normalizar HTML (substituir <br> por quebra de linha)
    const htmlNormalizado = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<br>/gi, '\n')
      .replace(/<span[^>]*>/gi, ' ')
      .replace(/<\/span>/gi, ' ')
      .replace(/<button[^>]*>/gi, ' ')
      .replace(/<\/button>/gi, ' ');
    
    // Buscar matches combinados primeiro (mais confiável)
    const matchesCombinados = [...htmlNormalizado.matchAll(padraoCombinado), ...texto.matchAll(padraoCombinado)];
    
    // Buscar matches individuais
    const matchesUser = [...htmlNormalizado.matchAll(padraoUser), ...texto.matchAll(padraoUser)];
    const matchesPass = [...htmlNormalizado.matchAll(padraoPass), ...texto.matchAll(padraoPass)];
    
    // Processar matches combinados primeiro
    const paresCombinados = [];
    matchesCombinados.forEach(m => {
      let user = m[1].trim();
      let pass = m[2].trim();
      
      // Limpar valores
      user = user.replace(/PASS$/i, '').replace(/^PASS/i, '').replace(/USER$/i, '').replace(/^USER/i, '').trim();
      pass = pass.replace(/PASS$/i, '').replace(/^PASS/i, '').replace(/USER$/i, '').replace(/^USER/i, '').trim();
      
      // Validar mais rigorosamente
      const userLower = user.toLowerCase();
      const passLower = pass.toLowerCase();
      
      const userValido = user && user.length > 2 &&
          userLower !== 'pass' && userLower !== 'password' && userLower !== 'user' && userLower !== 'login' &&
          !userLower.startsWith('pass') && !userLower.endsWith('pass');
      
      const passValido = pass && pass.length > 2 &&
          passLower !== 'pass' && passLower !== 'password' && passLower !== 'senha' &&
          !passLower.startsWith('pass') && !passLower.endsWith('pass') &&
          !passLower.includes('user') && !passLower.includes('login');
      
      if (userValido && passValido) {
        paresCombinados.push({ user, pass });
      }
    });
    
    // Limpar e filtrar resultados individuais
    const users = [...new Set(matchesUser.map(m => {
      let user = m[1].trim();
      user = user.replace(/PASS$/i, '').replace(/^PASS/i, '').trim();
      user = user.replace(/USER$/i, '').replace(/^USER/i, '').trim();
      user = user.replace(/LOGIN$/i, '').replace(/^LOGIN/i, '').trim();
      user = user.replace(/^[:\s\-]+|[:\s\-]+$/g, '').trim();
      return user;
    }).filter(u => u && u.length > 2 && !u.toLowerCase().includes('pass') && !u.toLowerCase().includes('user') && !u.toLowerCase().includes('login')))];
    
    const passes = [...new Set(matchesPass.map(m => {
      let pass = m[1].trim();
      if (/^(pass|password|senha)$/i.test(pass)) {
        return null;
      }
      pass = pass.replace(/^[:\s\-]+|[:\s\-]+$/g, '').trim();
      if (!pass || /^(pass|password|senha)$/i.test(pass)) {
        return null;
      }
      pass = pass.replace(/^PASS$/i, '').replace(/PASS$/i, '').trim();
      pass = pass.replace(/^PASSWORD$/i, '').replace(/PASSWORD$/i, '').trim();
      pass = pass.replace(/^SENHA$/i, '').replace(/SENHA$/i, '').trim();
      if (!pass) {
        return null;
      }
      pass = pass.replace(/USER/gi, '').replace(/LOGIN/gi, '').trim();
      pass = pass.replace(/^pass\s+/i, '').replace(/\s+pass$/i, '').trim();
      return pass;
    }).filter(p => {
      if (!p || p.length < 3) return false;
      const pLower = p.toLowerCase();
      if (pLower === 'pass' || pLower === 'password' || pLower === 'senha') return false;
      if (pLower.startsWith('pass') || pLower.endsWith('pass')) return false;
      if (/\bpass\b/i.test(p) && p.length <= 10) return false;
      return true;
    }))];
    
    return { users, passes, paresCombinados };
  };
  
  // 0. Busca específica: procurar por padrões onde há um valor real após PASS
  $('div, span, button, p').each((i, elem) => {
    const texto = $(elem).text() || '';
    
    if (texto.toUpperCase().includes('USER') && texto.toUpperCase().includes('PASS')) {
      const padraoPassValor = /PASS\s*:?\s*(?![Pp][Aa][Ss][Ss]\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})(?:\s|$|\n|<|USER|<\/)/gi;
      const matchesPass = [...texto.matchAll(padraoPassValor)];
      
      matchesPass.forEach(m => {
        let passVal = m[1].trim();
        passVal = passVal.replace(/^[:\s\-]+|[:\s\-]+$/g, '').trim();
        const passLower = passVal.toLowerCase();
        
        if (passVal.length > 2 && 
            passLower !== 'pass' && passLower !== 'password' && passLower !== 'senha' &&
            !passLower.startsWith('pass') && !passLower.endsWith('pass')) {
          const padraoUserValor = /USER\s*:?\s*(?![Uu][Ss][Ee][Rr]\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,50})(?:\s|$|\n|<|PASS|<\/)/gi;
          const matchesUser = [...texto.matchAll(padraoUserValor)];
          
          matchesUser.forEach(mUser => {
            let userVal = mUser[1].trim();
            userVal = userVal.replace(/^[:\s\-]+|[:\s\-]+$/g, '').trim();
            
            if (userVal.length > 2 && 
                userVal.toLowerCase() !== 'user' && userVal.toLowerCase() !== 'login' &&
                userVal.toLowerCase() !== 'pass' && !userVal.toLowerCase().includes('pass')) {
              if (!credenciais.find(c => c.user.toLowerCase() === userVal.toLowerCase())) {
                credenciais.push({ user: userVal, pass: passVal });
              }
            }
          });
        }
      });
    }
  });
  
  // 1. Procurar por divs com classe "pagelayer-text-holder"
  $('div.pagelayer-text-holder').each((i, elem) => {
    const html = $(elem).html() || '';
    const texto = $(elem).text();
    const { users, passes, paresCombinados } = extrairDeElemento(html, texto);
    
    // Adicionar pares combinados primeiro (mais confiáveis)
    paresCombinados.forEach(par => {
      if (!credenciais.find(c => c.user.toLowerCase() === par.user.toLowerCase())) {
        credenciais.push(par);
      }
    });
    
    // Criar pares de credenciais individuais
    if (users.length > 0 && passes.length > 0) {
      const maxLen = Math.max(users.length, passes.length);
      for (let i = 0; i < maxLen; i++) {
        const user = users[i] || users[0] || '';
        const pass = passes[i] || passes[0] || '';
        
        if (user && !credenciais.find(c => c.user.toLowerCase() === user.toLowerCase())) {
          credenciais.push({ user, pass });
        }
      }
    }
  });
  
  // 2. Procurar dentro de botões/span que contenham "LOGIN"
  $('span, button, a, div').each((i, elem) => {
    const texto = $(elem).text() || '';
    const html = $(elem).html() || '';
    const textoUpper = texto.toUpperCase();
    const htmlUpper = html.toUpperCase();
    
    if (textoUpper.includes('LOGIN') || htmlUpper.includes('LOGIN')) {
      const htmlCompleto = $(elem).html() || '';
      const textoCompleto = $(elem).text() || '';
      
      const elementoPai = $(elem).parent();
      const htmlPai = elementoPai.html() || '';
      const textoPai = elementoPai.text() || '';
      
      const htmlCombinado = htmlCompleto + ' ' + htmlPai;
      const textoCombinado = textoCompleto + ' ' + textoPai;
      
      const { users, passes, paresCombinados } = extrairDeElemento(htmlCombinado, textoCombinado);
      
      paresCombinados.forEach(par => {
        if (par.user && par.pass && !credenciais.find(c => c.user.toLowerCase() === par.user.toLowerCase())) {
          credenciais.push(par);
        }
      });
      
      if (users.length > 0 && passes.length > 0) {
        const maxLen = Math.max(users.length, passes.length);
        for (let i = 0; i < maxLen; i++) {
          const user = users[i] || users[0] || '';
          const pass = passes[i] || passes[0] || '';
          
          if (user && user.length > 2 && pass && pass.length > 2 &&
              !credenciais.find(c => c.user.toLowerCase() === user.toLowerCase())) {
            credenciais.push({ user, pass });
          }
        }
      }
    }
  });
  
  // 3. Buscar em todos os elementos que contenham USER e PASS
  $('*').each((i, elem) => {
    const texto = $(elem).text() || '';
    const html = $(elem).html() || '';
    
    if (texto.toUpperCase().includes('USER') && texto.toUpperCase().includes('PASS')) {
      const { users, passes, paresCombinados } = extrairDeElemento(html, texto);
      
      paresCombinados.forEach(par => {
        if (par.user && par.pass && !credenciais.find(c => c.user.toLowerCase() === par.user.toLowerCase())) {
          credenciais.push(par);
        }
      });
      
      if (users.length > 0 && passes.length > 0) {
        const maxLen = Math.max(users.length, passes.length);
        for (let i = 0; i < maxLen; i++) {
          const user = users[i] || users[0] || '';
          const pass = passes[i] || passes[0] || '';
          
          if (user && user.length > 2 && pass && pass.length > 2 &&
              !credenciais.find(c => c.user.toLowerCase() === user.toLowerCase())) {
            credenciais.push({ user, pass });
          }
        }
      }
    }
  });
  
  return credenciais;
}

/**
 * Extrai cookies do header Set-Cookie
 */
function parseCookies(setCookieHeaders) {
  if (!setCookieHeaders) return [];
  
  const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  return cookies.map(cookie => {
    // Pegar apenas a parte antes do ; (nome=valor)
    const parts = cookie.split(';');
    return parts[0].trim();
  });
}

/**
 * Inicializa sessão visitando a página inicial para obter cookies
 */
async function inicializarSessao() {
  if (sessaoInicializada) {
    return;
  }
  
  try {
    console.log('🍪 [PROXY] Inicializando sessão (obtendo cookies)...');
    
    // Tentar múltiplas vezes com delays
    let sucesso = false;
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      try {
        const html = await fetchURL('https://pokopow.com', true);
        // Verificar se não é página de erro
        if (html && html.length > 1000 && !html.includes('Internal server error')) {
          sucesso = true;
          sessaoInicializada = true;
          console.log('✅ [PROXY] Sessão inicializada com cookies obtidos');
          // Pequeno delay
          await new Promise(resolve => setTimeout(resolve, 2000));
          return;
        } else {
          console.log(`   ⚠️ [PROXY] Tentativa ${tentativa}/3: Recebeu página de erro, tentando novamente...`);
          if (tentativa < 3) {
            await new Promise(resolve => setTimeout(resolve, 3000 * tentativa));
          }
        }
      } catch (error) {
        console.log(`   ⚠️ [PROXY] Tentativa ${tentativa}/3 falhou: ${error.message}`);
        if (tentativa < 3) {
          await new Promise(resolve => setTimeout(resolve, 3000 * tentativa));
        }
      }
    }
    
    if (!sucesso) {
      console.log('⚠️ [PROXY] Não foi possível inicializar sessão, mas continuando mesmo assim...');
    }
    sessaoInicializada = true; // Marcar como inicializada mesmo com erro
  } catch (error) {
    console.log(`⚠️ [PROXY] Erro ao inicializar sessão: ${error.message}`);
    sessaoInicializada = true; // Marcar como inicializada mesmo com erro
  }
}

/**
 * Faz fetch de uma URL (sem CORS no Node.js)
 */
function fetchURL(url, inicializar = false) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      // Adicionar cookies ao header se houver
      const cookieHeader = cookieJar.length > 0 ? cookieJar.join('; ') : '';
      
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': inicializar ? 'none' : 'same-origin',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      };
      
      if (cookieHeader) {
        headers['Cookie'] = cookieHeader;
      }
      
      if (!inicializar && urlObj.hostname === 'pokopow.com') {
        headers['Referer'] = 'https://pokopow.com';
      }
      
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: headers
      };
      
      const req = client.request(options, (res) => {
        // Salvar cookies recebidos
        if (res.headers['set-cookie']) {
          const novosCookies = parseCookies(res.headers['set-cookie']);
          novosCookies.forEach(cookie => {
            // Adicionar apenas se não existir
            const nome = cookie.split('=')[0];
            cookieJar = cookieJar.filter(c => !c.startsWith(nome + '='));
            cookieJar.push(cookie);
          });
        }
        
        // Verificar se é erro 500 ou 403
        if (res.statusCode === 500 || res.statusCode === 403) {
          console.log(`   ⚠️ [PROXY] Status ${res.statusCode} - Site pode estar bloqueando`);
          // Não rejeitar, deixar continuar para ver o conteúdo do erro
        }
        
        // Se for erro 500, ainda tentar ler o HTML para debug
        if (res.statusCode === 500) {
          console.log(`   💡 [PROXY] Recebendo erro 500 - site pode estar bloqueando requisições simples`);
          console.log(`   💡 [PROXY] O proxy simples pode não funcionar para este site (requer JavaScript/navegador real)`);
        }
        
        // Tratar redirecionamentos
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(fetchURL(new URL(res.headers.location, url).href, false));
        }
        
        // Detectar compressão
        const encoding = res.headers['content-encoding'];
        let stream = res;
        
        // Descomprimir se necessário
        if (encoding === 'gzip') {
          stream = res.pipe(zlib.createGunzip());
        } else if (encoding === 'deflate') {
          stream = res.pipe(zlib.createInflate());
        } else if (encoding === 'br') {
          stream = res.pipe(zlib.createBrotliDecompress());
        }
        
        let data = '';
        let chunks = [];
        
        stream.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        stream.on('end', () => {
          // Combinar chunks como Buffer primeiro, depois converter para string
          const buffer = Buffer.concat(chunks);
          data = buffer.toString('utf8');
          resolve(data);
        });
        
        stream.on('error', (error) => {
          // Se descompressão falhar, tentar sem descompressão
          if (encoding) {
            console.log(`   ⚠️ Erro ao descomprimir (${encoding}), tentando sem descompressão...`);
            let data = '';
            res.on('data', (chunk) => {
              data += chunk.toString();
            });
            res.on('end', () => {
              resolve(data);
            });
          } else {
            reject(error);
          }
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
        
        // Inicializar sessão se ainda não foi inicializada
        if (!sessaoInicializada && url.includes('pokopow.com')) {
          await inicializarSessao();
        }
        
        // Fazer fetch direto (sem CORS no Node.js) com retry
        let html = null;
        let tentativas = 3;
        
        for (let i = 0; i < tentativas; i++) {
          try {
            html = await fetchURL(url);
            
            // Verificar se não é página de erro
            if (html && html.length > 1000 && !html.includes('Internal server error')) {
              break; // Sucesso
            } else if (html && html.includes('Internal server error')) {
              console.log(`   ⚠️ [PROXY] Tentativa ${i + 1}/${tentativas}: Recebeu erro 500`);
              if (i < tentativas - 1) {
                console.log(`   🔄 Aguardando 3 segundos antes de tentar novamente...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
              }
            }
          } catch (error) {
            console.log(`   ⚠️ [PROXY] Tentativa ${i + 1}/${tentativas} falhou: ${error.message}`);
            if (i < tentativas - 1) {
              await new Promise(resolve => setTimeout(resolve, 3000));
            }
          }
        }
        
        if (!html || html.length < 100) {
          console.log(`⚠️ [PROXY] HTML muito curto ou vazio (${html?.length || 0} chars)`);
          res.writeHead(200);
          res.end(JSON.stringify({ 
            sucesso: false,
            credenciais: [],
            encontradas: 0,
            aviso: 'HTML vazio ou muito curto - site pode estar bloqueando',
            erro: 'Site retornou erro 500 ou bloqueou a requisição. O proxy simples pode não funcionar para este site.'
          }));
          return;
        }
        
        // Verificar se é página de erro
        if (html.includes('Internal server error') || html.includes('Error code 500')) {
          console.log(`⚠️ [PROXY] Site retornou página de erro 500`);
          console.log(`💡 [PROXY] O site pokopow.com está bloqueando requisições HTTP simples`);
          console.log(`💡 [PROXY] Recomendação: Use o scraper com Puppeteer (buscar-contas-background.js)`);
          
          res.writeHead(200);
          res.end(JSON.stringify({ 
            sucesso: false,
            credenciais: [],
            encontradas: 0,
            aviso: 'Site bloqueando requisições - erro 500',
            erro: 'O site está retornando erro 500. O proxy simples não consegue contornar proteções que requerem JavaScript. Use o scraper com Puppeteer.'
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
          const $debug = cheerio.load(html);
          const textoCompleto = $debug('body').text() || '';
          const htmlCompleto = html.toLowerCase();
          
          const temUser = htmlCompleto.includes('user') || textoCompleto.toUpperCase().includes('USER');
          const temPass = htmlCompleto.includes('pass') || textoCompleto.toUpperCase().includes('PASS');
          const temPagelayer = $debug('div.pagelayer-text-holder').length > 0;
          const temLogin = textoCompleto.toUpperCase().includes('LOGIN');
          
          // Verificar se HTML parece válido
          const temTitle = $debug('title').length > 0;
          const temBody = $debug('body').length > 0;
          const previewTexto = textoCompleto.substring(0, 200);
          
          if (temUser || temPass) {
            console.log(`   💡 Página contém "user" ou "pass" mas padrão não encontrou credenciais`);
            console.log(`   🔍 Debug: pagelayer-text-holder=${temPagelayer}, LOGIN=${temLogin}`);
            console.log(`   🔍 Preview texto: ${previewTexto.substring(0, 100)}...`);
          } else {
            console.log(`   ⚠️  Página não contém palavras-chave "user" ou "pass"`);
            console.log(`   🔍 Debug: title=${temTitle}, body=${temBody}, pagelayer=${temPagelayer}`);
            if (previewTexto.length > 0) {
              console.log(`   🔍 Preview texto: ${previewTexto.substring(0, 100)}...`);
            } else {
              console.log(`   🔍 HTML pode estar comprimido ou ser uma página de erro`);
            }
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


