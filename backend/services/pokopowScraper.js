const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Serviço de scraper para pokopow.com
 * Extrai jogos e credenciais automaticamente
 */

class PokopowScraper {
  constructor() {
    this.baseUrl = 'https://pokopow.com';
    this.delay = 2000; // Delay entre requisições (2 segundos) - menos agressivo
  }

  /**
   * Faz uma requisição HTTP e retorna o HTML
   */
  async fetchPage(url, tentativas = 3) {
    for (let i = 0; i < tentativas; i++) {
      try {
        console.log(`   📡 Tentativa ${i + 1}/${tentativas}: ${url}`);
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Cache-Control': 'no-cache'
          },
          timeout: 30000 // 30 segundos - muito mais tempo
        });
        
        console.log(`   ✅ Sucesso na tentativa ${i + 1}`);
        return cheerio.load(response.data);
        
      } catch (error) {
        const isLastTry = i === tentativas - 1;
        
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          console.error(`   ⏰ Timeout na tentativa ${i + 1}/${tentativas} para ${url}`);
          if (!isLastTry) {
            console.log(`   🔄 Aguardando 3 segundos antes da próxima tentativa...`);
            await this.sleep(3000);
          }
        } else {
          console.error(`   ❌ Erro na tentativa ${i + 1}/${tentativas} para ${url}:`, error.message);
          if (!isLastTry) {
            await this.sleep(2000);
          }
        }
        
        if (isLastTry) {
          console.error(`   💥 Falha após ${tentativas} tentativas para ${url}`);
          return null;
        }
      }
    }
  }

  /**
   * Encontra todos os jogos do site (COM PAGINAÇÃO COMPLETA)
   * Agora busca TODAS as páginas de cada categoria
   */
  async encontrarTodosJogos() {
    console.log('🔍 Buscando TODOS os jogos do pokopow.com (com paginação)...\n');
    
    const todosJogos = new Set();
    const categoriasEncontradas = new Set();
    
    // 1. Buscar categorias na página principal
    console.log('1. Buscando categorias...');
    const $ = await this.fetchPage(this.baseUrl);
    
    if ($) {
      // Encontrar links de categorias
      $('a[href*="/category/"]').each((i, elem) => {
        const href = $(elem).attr('href');
        if (href) {
          const urlCompleta = href.startsWith('http') ? href : this.baseUrl + href;
          if (urlCompleta.includes('pokopow.com')) {
            categoriasEncontradas.add(urlCompleta);
          }
        }
      });
      console.log(`   ✅ ${categoriasEncontradas.size} categorias encontradas`);
    }
    
    // 2. Extrair jogos da página principal (COM PAGINAÇÃO)
    console.log('\n2. Extraindo jogos da página principal (todas as páginas)...');
    const jogosPrincipal = await this.extrairJogosComPaginacao(this.baseUrl);
    jogosPrincipal.forEach(jogo => todosJogos.add(jogo.url));
    console.log(`   ✅ ${jogosPrincipal.length} jogos encontrados na página principal`);
    
    // 3. Visitar cada categoria (COM PAGINAÇÃO)
    console.log(`\n3. Visitando ${categoriasEncontradas.size} categoria(s) (todas as páginas)...`);
    let categoriaIndex = 0;
    for (const categoriaUrl of categoriasEncontradas) {
      categoriaIndex++;
      console.log(`   [${categoriaIndex}/${categoriasEncontradas.size}] ${categoriaUrl}`);
      
      const jogosCategoria = await this.extrairJogosComPaginacao(categoriaUrl);
      jogosCategoria.forEach(jogo => todosJogos.add(jogo.url));
      console.log(`      ✅ ${jogosCategoria.length} jogos encontrados nesta categoria`);
      
      // Delay entre categorias (menos agressivo)
      if (categoriaIndex < categoriasEncontradas.size) {
        await this.sleep(this.delay); // 2 segundos entre categorias
      }
    }
    
    // 4. Coletar informações de cada jogo
    const listaJogos = Array.from(todosJogos);
    console.log(`\n4. Coletando informações de ${listaJogos.length} jogos únicos...`);
    
    const jogosComInfo = [];
    for (let i = 0; i < listaJogos.length; i++) {
      const jogoUrl = listaJogos[i];
      
      if ((i + 1) % 10 === 0) {
        console.log(`   Processando ${i + 1}/${listaJogos.length}...`);
      }
      
      const $jogo = await this.fetchPage(jogoUrl);
      if ($jogo) {
        const titulo = $jogo('title').text().trim();
        const h1 = $jogo('h1').first().text().trim();
        
        // Extrair nome do jogo da URL
        const nomeJogo = jogoUrl
          .replace('https://pokopow.com/', '')
          .replace('/', '')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
        
        jogosComInfo.push({
          nome: nomeJogo || h1 || titulo.split(' - ')[0],
          url: jogoUrl,
          titulo_pagina: titulo,
          h1: h1
        });
      }
      
      // Delay a cada 10 jogos (menos agressivo)
      if ((i + 1) % 10 === 0) {
        await this.sleep(this.delay); // 2 segundos a cada 10 jogos
      }
    }
    
    console.log(`\n✅ Total de ${jogosComInfo.length} jogos únicos encontrados!`);
    return jogosComInfo;
  }

  /**
   * Extrai jogos de uma URL incluindo TODAS as páginas (paginação)
   */
  async extrairJogosComPaginacao(urlBase) {
    const todosJogos = [];
    const urlsProcessadas = new Set();
    let paginaAtual = 1;
    let temMaisPaginas = true;
    let tentativasSemJogos = 0;
    
    while (temMaisPaginas && tentativasSemJogos < 2) {
      // Construir URL da página
      let urlPagina;
      if (paginaAtual === 1) {
        urlPagina = urlBase;
      } else {
        // Tentar diferentes formatos de paginação
        if (urlBase.includes('?')) {
          urlPagina = `${urlBase}&page=${paginaAtual}`;
        } else {
          urlPagina = `${urlBase}/page/${paginaAtual}`;
        }
      }
      
      // Evitar processar a mesma URL duas vezes
      if (urlsProcessadas.has(urlPagina)) {
        temMaisPaginas = false;
        break;
      }
      urlsProcessadas.add(urlPagina);
      
      // Buscar página e extrair jogos
      const $ = await this.fetchPage(urlPagina);
      
      if (!$) {
        tentativasSemJogos++;
        temMaisPaginas = false;
        break;
      }
      
      // Extrair jogos desta página
      const jogosPagina = [];
      const urlsVistas = new Set();
      
      $('a[href]').each((i, elem) => {
        const href = $(elem).attr('href');
        if (!href) return;
        
        const urlCompleta = href.startsWith('http') ? href : this.baseUrl + href;
        
        if (this.ehLinkDeJogo(urlCompleta) && !urlsVistas.has(urlCompleta)) {
          urlsVistas.add(urlCompleta);
          
          let nome = $(elem).text().trim();
          
          if (!nome || nome.length < 3) {
            const urlParts = urlCompleta.split('/').filter(p => p);
            nome = urlParts[urlParts.length - 1] || nome;
            nome = nome.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
          
          if (!nome || nome.length < 3) {
            nome = $(elem).attr('title') || $(elem).find('img').attr('alt') || nome;
          }
          
          if (nome && nome.length >= 3) {
            const nomeLimpo = this.limparTituloJogo(nome.trim());
            
            // Log se o título foi modificado
            if (nomeLimpo !== nome.trim()) {
              console.log(`   🧹 Título limpo: "${nome}" → "${nomeLimpo}"`);
            }
            
            jogosPagina.push({
              nome: nomeLimpo,
              url: urlCompleta
            });
          }
        }
      });
      
      if (jogosPagina.length === 0) {
        tentativasSemJogos++;
        if (tentativasSemJogos >= 2) {
          temMaisPaginas = false;
          break;
        }
      } else {
        tentativasSemJogos = 0; // Reset contador
        
        // Adicionar jogos encontrados (evitar duplicatas)
        jogosPagina.forEach(jogo => {
          if (!todosJogos.find(j => j.url === jogo.url)) {
            todosJogos.push(jogo);
          }
        });
        
        // Verificar se há mais páginas
        const temProximaPagina = $('a.next, a[rel="next"]').length > 0;
        const linksPagina = $('.pagination a, .page-numbers a, .paging a');
        let maiorPagina = paginaAtual;
        
        linksPagina.each((i, elem) => {
          const texto = $(elem).text().trim();
          const href = $(elem).attr('href') || '';
          const numPagina = parseInt(texto) || parseInt(href.match(/page[\/=](\d+)/i)?.[1] || '0');
          
          if (numPagina > maiorPagina) {
            maiorPagina = numPagina;
          }
        });
        
        // Decidir se continua
        if (maiorPagina > paginaAtual) {
          paginaAtual = maiorPagina;
          temMaisPaginas = true;
        } else if (temProximaPagina) {
          paginaAtual++;
          temMaisPaginas = true;
        } else {
          // Tentar próxima página sequencial
          paginaAtual++;
          // Limitar a 100 páginas por segurança
          if (paginaAtual > 100) {
            temMaisPaginas = false;
          }
        }
      }
      
      // Delay entre páginas (menos agressivo)
      await this.sleep(this.delay);
    }
    
    return todosJogos;
  }

  /**
   * Extrai jogos de uma página específica
   */
  async extrairJogosDaPagina(url) {
    const $ = await this.fetchPage(url);
    if (!$) return [];
    
    const jogos = [];
    const urlsVistas = new Set(); // Evitar duplicatas
    
    // Encontrar links que parecem ser de jogos
    $('a[href]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (!href) return;
      
      const urlCompleta = href.startsWith('http') ? href : this.baseUrl + href;
      
      // Filtrar links que são jogos (não categorias, tags, etc)
      if (this.ehLinkDeJogo(urlCompleta) && !urlsVistas.has(urlCompleta)) {
        urlsVistas.add(urlCompleta);
        
        let nome = $(elem).text().trim();
        
        // Se o nome estiver vazio ou muito curto, tentar extrair da URL
        if (!nome || nome.length < 3) {
          const urlParts = urlCompleta.split('/').filter(p => p);
          nome = urlParts[urlParts.length - 1] || nome;
          nome = nome.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        
        // Também tentar pegar do title ou alt da imagem
        if (!nome || nome.length < 3) {
          nome = $(elem).attr('title') || $(elem).find('img').attr('alt') || nome;
        }
        
        if (nome && nome.length >= 3) {
          const nomeLimpo = this.limparTituloJogo(nome.trim());
          
          // Log se o título foi modificado
          if (nomeLimpo !== nome.trim()) {
            console.log(`   🧹 Título limpo: "${nome}" → "${nomeLimpo}"`);
          }
          
          jogos.push({
            nome: nomeLimpo,
            url: urlCompleta
          });
        }
      }
    });
    
    return jogos;
  }
  
  /**
   * Busca jogos por termo (método melhorado)
   */
  async buscarJogosPorTermo(termo) {
    const jogos = [];
    const urlsVistas = new Set();
    
    // 1. Buscar na página de resultados
    const searchUrl = `${this.baseUrl}/?s=${encodeURIComponent(termo)}`;
    console.log(`   🔍 Buscando em: ${searchUrl}`);
    
    try {
      const $ = await this.fetchPage(searchUrl);
      if (!$) {
        console.log(`   ⚠️ Não foi possível carregar a página de busca`);
        return jogos;
      }
      // Buscar em diferentes seletores comuns
      const seletores = [
        'article a[href]',
        '.post a[href]',
        '.entry-title a[href]',
        'h2 a[href]',
        'h3 a[href]',
        'a[href*="/"]'
      ];
      
      seletores.forEach(seletor => {
        $(seletor).each((i, elem) => {
          const href = $(elem).attr('href');
          if (!href) return;
          
          const urlCompleta = href.startsWith('http') ? href : this.baseUrl + href;
          
          if (this.ehLinkDeJogo(urlCompleta) && !urlsVistas.has(urlCompleta)) {
            urlsVistas.add(urlCompleta);
            
            let nome = $(elem).text().trim();
            
            // Se não tiver nome, tentar pegar do elemento pai
            if (!nome || nome.length < 3) {
              nome = $(elem).parent().text().trim() || 
                     $(elem).closest('article').find('h1, h2, h3').first().text().trim() ||
                     $(elem).attr('title') || '';
            }
            
            // Se ainda não tiver, extrair da URL
            if (!nome || nome.length < 3) {
              const urlParts = urlCompleta.split('/').filter(p => p);
              nome = urlParts[urlParts.length - 1] || nome;
              nome = nome.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
            
            if (nome && nome.length >= 3) {
              const nomeLimpo = this.limparTituloJogo(nome.trim());
              
              // Log se o título foi modificado
              if (nomeLimpo !== nome.trim()) {
                console.log(`   🧹 Título limpo: "${nome}" → "${nomeLimpo}"`);
              }
              
              jogos.push({
                nome: nomeLimpo,
                url: urlCompleta
              });
            }
          }
        });
      });
      
      // Remover duplicatas por URL
      const jogosUnicos = [];
      const urlsUnicas = new Set();
      
      for (const jogo of jogos) {
        if (jogo && jogo.url && !urlsUnicas.has(jogo.url)) {
          urlsUnicas.add(jogo.url);
          jogosUnicos.push(jogo);
        }
      }
      
      console.log(`   📊 Total de jogos únicos encontrados: ${jogosUnicos.length}`);
      return jogosUnicos;
    } catch (error) {
      console.error(`   ❌ Erro ao buscar jogos por termo "${termo}":`, error.message);
    }
    
    // 2. Se não encontrou nada, buscar na página principal e filtrar
    if (jogos.length === 0) {
      console.log(`   🔄 Nenhum resultado na busca, tentando página principal...`);
      try {
        const jogosPrincipal = await this.extrairJogosDaPagina(this.baseUrl);
        
        // Filtrar jogos que contenham o termo de busca
        const termoLower = termo.toLowerCase();
        const jogosFiltrados = jogosPrincipal.filter(jogo => {
          if (!jogo || !jogo.nome || !jogo.url) return false;
          const nomeLower = jogo.nome.toLowerCase();
          const urlLower = jogo.url.toLowerCase();
          return nomeLower.includes(termoLower) || urlLower.includes(termoLower);
        });
        
        jogos.push(...jogosFiltrados);
        console.log(`   📊 ${jogosFiltrados.length} jogos encontrados na página principal`);
      } catch (error) {
        console.error(`   ❌ Erro ao buscar na página principal:`, error.message);
      }
    }
    
    return jogos;
  }

  /**
   * Verifica se um link é de um jogo
   */
  ehLinkDeJogo(url) {
    if (!url.includes('pokopow.com')) return false;
    
    // Padrões para excluir
    const excluirPadroes = [
      '/category/',
      '/tag/',
      '/author/',
      '/page/',
      '/?page_id=',
      '/problem-guide',
      '/tip/',
      '#',
      'javascript:',
      'mailto:',
      'tel:'
    ];
    
    for (const padrao of excluirPadroes) {
      if (url.includes(padrao)) return false;
    }
    
    // Verificar se tem um path válido
    const path = url.replace('https://pokopow.com/', '').replace('http://pokopow.com/', '');
    if (!path || path.length < 3) return false;
    if (path === 'home' || path === 'index') return false;
    
    return true;
  }

  /**
   * Extrai credenciais de uma página de jogo
   */
  async extrairCredenciais(url) {
    const $ = await this.fetchPage(url);
    if (!$) return [];
    
    const credenciais = [];
    
    // Função auxiliar para extrair credenciais de um elemento
    const extrairDeElemento = (html, texto) => {
      // Padrões melhorados - mais flexíveis para capturar credenciais
      // Aceita USER: ou USER ou apenas o valor após dois pontos
      // Melhorado para capturar senhas que vêm após USER
      const padraoUser = /(?:USER\s*:?\s*|Username\s*:?\s*|Login\s*:?\s*)([^\s\n<PASS<>]+?)(?:\s*PASS|\s*Password|\s*Senha|\s*$|\n|<|USER|PASS)/gi;
      // Padrão melhorado para senha - captura valores alfanuméricos após PASS
      // Não captura "pass", "password" ou "senha" como valores
      const padraoPass = /(?:PASS\s*:?\s*|Password\s*:?\s*|Senha\s*:?\s*)(?![Pp][Aa][Ss][Ss]\b|password\b|senha\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})(?:\s*USER|\s*$|\n|<|USER|PASS|<\/|<\/span|<\/div)/gi;
      
      // Padrão combinado: USER valor PASS valor (em uma linha ou próximos)
      // Melhorado para não capturar "pass" como senha
      const padraoCombinado = /(?:USER|Username|Login)[\s:]*([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,50})[\s\n\r]*(?:PASS|Password|Senha)[\s:]+(?![Pp][Aa][Ss][Ss]\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})/gi;
      
      // Também procurar padrões sem "USER:" ou "PASS:" - apenas valores
      // Se encontrar múltiplos valores seguidos, pode ser user/pass
      const padraoValores = /([a-zA-Z0-9_\-\.]{3,20})\s+(?:USER|PASS|:)/gi;
      
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
        
        // Validações para usuário
        const userValido = user && user.length > 2 &&
            userLower !== 'pass' && userLower !== 'password' && userLower !== 'user' && userLower !== 'login' &&
            !userLower.startsWith('pass') && !userLower.endsWith('pass') &&
            (!/\bpass\b/i.test(user) || user.length > 10);
        
        // Validações para senha
        const passValido = pass && pass.length > 2 &&
            passLower !== 'pass' && passLower !== 'password' && passLower !== 'senha' &&
            !passLower.startsWith('pass') && !passLower.endsWith('pass') &&
            (!/\bpass\b/i.test(pass) || pass.length > 10) &&
            !passLower.includes('user') && !passLower.includes('login');
        
        if (userValido && passValido) {
          paresCombinados.push({ user, pass });
        }
      });
      
      // Limpar e filtrar resultados
      const users = [...new Set(matchesUser.map(m => {
        let user = m[1].trim();
        // Remover "PASS", "USER", "LOGIN" se aparecer no final/início
        user = user.replace(/PASS$/i, '').replace(/^PASS/i, '').trim();
        user = user.replace(/USER$/i, '').replace(/^USER/i, '').trim();
        user = user.replace(/LOGIN$/i, '').replace(/^LOGIN/i, '').trim();
        // Remover caracteres especiais no início/fim
        user = user.replace(/^[:\s\-]+|[:\s\-]+$/g, '').trim();
        return user;
      }).filter(u => u && u.length > 2 && !u.toLowerCase().includes('pass') && !u.toLowerCase().includes('user') && !u.toLowerCase().includes('login')))];

      const passes = [...new Set(matchesPass.map(m => {
        let pass = m[1].trim();
        
        // Rejeitar imediatamente se for apenas "pass", "password" ou "senha"
        if (/^(pass|password|senha)$/i.test(pass)) {
          return null;
        }
        
        // Remover espaços e caracteres inválidos
        pass = pass.replace(/^[:\s\-]+|[:\s\-]+$/g, '').trim();
        
        // Se após limpeza ficou vazio ou é "pass", rejeitar
        if (!pass || /^(pass|password|senha)$/i.test(pass)) {
          return null;
        }
        
        // Remover "PASS", "PASSWORD", "SENHA" se aparecer no início ou fim
        pass = pass.replace(/^PASS$/i, '').replace(/PASS$/i, '').trim();
        pass = pass.replace(/^PASSWORD$/i, '').replace(/PASSWORD$/i, '').trim();
        pass = pass.replace(/^SENHA$/i, '').replace(/SENHA$/i, '').trim();
        
        // Se após remover ficou vazio, rejeitar
        if (!pass) {
          return null;
        }
        
        // Remover "USER", "LOGIN" se aparecer na senha
        pass = pass.replace(/USER/gi, '').replace(/LOGIN/gi, '').trim();
        
        // Remover se começar ou terminar com "pass"
        pass = pass.replace(/^pass\s+/i, '').replace(/\s+pass$/i, '').trim();
        
        return pass;
      }).filter(p => {
        // Validação mais rigorosa
        if (!p || p.length < 3) return false;
        const pLower = p.toLowerCase();
        // Rejeitar se for exatamente "pass", "password", "senha"
        if (pLower === 'pass' || pLower === 'password' || pLower === 'senha') return false;
        // Rejeitar se começar ou terminar com "pass"
        if (pLower.startsWith('pass') || pLower.endsWith('pass')) return false;
        // Rejeitar se contiver apenas "pass" como palavra completa
        if (/\bpass\b/i.test(p) && p.length <= 10) return false;
        return true;
      }))];
      
      // Se não encontrou senhas mas encontrou usuários, tentar buscar padrões alternativos
      if (users.length > 0 && passes.length === 0) {
        // Estratégia 1: Buscar padrão USER valor PASS valor (mesmo que não esteja na mesma linha)
        const padraoUserPass = /(?:USER|Username|Login)[\s:]*([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,50})[\s\n\r]*(?:PASS|Password|Senha)[\s:]+([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})/gi;
        const matchesUserPass = [...htmlNormalizado.matchAll(padraoUserPass), ...texto.matchAll(padraoUserPass)];
        
        matchesUserPass.forEach(m => {
          const userVal = m[1].trim();
          let passVal = m[2].trim();
          
          // Limpar passVal
          passVal = passVal.replace(/^[:\s\-]+|[:\s\-]+$/g, '').trim();
          
          // Se o usuário encontrado corresponde a um dos usuários conhecidos
          if (users.some(u => u === userVal || u.toLowerCase() === userVal.toLowerCase())) {
            // Validar senha rigorosamente
            const passLower = passVal.toLowerCase();
            if (passVal.length > 2 && 
                passLower !== 'pass' && passLower !== 'password' && passLower !== 'senha' &&
                !passLower.startsWith('pass') && !passLower.endsWith('pass') &&
                !/\bpass\b/i.test(passVal) || passVal.length > 10) {
              if (!passes.includes(passVal)) {
                passes.push(passVal);
              }
            }
          }
        });
        
        // Estratégia 2: Se ainda não encontrou, procurar por padrões como: valor1 valor2
        if (passes.length === 0) {
          const padraoDuplo = /([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,50})\s+([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})/g;
          const matchesDuplo = [...htmlNormalizado.matchAll(padraoDuplo), ...texto.matchAll(padraoDuplo)];
          
          matchesDuplo.forEach(m => {
            const val1 = m[1].trim();
            const val2 = m[2].trim();
            
            // Se val1 é um usuário conhecido, val2 pode ser senha
            if (users.some(u => u === val1 || u.toLowerCase() === val1.toLowerCase()) && val2.length > 3) {
              const val2Lower = val2.toLowerCase();
              if (val2Lower !== 'pass' && val2Lower !== 'password' && val2Lower !== 'senha' &&
                  !val2Lower.startsWith('pass') && !val2Lower.endsWith('pass') &&
                  (!/\bpass\b/i.test(val2) || val2.length > 10)) {
                if (!passes.includes(val2)) {
                  passes.push(val2);
                }
              }
            }
          });
        }
      }
      
      // Retornar pares combinados + usuários e senhas individuais
      return { users, passes, paresCombinados };
    };
    
    // 0. Busca específica: procurar por padrões onde há um valor real após PASS (não apenas "pass")
    // Buscar em elementos que contenham USER e PASS próximos
    $('div, span, button, p').each((i, elem) => {
      const texto = $(elem).text() || '';
      
      // Se contém USER e PASS no texto
      if (texto.toUpperCase().includes('USER') && texto.toUpperCase().includes('PASS')) {
        // Buscar padrão mais específico: PASS: valor (onde valor não começa com "pass")
        // Procura por pelo menos 3 caracteres alfanuméricos após PASS:
        const padraoPassValor = /PASS\s*:?\s*(?![Pp][Aa][Ss][Ss]\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})(?:\s|$|\n|<|USER|<\/)/gi;
        const matchesPass = [...texto.matchAll(padraoPassValor)];
        
        matchesPass.forEach(m => {
          let passVal = m[1].trim();
          
          // Limpar
          passVal = passVal.replace(/^[:\s\-]+|[:\s\-]+$/g, '').trim();
          const passLower = passVal.toLowerCase();
          
          // Só adicionar se não for "pass", "password" ou "senha"
          if (passVal.length > 2 && 
              passLower !== 'pass' && passLower !== 'password' && passLower !== 'senha' &&
              !passLower.startsWith('pass') && !passLower.endsWith('pass') &&
              (!/\bpass\b/i.test(passVal) || passVal.length > 10)) {
            // Buscar usuário correspondente no mesmo elemento
            const padraoUserValor = /USER\s*:?\s*(?![Uu][Ss][Ee][Rr]\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,50})(?:\s|$|\n|<|PASS|<\/)/gi;
            const matchesUser = [...texto.matchAll(padraoUserValor)];
            
            matchesUser.forEach(mUser => {
              let userVal = mUser[1].trim();
              userVal = userVal.replace(/^[:\s\-]+|[:\s\-]+$/g, '').trim();
              
              if (userVal.length > 2 && 
                  userVal.toLowerCase() !== 'user' && userVal.toLowerCase() !== 'login' &&
                  userVal.toLowerCase() !== 'pass' && !userVal.toLowerCase().includes('pass')) {
                // Adicionar se não existir
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
          
          // Só adicionar se não existir já nos pares combinados
          if (user && !credenciais.find(c => c.user.toLowerCase() === user.toLowerCase())) {
            credenciais.push({ user, pass });
          }
        }
      } else if (users.length > 0 && passes.length === 0) {
        // Se só tem usuários, não adicionar sem senha (já foi tentado buscar senha)
        // Só adicionar se não tiver nenhuma credencial ainda
        if (credenciais.length === 0) {
          users.forEach(user => {
            if (user && !credenciais.find(c => c.user.toLowerCase() === user.toLowerCase())) {
              credenciais.push({ user, pass: '' });
            }
          });
        }
      } else if (passes.length > 0 && users.length === 0) {
        passes.forEach(pass => {
          if (pass && !credenciais.find(c => c.pass === pass)) {
            credenciais.push({ user: '', pass });
          }
        });
      }
    });
    
    // 2. Procurar dentro de botões/span que contenham "LOGIN" ou "login"
    // Buscar especificamente por <span>LOGIN</span> e elementos próximos
    $('span, button, a, div').each((i, elem) => {
      const texto = $(elem).text() || '';
      const html = $(elem).html() || '';
      const textoUpper = texto.toUpperCase();
      const htmlUpper = html.toUpperCase();
      
      // Verificar se contém "LOGIN" (case insensitive)
      if (textoUpper.includes('LOGIN') || htmlUpper.includes('LOGIN')) {
        // Buscar credenciais dentro deste elemento, seus filhos e elementos próximos
        const htmlCompleto = $(elem).html() || '';
        const textoCompleto = $(elem).text() || '';
        
        // Também buscar no elemento pai e irmãos
        const elementoPai = $(elem).parent();
        const htmlPai = elementoPai.html() || '';
        const textoPai = elementoPai.text() || '';
        
        // Combinar HTML e texto
        const htmlCombinado = htmlCompleto + ' ' + htmlPai;
        const textoCombinado = textoCompleto + ' ' + textoPai;
        
        const { users, passes, paresCombinados } = extrairDeElemento(htmlCombinado, textoCombinado);
        
        // Adicionar pares combinados primeiro
        paresCombinados.forEach(par => {
          if (par.user && par.pass && !credenciais.find(c => c.user.toLowerCase() === par.user.toLowerCase())) {
            credenciais.push(par);
          }
        });
        
        // Adicionar credenciais encontradas
        if (users.length > 0 && passes.length > 0) {
          const maxLen = Math.max(users.length, passes.length);
          for (let i = 0; i < maxLen; i++) {
            const user = users[i] || users[0] || '';
            const pass = passes[i] || passes[0] || '';
            
            // Verificar se já não existe
            if (user && user.length > 2 && pass && pass.length > 2 &&
                !credenciais.find(c => c.user.toLowerCase() === user.toLowerCase())) {
              credenciais.push({ user, pass });
            }
          }
        } else if (users.length > 0 && passes.length === 0) {
          // Só adicionar usuários sem senha se não tiver nenhuma credencial ainda
          if (credenciais.length === 0) {
            users.forEach(user => {
              if (user && user.length > 2 && !credenciais.find(c => c.user.toLowerCase() === user.toLowerCase())) {
                credenciais.push({ user, pass: '' });
              }
            });
          }
        } else if (passes.length > 0) {
          passes.forEach(pass => {
            if (pass && pass.length > 2 && !credenciais.find(c => c.pass === pass)) {
              credenciais.push({ user: '', pass });
            }
          });
        }
      }
    });
    
    // 2.5. Buscar especificamente em elementos que contenham <span>LOGIN</span>
    // Buscar todos os spans que contenham LOGIN
    $('span').each((i, elem) => {
      const $elem = $(elem);
      const texto = $elem.text() || '';
      const html = $elem.html() || '';
      
      if (texto.toUpperCase().includes('LOGIN') || html.toUpperCase().includes('LOGIN')) {
        // Buscar no elemento pai completo (container do botão)
        const $pai = $elem.parent();
        const $avo = $pai.parent();
        
        // Combinar HTML do span, pai e avô
        let htmlContexto = html + ' ' + $pai.html() + ' ' + $avo.html();
        let textoContexto = texto + ' ' + $pai.text() + ' ' + $avo.text();
        
        // Também buscar nos irmãos próximos
        const $proximos = $pai.nextAll().slice(0, 5);
        $proximos.each((j, prox) => {
          htmlContexto += ' ' + $(prox).html();
          textoContexto += ' ' + $(prox).text();
        });
        
        const { users, passes, paresCombinados } = extrairDeElemento(htmlContexto, textoContexto);
        
        // Adicionar pares combinados primeiro
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
    
    // 3. Procurar em elementos com atributos data-* ou aria-* que possam conter credenciais
    $('[data-login], [aria-label*="login" i], [title*="login" i]').each((i, elem) => {
      const html = $(elem).html() || '';
      const texto = $(elem).text() || '';
      const { users, passes, paresCombinados } = extrairDeElemento(html, texto);
      
      // Adicionar pares combinados primeiro
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
    });
    
    // 4. Buscar em TODA a página HTML completa (última tentativa)
    const htmlCompleto = $.html();
    const textoCompleto = $.text();
    const { users: usersCompleto, passes: passesCompleto, paresCombinados: paresCompletos } = extrairDeElemento(htmlCompleto, textoCompleto);
    
    // Adicionar pares combinados primeiro
    paresCompletos.forEach(par => {
      if (par.user && par.pass && !credenciais.find(c => c.user.toLowerCase() === par.user.toLowerCase())) {
        credenciais.push(par);
      }
    });
    
    if (usersCompleto.length > 0 && passesCompleto.length > 0) {
      const maxLen = Math.max(usersCompleto.length, passesCompleto.length);
      for (let i = 0; i < maxLen; i++) {
        const user = usersCompleto[i] || usersCompleto[0] || '';
        const pass = passesCompleto[i] || passesCompleto[0] || '';
        
        // Validar antes de adicionar
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
          if (!credenciais.find(c => c.user.toLowerCase() === user.toLowerCase())) {
            credenciais.push({ user, pass });
          }
        }
      }
    }
    
    // 5. Buscar padrões alternativos em toda a página
    // Padrão: USER valor PASS valor (em qualquer ordem)
    // Melhorado para não capturar "pass" como senha
    const padraoAlternativo = /(?:USER|Username|Login)[\s:]*([a-zA-Z0-9_\-\.]{3,40})[\s\n\r]*(?:PASS|Password|Senha)[\s:]+(?![Pp][Aa][Ss][Ss]\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})/gi;
    const matchesAlt = [...htmlCompleto.matchAll(padraoAlternativo), ...textoCompleto.matchAll(padraoAlternativo)];
    
    matchesAlt.forEach(m => {
      let user = m[1].trim();
      let pass = m[2].trim();
      
      // Limpar valores inválidos
      user = user.replace(/PASS$/i, '').replace(/^PASS/i, '').replace(/USER$/i, '').replace(/^USER/i, '').trim();
      pass = pass.replace(/PASS$/i, '').replace(/^PASS/i, '').replace(/USER$/i, '').replace(/^USER/i, '').trim();
      
      // Validar antes de adicionar
      const userValido = user && user.length > 2 && 
                         user.toLowerCase() !== 'pass' && user.toLowerCase() !== 'password' &&
                         user.toLowerCase() !== 'user' && user.toLowerCase() !== 'login' &&
                         !user.toLowerCase().includes('pass') && !user.toLowerCase().includes('user');
      
      const passValido = pass && pass.length > 2 &&
                         pass.toLowerCase() !== 'pass' && pass.toLowerCase() !== 'password' &&
                         pass.toLowerCase() !== 'senha' &&
                         !pass.toLowerCase().includes('user') && !pass.toLowerCase().includes('login');
      
      if (userValido && passValido && 
          !credenciais.find(c => c.user.toLowerCase() === user.toLowerCase())) {
        credenciais.push({ user, pass });
      }
    });
    
    // Remover duplicatas e filtrar credenciais inválidas
    const credenciaisUnicas = [];
    const usuariosVistos = new Set();
    
    for (const cred of credenciais) {
      // Validar credenciais antes de adicionar (mais rigoroso)
      const userLower = cred.user ? cred.user.trim().toLowerCase() : '';
      const passLower = cred.pass ? cred.pass.trim().toLowerCase() : '';
      
      const userValido = cred.user && 
                        cred.user.trim().length > 2 && 
                        userLower !== 'pass' && userLower !== 'password' && userLower !== 'senha' &&
                        userLower !== 'user' && userLower !== 'login' &&
                        !userLower.startsWith('pass') && !userLower.endsWith('pass') &&
                        (!/\bpass\b/i.test(cred.user.trim()) || cred.user.trim().length > 10);
      
      const passValido = cred.pass && 
                         cred.pass.trim().length > 2 &&
                         passLower !== 'pass' && passLower !== 'password' &&
                         passLower !== 'senha' &&
                         !passLower.startsWith('pass') && !passLower.endsWith('pass') &&
                         (!/\bpass\b/i.test(cred.pass.trim()) || cred.pass.trim().length > 10) &&
                         !passLower.includes('user') && !passLower.includes('login');
      
      if (userValido && passValido && !usuariosVistos.has(cred.user.toLowerCase())) {
        usuariosVistos.add(cred.user.toLowerCase());
        credenciaisUnicas.push({
          user: cred.user.trim(),
          pass: cred.pass.trim()
        });
      }
    }
    
    return credenciaisUnicas;
  }

  /**
   * Extrai credenciais de todos os jogos
   */
  async extrairCredenciaisTodosJogos(jogos) {
    console.log(`\n🔐 Extraindo credenciais de ${jogos.length} jogos...\n`);
    
    const todasCredenciais = [];
    
    for (let i = 0; i < jogos.length; i++) {
      const jogo = jogos[i];
      console.log(`[${i + 1}/${jogos.length}] ${jogo.nome}`);
      
      const credenciais = await this.extrairCredenciais(jogo.url);
      
      if (credenciais.length > 0) {
        console.log(`   ✅ ${credenciais.length} credencial(is) encontrada(s)`);
        credenciais.forEach(cred => {
          todasCredenciais.push({
            ...cred,
            jogo_nome: jogo.nome,
            jogo_url: jogo.url
          });
        });
      } else {
        console.log(`   ⚠️  Nenhuma credencial encontrada`);
      }
      
      // Delay entre requisições
      if (i < jogos.length - 1) {
        await this.sleep(this.delay);
      }
    }
    
    console.log(`\n✅ Total de ${todasCredenciais.length} credenciais extraídas!`);
    return todasCredenciais;
  }

  /**
   * Função auxiliar para delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Limpa títulos genéricos dos jogos
   */
  limparTituloJogo(titulo) {
    if (!titulo || typeof titulo !== 'string') return titulo;
    
    let tituloLimpo = titulo.trim();
    
    // Remover frases completas genéricas (mais específico)
    const frasesGenericas = [
      'Free Steam Accounts',
      'Steam Accounts',
      'Free Steam Account',
      'Steam Account',
      'Free Accounts',
      'Free Account',
      'Steam Keys',
      'Steam Key',
      'Free Download',
      'Full Version',
      'PC Games',
      'PC Game',
      'Full Game'
    ];
    
    frasesGenericas.forEach(frase => {
      const regex = new RegExp(`\\b${frase}\\b`, 'gi');
      tituloLimpo = tituloLimpo.replace(regex, '');
    });
    
    // Remover termos específicos só se estão isolados ou no final
    const termosEspecificos = [
      { termo: 'CDKeys', posicao: 'qualquer' },
      { termo: 'cdkeys', posicao: 'qualquer' },
      { termo: 'CDKEYS', posicao: 'qualquer' },
      { termo: 'Accounts', posicao: 'fim' },
      { termo: 'Keys', posicao: 'fim' },
      { termo: 'Key', posicao: 'fim' },
      { termo: 'Download', posicao: 'fim' },
      { termo: 'Cracked', posicao: 'qualquer' },
      { termo: 'Crack', posicao: 'qualquer' },
      { termo: 'Torrent', posicao: 'qualquer' }
    ];
    
    // Tratar "Account" de forma especial - só remover se não for parte do nome
    // Ex: "Minecraft Account Free" → remover "Free", manter "Account" se fizer sentido
    if (tituloLimpo.includes('Account Free')) {
      tituloLimpo = tituloLimpo.replace(/\s+Account\s+Free\s*$/gi, '');
    } else if (tituloLimpo.match(/\s+Account\s*$/i)) {
      tituloLimpo = tituloLimpo.replace(/\s+Account\s*$/gi, '');
    }
    
    termosEspecificos.forEach(({ termo, posicao }) => {
      if (posicao === 'fim') {
        // Remover apenas se estiver no final
        const regex = new RegExp(`\\s+${termo}\\s*$`, 'gi');
        tituloLimpo = tituloLimpo.replace(regex, '');
      } else {
        // Remover em qualquer posição
        const regex = new RegExp(`\\b${termo}\\b`, 'gi');
        tituloLimpo = tituloLimpo.replace(regex, '');
      }
    });
    
    // NÃO remover "Game" genérico pois pode ser parte do nome real
    // Ex: "Friday The 13th The Game" deve manter "Game"
    
    // Remover separadores comuns no início/fim
    const separadores = ['-', '–', '—', '|', ':', '•', '·', '►', '»', '>', '<'];
    separadores.forEach(sep => {
      const regexInicio = new RegExp(`^\\s*\\${sep}+\\s*`, 'g');
      const regexFim = new RegExp(`\\s*\\${sep}+\\s*$`, 'g');
      tituloLimpo = tituloLimpo.replace(regexInicio, '').replace(regexFim, '');
    });
    
    // Remover múltiplos espaços e espaços no início/fim
    tituloLimpo = tituloLimpo.replace(/\s+/g, ' ').trim();
    
    // Se ficou vazio ou muito pequeno, retornar o original
    if (!tituloLimpo || tituloLimpo.length < 2) {
      return titulo.trim();
    }
    
    return tituloLimpo;
  }
}

module.exports = PokopowScraper;

