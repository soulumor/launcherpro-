const PokopowScraper = require('../services/pokopowScraper');
const { getDatabase } = require('../database/database');

/**
 * Controller para operações de busca
 */

/**
 * Busca jogos baseado em um termo
 * GET /api/busca?q=termo&site=true (site=true força busca online mesmo com muitos resultados no banco)
 */
exports.buscarJogos = async (req, res) => {
  const { q, site } = req.query;
  
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Termo de busca deve ter pelo menos 2 caracteres' });
  }

  const termo = q.trim().toLowerCase();
  const buscarNoSite = site === 'true' || site === true; // Forçar busca no site se solicitado
  const resultados = [];
  
  try {
    console.log(`🔍 Buscando jogos para: "${termo}" ${buscarNoSite ? '(banco + online)' : '(banco primeiro)'}`);
    
    // 1. PRIMEIRO: Buscar no banco de dados local (mais rápido e confiável)
    const db = getDatabase();
    const jogosBanco = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, nome FROM jogos 
         WHERE LOWER(nome) LIKE ?
         ORDER BY nome ASC
         LIMIT 20`,
        [`%${termo}%`],
        (err, rows) => {
          if (err) {
            console.error('Erro ao buscar no banco:', err);
            resolve([]);
          } else {
            console.log('🔍 Jogos encontrados no banco:', rows); // Debug
            resolve(rows || []);
          }
        }
      );
    });
    
    console.log(`📦 Encontrados ${jogosBanco.length} jogos no banco de dados`);
    
    // Adicionar jogos do banco aos resultados
    jogosBanco.forEach(jogo => {
      if (jogo.nome) {
        // Construir URL baseada no nome do jogo para manter compatibilidade
        const urlJogo = `https://gamesite.com/${jogo.nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
        resultados.push({
          id: jogo.id, // Incluir ID do banco para buscar credenciais
          nome: jogo.nome,
          url: urlJogo
        });
      }
    });
    
    // 2. SEGUNDO: Buscar online se solicitado OU se não encontrou muitos resultados
    const deveBuscarOnline = buscarNoSite || resultados.length < 5;
    
    if (deveBuscarOnline) {
      console.log(`🌐 Buscando online...`);
      try {
        const scraper = new PokopowScraper();
        const jogosSite = await scraper.buscarJogosPorTermo(termo);
        console.log(`✅ Encontrados ${jogosSite.length} jogos online`);
        
        if (jogosSite && jogosSite.length > 0) {
          // Adicionar jogos do site que não estão no banco
          const urlsExistentes = new Set(resultados.map(r => r.url));
          const nomesExistentes = new Set(resultados.map(r => r.nome.toLowerCase()));
          
          let jogosAdicionados = 0;
          jogosSite.forEach(jogo => {
            if (jogo && jogo.nome && jogo.nome.length >= 3 && jogo.url) {
              const nomeNormalizado = jogo.nome.trim().toLowerCase();
              // Verificar se não está duplicado por URL ou nome
              if (!urlsExistentes.has(jogo.url.trim()) && !nomesExistentes.has(nomeNormalizado)) {
                resultados.push({
                  nome: jogo.nome.trim(),
                  url: jogo.url.trim()
                });
                urlsExistentes.add(jogo.url.trim());
                nomesExistentes.add(nomeNormalizado);
                jogosAdicionados++;
              }
            }
          });
          console.log(`📥 ${jogosAdicionados} jogos novos online adicionados aos resultados`);
        } else {
          console.log(`⚠️ Nenhum jogo encontrado online para o termo "${termo}"`);
        }
      } catch (onlineError) {
        console.error('⚠️ Erro ao buscar online (continuando com resultados do banco):', onlineError.message);
        console.error('Stack:', onlineError.stack);
        // Continuar mesmo se der erro online - retornar pelo menos os resultados do banco
      }
    }
    
    // Limitar a 50 resultados quando busca online também
    const limite = buscarNoSite ? 50 : 20;
    const resultadosLimitados = resultados.slice(0, limite);
    
    console.log(`📤 Enviando ${resultadosLimitados.length} resultados totais`);
    
    res.json({
      termo: q.trim(),
      total: resultadosLimitados.length,
      origem: buscarNoSite ? 'local+online' : 'local',
      resultados: resultadosLimitados
    });
  } catch (error) {
    console.error('❌ Erro ao buscar jogos:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar jogos', 
      detalhes: error.message,
      resultados: [] // Sempre retornar array vazio em caso de erro
    });
  }
};

/**
 * Extrai credenciais de uma URL específica
 * GET /api/credenciais?url=url_do_jogo
 */
exports.extrairCredenciais = async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL inválida.' });
  }

  try {
    console.log(`🔍 Iniciando extração de credenciais para: ${url}`);
    const scraper = new PokopowScraper();
    
    // Extrair credenciais da página (com retry automático)
    const credenciais = await scraper.extrairCredenciais(url);
    
    console.log(`✅ Extração concluída. ${credenciais.length} credenciais encontradas.`);
    
    res.json({
      url,
      total: credenciais.length,
      credenciais: credenciais
    });
  } catch (error) {
    console.error('Erro ao extrair credenciais:', error);
    
    let mensagemErro = 'Erro ao extrair credenciais';
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      mensagemErro = 'Timeout: O servidor está demorando muito para responder. Tente novamente mais tarde.';
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      mensagemErro = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
    }
    
    res.status(500).json({ 
      error: mensagemErro,
      detalhes: error.message
    });
  }
};

