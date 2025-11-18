const puppeteer = require('puppeteer');
const axios = require('axios');
const http = require('http');

/**
 * Script local que roda em segundo plano
 * Usa Puppeteer para buscar contas do site pokopow.com
 * Envia para backend na nuvem (não usa recursos do servidor fraco)
 * 
 * Servidor HTTP local para receber requisições de busca imediata
 */

// Configurações
const BACKEND_URL = process.env.CLOUD_API_URL || 'https://launcherpro.onrender.com';
const INTERVAL_MINUTES = parseInt(process.env.INTERVAL_MINUTES || '30'); // Verificar a cada 30 minutos
const BASE_URL = 'https://pokopow.com';
const DELAY_BETWEEN_REQUESTS = 5000; // 5 segundos entre requisições
const LOCAL_SERVER_PORT = parseInt(process.env.LOCAL_SERVER_PORT || '3002'); // Porta do servidor local

class BackgroundScraper {
  constructor() {
    this.browser = null;
    this.running = false;
    this.lastCheck = null;
    this.token = null;
  }

  /**
   * Faz login no backend para obter token
   */
  async fazerLogin() {
    const email = process.env.ADMIN_EMAIL || 'cursorsemanal@gmail.com';
    const senha = process.env.ADMIN_SENHA || 'Senha123';
    
    try {
      console.log('🔐 Fazendo login no backend...');
      const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email,
        senha
      }, {
        timeout: 10000
      });
      
