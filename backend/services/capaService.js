const https = require('https');

/**
 * Serviço para buscar capas de jogos automaticamente
 * Usa múltiplas fontes para encontrar a melhor capa
 */

/**
 * Faz uma requisição HTTP GET
 */
function fazerRequisicao(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Busca capa via RAWG.io API (gratuita, mas requer chave)
 * Se não tiver chave, usa busca alternativa
 */
async function buscarViaRAWG(nomeJogo) {
  // RAWG.io API key (pode ser configurada via variável de ambiente)
  const apiKey = process.env.RAWG_API_KEY || '';
  
  if (!apiKey) {
    return null; // Sem API key, pular esta fonte
  }
  
  try {
    const url = `https://api.rawg.io/api/games?search=${encodeURIComponent(nomeJogo)}&key=${apiKey}&page_size=1`;
    const response = await fazerRequisicao(url);
    
    if (response.results && response.results.length > 0) {
      const jogo = response.results[0];
      // RAWG.io retorna a imagem em background_image
      if (jogo.background_image) {
        return jogo.background_image;
      }
    }
  } catch (err) {
    console.log('Erro ao buscar via RAWG:', err.message);
  }
  
  return null;
}

/**
 * Mapeamento de jogos conhecidos com URLs de imagens
 * URLs de imagens de jogos populares de fontes confiáveis
 */
const jogosConhecidos = {
  'the witcher 3': 'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg',
  'the witcher 3: wild hunt': 'https://cdn.cloudflare.steamstatic.com/steam/apps/292030/header.jpg',
  'cyberpunk 2077': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg',
  'grand theft auto v': 'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg',
  'gta v': 'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg',
  'gta 5': 'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/header.jpg',
  'red dead redemption 2': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg',
  'rdr2': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg',
  'red dead redemption ii': 'https://cdn.cloudflare.steamstatic.com/steam/apps/1174180/header.jpg',
  'f1 2012': 'https://cdn.cloudflare.steamstatic.com/steam/apps/201280/header.jpg',
  'f1': 'https://cdn.cloudflare.steamstatic.com/steam/apps/201280/header.jpg'
};

/**
 * Busca capa oficial do Steam Store usando o nome do jogo
 * Tenta múltiplas variações do nome para melhorar a busca
 */
async function buscarCapaSteamStore(nomeJogo) {
  // Criar variações do nome para melhorar a busca
  const variacoes = [
    nomeJogo, // Nome original
    nomeJogo.replace(/\s+/g, ' ').trim(), // Normalizar espaços
    nomeJogo.split(':')[0].trim(), // Remover subtítulo após ":"
    nomeJogo.split('-')[0].trim(), // Remover subtítulo após "-"
    nomeJogo.replace(/\d+$/, '').trim(), // Remover números no final
  ];
  
  // Remover duplicatas
  const variacoesUnicas = [...new Set(variacoes.filter(v => v.length > 3))];
  
  for (const variacao of variacoesUnicas) {
    try {
      // API do Steam Store - busca por termo
      const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(variacao)}&l=portuguese&cc=BR`;
      
      const response = await fazerRequisicao(url);
      
      if (response && response.items && response.items.length > 0) {
        // Verificar se algum resultado corresponde bem ao nome
        for (const item of response.items.slice(0, 3)) { // Verificar os 3 primeiros resultados
          const nomeItem = (item.name || '').toLowerCase();
          const nomeBusca = nomeJogo.toLowerCase();
          
          // Verificar similaridade (se o nome do jogo está contido no resultado ou vice-versa)
          if (nomeItem.includes(nomeBusca.substring(0, Math.min(10, nomeBusca.length))) ||
              nomeBusca.includes(nomeItem.substring(0, Math.min(10, nomeItem.length)))) {
            
            // Encontrar o app ID
            const appId = item.id;
            if (appId) {
              // URL da capa oficial do Steam
              return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
            }
            
            // Fallback para imagens retornadas pela API
            if (item.tiny_image) {
              return item.tiny_image;
            }
            if (item.small_image) {
              return item.small_image;
            }
            if (item.medium_image) {
              return item.medium_image;
            }
          }
        }
        
        // Se não encontrou correspondência exata, usar o primeiro resultado
        const jogo = response.items[0];
        const appId = jogo.id;
        if (appId) {
          return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
        }
      }
    } catch (err) {
      // Continuar para próxima variação
      continue;
    }
  }
  
  return null;
}

/**
 * Busca capa usando URLs de imagens de jogos conhecidos
 * ou tenta buscar no Steam Store
 */
async function criarURLCapaInteligente(nomeJogo) {
  // Normalizar o nome do jogo para busca
  const nomeNormalizado = nomeJogo.toLowerCase().trim();
  
  // Verificar se o jogo está no mapeamento
  for (const [chave, url] of Object.entries(jogosConhecidos)) {
    if (nomeNormalizado.includes(chave) || chave.includes(nomeNormalizado)) {
      return url;
    }
  }
  
  // Tentar buscar no Steam Store com o nome original
  let capaSteam = await buscarCapaSteamStore(nomeJogo);
  
  // Se não encontrou, tentar com variações do nome
  if (!capaSteam) {
    // Tentar remover números e caracteres especiais
    const nomeSimplificado = nomeJogo
      .replace(/\d+/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (nomeSimplificado.length > 3 && nomeSimplificado !== nomeJogo) {
      capaSteam = await buscarCapaSteamStore(nomeSimplificado);
    }
  }
  
  // Se ainda não encontrou, tentar apenas a primeira palavra (para jogos com nomes longos)
  if (!capaSteam) {
    const primeiraPalavra = nomeJogo.split(/\s+/)[0];
    if (primeiraPalavra.length > 3) {
      capaSteam = await buscarCapaSteamStore(primeiraPalavra);
    }
  }
  
  // Tentar buscar com termos alternativos comuns
  if (!capaSteam) {
    const termosAlternativos = {
      'f1': 'Formula 1',
      'cod': 'Call of Duty',
      'gta': 'Grand Theft Auto',
      'rdr': 'Red Dead Redemption'
    };
    
    for (const [abrev, termoCompleto] of Object.entries(termosAlternativos)) {
      if (nomeJogo.toLowerCase().includes(abrev)) {
        capaSteam = await buscarCapaSteamStore(termoCompleto);
        if (capaSteam) break;
      }
    }
  }
  
  if (capaSteam) {
    console.log(`✅ Capa encontrada no Steam Store para: ${nomeJogo}`);
    return capaSteam;
  }
  
  // Se não encontrar, usar uma imagem genérica de jogo
  const nomeFormatado = nomeJogo
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .substring(0, 30)
    .trim();
  
  // Usar uma imagem genérica do Unsplash que sempre funciona
  return `https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=460&h=215&fit=crop`;
}

/**
 * Busca a capa de um jogo usando múltiplas fontes
 * @param {string} nomeJogo - Nome do jogo
 * @returns {Promise<string>} URL da capa encontrada
 */
async function buscarCapaJogo(nomeJogo) {
  if (!nomeJogo || nomeJogo.trim() === '') {
    return null;
  }

  const nomeLimpo = nomeJogo.trim();
  
  try {
    // Estratégia 1: Tentar buscar via RAWG.io (se tiver API key)
    const capaRAWG = await buscarViaRAWG(nomeLimpo);
    if (capaRAWG) {
      console.log(`✅ Capa encontrada via RAWG.io para: ${nomeLimpo}`);
      return capaRAWG;
    }
  } catch (err) {
    console.log('RAWG.io não disponível, usando busca alternativa...');
  }
  
  // Estratégia 2: Buscar no Steam Store e mapeamento
  try {
    const capaInteligente = await criarURLCapaInteligente(nomeLimpo);
    if (capaInteligente && !capaInteligente.includes('unsplash.com')) {
      console.log(`✅ Capa oficial encontrada para: ${nomeLimpo}`);
    } else {
      console.log(`🔍 Capa genérica gerada para: ${nomeLimpo}`);
    }
    return capaInteligente;
  } catch (err) {
    console.error('Erro ao buscar capa:', err);
    // Retornar uma URL placeholder se tudo falhar
    const nomeFormatado = nomeLimpo.substring(0, 20).replace(/[^a-zA-Z0-9\s]/g, '');
    return `https://via.placeholder.com/460x215/1b2838/66c0f4?text=${encodeURIComponent(nomeFormatado)}`;
  }
}

module.exports = {
  buscarCapaJogo
};