      this.token = response.data.token;
      console.log('✅ Login realizado com sucesso!\n');
      return true;
    } catch (error) {
      console.error('❌ Erro ao fazer login:', error.response?.data?.error || error.message);
      console.error('💡 Verifique ADMIN_EMAIL e ADMIN_SENHA no .env\n');
      return false;
    }
  }

  /**
   * Obtém headers com autenticação
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Inicializa o navegador Puppeteer e faz login
   */
  async init() {
    console.log('🚀 Iniciando scraper local em segundo plano...');
    console.log(`📡 Backend na nuvem: ${BACKEND_URL}`);
    console.log(`⏰ Verificação a cada ${INTERVAL_MINUTES} minutos\n`);
    
    // Fazer login primeiro
    const loginSucesso = await this.fazerLogin();
    if (!loginSucesso) {
      throw new Error('Não foi possível fazer login no backend');
    }
    
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled'
        ]
      });
      
      console.log('✅ Navegador Puppeteer iniciado\n');
    } catch (error) {
      console.error('❌ Erro ao iniciar navegador:', error.message);
      throw error;
    }
  }

  /**
   * Aguarda um tempo
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Busca credenciais de uma URL diretamente (método público)
   */
  async buscarCredenciaisPorURL(url) {
    if (!this.browser) {
      throw new Error('Navegador não inicializado');
    }
    return await this.buscarCredenciais(url);
  }

  /**
   * Busca credenciais de uma URL usando Puppeteer
   */
  async buscarCredenciais(url) {
    if (!this.browser) {
      throw new Error('Navegador não inicializado');
    }

    const page = await this.browser.newPage();
    
    try {
      // Headers realistas
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Remover sinais de automação
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });
      });
      
      console.log(`   🌐 Acessando: ${url}`);
      
      // Navegar até a página e aguardar JavaScript carregar
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 45000 // Aumentar timeout
      });
      
      // Aguardar mais tempo para conteúdo dinâmico carregar
      await this.sleep(5000);
      
      // Tentar esperar por elementos que podem conter credenciais
      try {
        await page.waitForSelector('body', { timeout: 10000 });
        
        // Esperar por possíveis elementos de credenciais (pode não existir, mas tentar)
        const selectoresPossiveis = [
          'code',
          'pre',
          '.credenciais',
          '.account',
          '.user-pass',
          'p:has-text("USER")',
          'p:has-text("PASS")'
        ];
        
        for (const seletor of selectoresPossiveis) {
          try {
            await page.waitForSelector(seletor, { timeout: 2000 }).catch(() => {});
          } catch (e) {
            // Ignorar se não encontrar
          }
        }
      } catch (e) {
        // Continuar mesmo se não encontrar elementos específicos
      }
      
      // Extrair HTML após tudo carregar
      const html = await page.content();
      
      // Também extrair texto visível (pode ter credenciais que não aparecem no HTML bruto)
      const textoVisivel = await page.evaluate(() => {
        return document.body.innerText || document.body.textContent || '';
      });
      
      // Verificar se é página de erro do Cloudflare
      const htmlLower = html.toLowerCase();
      const textoLower = textoVisivel.toLowerCase();
      if (htmlLower.includes('cloudflare') || 
          htmlLower.includes('error code 500') || 
          htmlLower.includes('internal server error') ||
          htmlLower.includes('checking your browser') ||
          htmlLower.includes('ray id') ||
          textoLower.includes('cloudflare') ||
          textoLower.includes('error code 500')) {
        console.log(`   🛡️ [CLOUDFLARE] Site bloqueado pelo Cloudflare (proteção anti-bot)`);
        console.log(`   ⚠️  O site detectou automação e está bloqueando requisições`);
        console.log(`   💡 Puppeteer pode precisar de mais tempo ou configurações especiais`);
        return [];
      }
      
      // Combinar HTML e texto visível para extração
      const textoCompleto = html + '\n' + textoVisivel;
      
      // Extrair credenciais usando regex (melhorado)
      const credenciais = this.extrairCredenciaisDoHTML(textoCompleto);
      
      console.log(`   ✅ Encontradas ${credenciais.length} credencial(is)`);
      
      // Debug: mostrar um pouco do texto se não encontrou nada
      if (credenciais.length === 0) {
        const textoPreview = textoVisivel.substring(0, 500).toLowerCase();
        console.log(`   🔍 [DEBUG] Preview do texto (500 chars): ${textoPreview.substring(0, 200)}...`);
        
        if (textoPreview.includes('user') || textoPreview.includes('pass')) {
          console.log(`   💡 Página contém palavras "user" ou "pass" mas padrão não encontrou credenciais`);
          console.log(`   💡 Tamanho do HTML: ${html.length} caracteres`);
          console.log(`   💡 Tamanho do texto visível: ${textoVisivel.length} caracteres`);
        } else {
          console.log(`   ⚠️  Página não contém palavras-chave "user" ou "pass"`);
        }
      } else {
        // Mostrar primeiras credenciais encontradas (sem senha completa)
        credenciais.slice(0, 3).forEach((cred, idx) => {
          console.log(`   📋 Credencial ${idx + 1}: ${cred.user} / ${cred.pass.substring(0, 3)}***`);
        });
      }
      
      return credenciais;
    } catch (error) {
      console.error(`   ❌ Erro ao buscar credenciais:`, error.message);
      
      // Se for timeout, pode ser Cloudflare
      if (error.message.includes('timeout') || error.message.includes('Navigation timeout')) {
        console.log(`   ⚠️  Timeout - Site pode estar bloqueando ou lento`);
      }
      
      return [];
    } finally {
      await page.close();
    }
  }

  /**
   * Extrai credenciais do HTML usando regex (melhorado)
   */
  extrairCredenciaisDoHTML(texto) {
    const credenciais = [];
    
    // Normalizar texto (remover tags HTML, espaços múltiplos, etc)
    const textoLimpo = texto
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remover scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remover estilos
      .replace(/<[^>]+>/g, ' ') // Remover tags HTML
      .replace(/\s+/g, ' ') // Normalizar espaços
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    
    // Padrões melhorados para extrair credenciais
    // Padrão 1: USER: valor PASS: valor (na mesma linha ou próximas)
    const padraoCombinado = /(?:USER|Username|Login|Usuário|Usuário)[\s:]*([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,50})[\s\n\r]*(?:PASS|Password|Senha)[\s:]+(?![Pp][Aa][Ss][Ss]\b|password\b|senha\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})/gi;
    
    // Padrão 2: USER\nvalor\nPASS\nvalor (linhas separadas)
    const padraoLinhas = /(?:USER|Username|Login|Usuário)[\s:]*\n?[\s:]*([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,50})\s*\n?\s*(?:PASS|Password|Senha)[\s:]*\n?[\s:]+(?![Pp][Aa][Ss][Ss]\b|password\b|senha\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})/gi;
    
    // Padrão 3: Texto entre tags <code> ou <pre> (comum em sites)
    const padraoCode = /<(?:code|pre)[^>]*>[\s\S]*?(?:USER|Username|Login)[\s:]*([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,50})[\s\n\r]*(?:PASS|Password|Senha)[\s:]+(?![Pp][Aa][Ss][Ss]\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})[\s\S]*?<\/(?:code|pre)>/gi;
    
    const usuariosEncontrados = new Set();
    
    // Função auxiliar para adicionar credencial se válida
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
    
    // Tentar padrão em tags code/pre (no texto original)
    while ((match = padraoCode.exec(texto)) !== null) {
      adicionarCredencial(match[1], match[2]);
    }
    
    // Se ainda não encontrou, tentar padrões separados
    if (credenciais.length === 0) {
      const usuarios = [];
      const senhas = [];
      
      // Padrão USER: valor (separado)
      const padraoUser = /(?:USER|Username|Login|Usuário)[\s:]+([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,50})(?:\s|$|\n|<|PASS|Password|Senha)/gi;
      
      // Padrão PASS: valor (separado)
      const padraoPass = /(?:PASS|Password|Senha)[\s:]+(?![Pp][Aa][Ss][Ss]\b|password\b|senha\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})(?:\s|$|\n|<|USER|Username)/gi;
      
      // Extrair usuários
      while ((match = padraoUser.exec(textoLimpo)) !== null) {
        const user = match[1].trim();
        if (user && user.length >= 3 && !user.toLowerCase().includes('user')) {
          usuarios.push(user);
        }
      }
      
      // Extrair senhas
      while ((match = padraoPass.exec(textoLimpo)) !== null) {
        const pass = match[1].trim();
        if (pass && pass.length >= 3 && !pass.toLowerCase().includes('pass')) {
          senhas.push(pass);
        }
      }
      
      // Combinar (assumir que estão na mesma ordem ou próximas)
      const maxLen = Math.min(usuarios.length, senhas.length);
      for (let i = 0; i < maxLen; i++) {
        adicionarCredencial(usuarios[i], senhas[i]);
      }
      
      // Também tentar combinar próximos (usuário i com senha i+1, etc)
      if (maxLen === 0 && usuarios.length > 0 && senhas.length > 0) {
        for (let i = 0; i < usuarios.length && i < senhas.length; i++) {
          adicionarCredencial(usuarios[i], senhas[i]);
        }
      }
    }
    
    return credenciais;
  }

  /**
   * Busca jogos que precisam de contas
   */
  async verificarJogosSemContas() {
    try {
      console.log('🔍 Verificando jogos que precisam de contas...\n');
      
      // Buscar todos os jogos do backend
      const response = await axios.get(`${BACKEND_URL}/api/jogos`, {
        headers: this.getHeaders(),
        timeout: 30000
      });
      
      const jogos = response.data || [];
      console.log(`📊 Total de jogos no banco: ${jogos.length}\n`);
      
      let jogosProcessados = 0;
      let contasAdicionadas = 0;
      
      // Verificar cada jogo
      for (const jogo of jogos) {
        if (!jogo.id || !jogo.nome) continue;
        
        try {
          // Verificar quantas contas o jogo tem
          const contasResponse = await axios.get(`${BACKEND_URL}/api/contas/${jogo.id}`, {
            headers: this.getHeaders(),
            timeout: 30000
          });
          
          const contas = contasResponse.data || [];
          
          // Se não tem contas, buscar
          if (contas.length === 0) {
            console.log(`🎮 Buscando contas para: ${jogo.nome} (ID: ${jogo.id})`);
            
            // Construir URL de busca
            const termoBusca = jogo.nome.toLowerCase().replace(/\s+/g, '+');
            const urlBusca = `${BASE_URL}/?s=${encodeURIComponent(termoBusca)}`;
            
            // Buscar jogos na página de busca
            const jogosEncontrados = await this.buscarJogosNaPagina(urlBusca, jogo.nome);
            
            // Para cada jogo encontrado, buscar credenciais
            for (const jogoEncontrado of jogosEncontrados) {
              if (!jogoEncontrado.url) continue;
              
              console.log(`   📄 Buscando credenciais em: ${jogoEncontrado.url}`);
              
              const credenciais = await this.buscarCredenciais(jogoEncontrado.url);
              
              // Enviar credenciais para o backend
              for (const cred of credenciais) {
                try {
                  await axios.post(`${BACKEND_URL}/api/contas`, {
                    jogo_id: jogo.id,
                    usuario: cred.user,
                    senha: cred.pass,
                    status: 'disponivel'
                  }, {
                    headers: this.getHeaders(),
                    timeout: 30000
                  });
                  
                  contasAdicionadas++;
                  console.log(`   ✅ Conta adicionada: ${cred.user}`);
                } catch (error) {
                  // Verificar se já existe
                  if (error.response?.status === 400) {
                    console.log(`   ⚠️  Conta já existe: ${cred.user}`);
                  } else {
                    console.error(`   ❌ Erro ao adicionar conta:`, error.message);
                  }
                }
                
                // Delay entre requisições
                await this.sleep(DELAY_BETWEEN_REQUESTS);
              }
            }
            
            jogosProcessados++;
            
            // Delay maior entre jogos
            await this.sleep(DELAY_BETWEEN_REQUESTS * 2);
          }
        } catch (error) {
          console.error(`   ❌ Erro ao processar jogo ${jogo.nome}:`, error.message);
        }
      }
      
      console.log(`\n✅ Verificação concluída:`);
      console.log(`   📊 Jogos processados: ${jogosProcessados}`);
      console.log(`   🔐 Contas adicionadas: ${contasAdicionadas}\n`);
      
      this.lastCheck = new Date();
    } catch (error) {
      console.error('❌ Erro ao verificar jogos:', error.message);
    }
  }

  /**
   * Busca jogos na página de busca do site
   */
  async buscarJogosNaPagina(url, nomeJogo) {
    if (!this.browser) {
      return [];
    }

    const page = await this.browser.newPage();
    const jogos = [];
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      await this.sleep(3000);
      
      // Extrair links de jogos
      const links = await page.evaluate(() => {
        const elementos = document.querySelectorAll('a[href*="pokopow.com"]');
        const linksUnicos = new Set();
        
        elementos.forEach(elem => {
          const href = elem.getAttribute('href');
          if (href && href.includes('pokopow.com') && 
              !href.includes('/category/') && 
              !href.includes('/tag/') && 
              !href.includes('/page/') &&
              href !== 'https://pokopow.com/' &&
              href !== 'http://pokopow.com/') {
            linksUnicos.add(href);
          }
        });
        
        return Array.from(linksUnicos);
      });
      
      // Filtrar URLs inválidas (Cloudflare errors, etc)
      const linksValidos = links.filter(link => {
        return !link.includes('cloudflare.com') &&
               !link.includes('error') &&
               !link.includes('5xx-error') &&
               link.includes('pokopow.com/') &&
               link.split('/').length > 4; // Deve ter path além do domínio
      });
      
      // Filtrar jogos que correspondem ao nome
      const nomeLower = nomeJogo.toLowerCase();
      const nomeNormalizado = nomeLower.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      for (const link of linksValidos) {
        // Verificar se o link parece ser do jogo procurado
        const linkLower = link.toLowerCase();
        const palavrasNome = nomeLower.split(/\s+/);
        
        // Verificar se link contém palavras do nome
        const temCorrespondencia = palavrasNome.some(palavra => {
          if (palavra.length < 3) return false;
          return linkLower.includes(palavra.replace(/[^a-z0-9]/g, ''));
        });
        
        if (temCorrespondencia || 
            linkLower.includes(nomeNormalizado) ||
            linkLower.includes(nomeLower.replace(/\s+/g, '_'))) {
          jogos.push({ nome: nomeJogo, url: link });
        }
      }
      
      // Se não encontrou nenhum específico, pegar os primeiros links válidos (até 3)
      if (jogos.length === 0 && linksValidos.length > 0) {
        const linksParaTestar = linksValidos.slice(0, 3);
        for (const link of linksParaTestar) {
          jogos.push({ nome: nomeJogo, url: link });
        }
      }
      
    } catch (error) {
      console.error(`   ❌ Erro ao buscar jogos na página:`, error.message);
    } finally {
      await page.close();
    }
    
    return jogos;
  }

  /**
   * Busca contas para um jogo específico (chamada imediata)
   */
  async buscarContasParaJogoImediato(jogoId, jogoNome) {
    try {
      console.log(`\n🎯 BUSCA IMEDIATA: ${jogoNome} (ID: ${jogoId})\n`);
      
      // Construir URL de busca
      const termoBusca = jogoNome.toLowerCase().replace(/\s+/g, '+');
      const urlBusca = `${BASE_URL}/?s=${encodeURIComponent(termoBusca)}`;
      
      // Buscar jogos na página de busca
      const jogosEncontrados = await this.buscarJogosNaPagina(urlBusca, jogoNome);
      
      if (jogosEncontrados.length === 0) {
        console.log(`   ⚠️  Nenhum jogo encontrado no site para: ${jogoNome}`);
        return { sucesso: false, contasAdicionadas: 0, mensagem: 'Nenhum jogo encontrado no site' };
      }
      
      let contasAdicionadas = 0;
      const credenciaisEncontradas = [];
      
      // Para cada jogo encontrado, buscar credenciais
      for (const jogoEncontrado of jogosEncontrados) {
        if (!jogoEncontrado.url) continue;
        
        console.log(`   📄 Buscando credenciais em: ${jogoEncontrado.url}`);
        
        const credenciais = await this.buscarCredenciais(jogoEncontrado.url);
        
        // Enviar credenciais para o backend
        for (const cred of credenciais) {
          try {
            await axios.post(`${BACKEND_URL}/api/contas`, {
              jogo_id: jogoId,
              usuario: cred.user,
              senha: cred.pass,
              status: 'disponivel'
            }, {
              headers: this.getHeaders(),
              timeout: 30000
            });
            
            contasAdicionadas++;
            credenciaisEncontradas.push(cred);
            console.log(`   ✅ Conta adicionada: ${cred.user}`);
          } catch (error) {
            // Verificar se já existe
            if (error.response?.status === 400) {
              console.log(`   ⚠️  Conta já existe: ${cred.user}`);
            } else {
              console.error(`   ❌ Erro ao adicionar conta:`, error.message);
            }
          }
          
          // Delay entre requisições
          await this.sleep(DELAY_BETWEEN_REQUESTS);
        }
      }
      
      console.log(`\n✅ Busca imediata concluída: ${contasAdicionadas} conta(s) adicionada(s)\n`);
      
      return { 
        sucesso: true, 
        contasAdicionadas, 
        credenciais: credenciaisEncontradas,
        mensagem: `${contasAdicionadas} conta(s) encontrada(s) e adicionada(s)`
      };
    } catch (error) {
      console.error(`❌ Erro na busca imediata:`, error.message);
      return { 
        sucesso: false, 
        contasAdicionadas: 0, 
        mensagem: `Erro: ${error.message}` 
      };
    }
  }

  /**
   * Inicia servidor HTTP local para receber requisições de busca imediata
   */
  iniciarServidorLocal() {
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
      
      // Rota: POST /buscar-contas
      if (req.method === 'POST' && req.url === '/buscar-contas') {
        let body = '';
        
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', async () => {
          try {
            const { jogoId, jogoNome, url } = JSON.parse(body);
            
            // Aceitar tanto jogoId+jogoNome quanto URL direta
            if (url) {
              // Se tem URL, buscar diretamente
              console.log(`🔍 [HTTP] Busca imediata via URL: ${url}`);
              console.log(`   📥 Recebido: jogoId=${jogoId}, jogoNome=${jogoNome}`);
              
              try {
                const credenciais = await this.buscarCredenciaisPorURL(url);
                
                console.log(`   ✅ [HTTP] Retornando ${credenciais?.length || 0} credencial(is)`);
                
                res.writeHead(200);
                res.end(JSON.stringify({ 
                  sucesso: true,
                  credenciais: credenciais || [],
                  encontradas: credenciais ? credenciais.length : 0,
                  url: url
                }));
              } catch (error) {
                console.error(`   ❌ [HTTP] Erro ao buscar: ${error.message}`);
                res.writeHead(200); // Retornar 200 mesmo com erro para não quebrar o frontend
                res.end(JSON.stringify({ 
                  sucesso: false,
                  credenciais: [],
                  encontradas: 0,
                  erro: error.message,
                  url: url
                }));
              }
            } else if (jogoId && jogoNome) {
              // Buscar contas imediatamente (método original)
              const resultado = await this.buscarContasParaJogoImediato(jogoId, jogoNome);
              
              res.writeHead(200);
              res.end(JSON.stringify(resultado));
            } else {
              res.writeHead(400);
              res.end(JSON.stringify({ 
                error: 'jogoId e jogoNome são obrigatórios, ou forneça url' 
              }));
              return;
            }
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ 
              error: 'Erro ao processar requisição',
              detalhes: error.message 
            }));
          }
        });
      } else if (req.method === 'GET' && req.url === '/status') {
        // Rota: GET /status (verificar se scraper está rodando)
        res.writeHead(200);
        res.end(JSON.stringify({ 
          status: 'online',
          running: this.running,
          lastCheck: this.lastCheck 
        }));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Rota não encontrada' }));
      }
    });
    
    server.listen(LOCAL_SERVER_PORT, () => {
      console.log(`🌐 Servidor HTTP local iniciado na porta ${LOCAL_SERVER_PORT}`);
      console.log(`   Endpoint: http://localhost:${LOCAL_SERVER_PORT}/buscar-contas\n`);
    });
    
    return server;
  }

  /**
   * Inicia o monitoramento automático
   */
  async start() {
    try {
      await this.init();
      this.running = true;
      
      // Iniciar servidor HTTP local
      const server = this.iniciarServidorLocal();
      
      console.log('✅ Scraper rodando em segundo plano\n');
      console.log('💡 Pressione Ctrl+C para parar\n');
      
      // Verificação inicial
      await this.verificarJogosSemContas();
      
      // Loop de monitoramento
      while (this.running) {
        try {
          const nextCheck = new Date(Date.now() + INTERVAL_MINUTES * 60 * 1000);
          console.log(`⏳ Próxima verificação em ${INTERVAL_MINUTES} minutos (${nextCheck.toLocaleTimeString('pt-BR')})\n`);
          
          await this.sleep(INTERVAL_MINUTES * 60 * 1000);
          
          if (this.running) {
            await this.verificarJogosSemContas();
          }
        } catch (error) {
          console.error('❌ Erro no loop de monitoramento:', error.message);
          console.log('⏳ Aguardando 1 minuto antes de tentar novamente...\n');
          await this.sleep(60000); // Esperar 1 minuto se der erro
        }
      }
    } catch (error) {
      console.error('❌ Erro fatal:', error.message);
      process.exit(1);
    }
  }

  /**
   * Para o scraper
   */
  async stop() {
    console.log('\n🛑 Parando scraper...');
    this.running = false;
    
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Navegador fechado');
    }
    
    console.log('👋 Scraper parado\n');
    process.exit(0);
  }
}

// Gerenciar encerramento gracioso
const scraper = new BackgroundScraper();

process.on('SIGINT', async () => {
  await scraper.stop();
});

process.on('SIGTERM', async () => {
  await scraper.stop();
});

// Iniciar
scraper.start().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

