/**
 * Serviço para tentar buscar credenciais diretamente do frontend
 * Se CORS bloquear, retorna null para usar fallback do backend
 * 
 * PARA DESABILITAR: Mude USE_FRONTEND_SCRAPER para false
 */
const USE_FRONTEND_SCRAPER = true; // ⚙️ Mude para false para desabilitar

/**
 * Tenta buscar credenciais diretamente do pokopow.com via frontend
 * @param {string} url - URL do jogo no pokopow.com
 * @returns {Promise<Array>} Array de credenciais ou null se falhar
 */
export async function buscarCredenciaisFrontend(url) {
  if (!USE_FRONTEND_SCRAPER) {
    return null; // Desabilitado, usar backend
  }

  if (!url || !url.includes('pokopow.com')) {
    return null;
  }

  try {
    console.log('🌐 [FRONTEND] Tentando buscar credenciais pelo frontend (IP do usuário)...');
    console.log('🌐 [FRONTEND] URL:', url);
    
    // Tentar fazer requisição direta
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': navigator.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      mode: 'cors', // Tentar CORS
      credentials: 'omit'
    });

    if (!response.ok) {
      console.log(`⚠️ [FRONTEND] Resposta não OK (${response.status}) do frontend, usando backend...`);
      return null;
    }

    const html = await response.text();
    console.log(`✅ [FRONTEND] HTML recebido (${html.length} caracteres), extraindo credenciais...`);
    
    // Extrair credenciais do HTML (mesma lógica do backend)
    const credenciais = extrairCredenciaisDoHTML(html);
    
    if (credenciais.length > 0) {
      console.log(`✅ [FRONTEND] Encontrou ${credenciais.length} conta(s)!`);
      return credenciais;
    }
    
    console.log('⚠️ [FRONTEND] Nenhuma credencial encontrada no HTML, usando backend...');
    return null;
  } catch (error) {
    // CORS bloqueou ou outro erro - usar backend
    console.error('❌ [FRONTEND] Erro ao buscar:', error);
    if (error.message.includes('CORS') || error.message.includes('cors') || error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      console.log('🚫 [FRONTEND] CORS bloqueado ou erro de rede, usando backend como fallback...');
    } else {
      console.log(`⚠️ [FRONTEND] Erro no frontend (${error.message}), usando backend...`);
    }
    return null;
  }
}

/**
 * Extrai credenciais do HTML (lógica similar ao backend)
 * Baseado na função extrairCredenciais do backend/services/pokopowScraper.js
 */
function extrairCredenciaisDoHTML(html) {
  const credenciais = [];
  
  if (!html || html.length < 100) {
    return credenciais;
  }
  
  // Normalizar HTML (remover quebras de linha e espaços extras)
  const htmlNormalizado = html.replace(/\s+/g, ' ').replace(/\n/g, ' ');
  const texto = htmlNormalizado.toLowerCase();
  
  // Padrões para encontrar credenciais (mesma lógica do backend)
  // Padrão USER: valor PASS: valor
  const padraoUser = /(?:USER\s*:?\s*|Username\s*:?\s*|Login\s*:?\s*)([^\s\n<PASS<>]+?)(?:\s*PASS|\s*Password|\s*Senha|\s*$|\n|<|USER|PASS)/gi;
  const padraoPass = /(?:PASS\s*:?\s*|Password\s*:?\s*|Senha\s*:?\s*)(?![Pp][Aa][Ss][Ss]\b|password\b|senha\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})(?:\s*USER|\s*$|\n|<|USER|PASS|<\/|<\/span|<\/div)/gi;
  
  // Padrão combinado: USER valor PASS valor (em uma linha ou próximos)
  const padraoCombinado = /(?:USER|Username|Login)[\s:]*([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,50})[\s\n\r]*(?:PASS|Password|Senha)[\s:]+(?![Pp][Aa][Ss][Ss]\b)([a-zA-Z0-9_\-\.@#$%&*!+=\[\]{}]{3,60})/gi;
  
  // Buscar matches
  const matchesUser = [...htmlNormalizado.matchAll(padraoUser)];
  const matchesPass = [...htmlNormalizado.matchAll(padraoPass)];
  const matchesCombinados = [...htmlNormalizado.matchAll(padraoCombinado)];
  
  // Processar matches combinados primeiro (mais confiáveis)
  matchesCombinados.forEach(match => {
    let user = match[1]?.trim();
    let pass = match[2]?.trim();
    
    if (user && pass) {
      // Limpar valores
      user = user.replace(/PASS$/i, '').replace(/^PASS/i, '').replace(/USER$/i, '').replace(/^USER/i, '').trim();
      pass = pass.replace(/USER$/i, '').replace(/^USER/i, '').trim();
      
      // Validar
      if (user.length >= 3 && user.length <= 50 && pass.length >= 3 && pass.length <= 60) {
        // Verificar se não é duplicata
        const jaExiste = credenciais.some(c => c.user.toLowerCase() === user.toLowerCase());
        if (!jaExiste) {
          credenciais.push({ user, pass });
        }
      }
    }
  });
  
  // Se não encontrou matches combinados, tentar combinar USER e PASS separados
  if (credenciais.length === 0 && matchesUser.length > 0 && matchesPass.length > 0) {
    const minLength = Math.min(matchesUser.length, matchesPass.length);
    for (let i = 0; i < minLength; i++) {
      let user = matchesUser[i][1]?.trim();
      let pass = matchesPass[i][1]?.trim();
      
      if (user && pass) {
        user = user.replace(/PASS$/i, '').replace(/^PASS/i, '').replace(/USER$/i, '').replace(/^USER/i, '').trim();
        pass = pass.replace(/USER$/i, '').replace(/^USER/i, '').trim();
        
        if (user.length >= 3 && user.length <= 50 && pass.length >= 3 && pass.length <= 60) {
          const jaExiste = credenciais.some(c => c.user.toLowerCase() === user.toLowerCase());
          if (!jaExiste) {
            credenciais.push({ user, pass });
          }
        }
      }
    }
  }
  
  return credenciais;
}

/**
 * Tenta buscar credenciais via proxy simples local (mais rápido que Puppeteer)
 * @param {string} url - URL do jogo no pokopow.com
 * @returns {Promise<Array>} Array de credenciais ou null se falhar
 */
export async function buscarCredenciaisViaProxySimples(url) {
  if (!url || !url.includes('pokopow.com')) {
    return null;
  }

  try {
    console.log('⚡ [PROXY-SIMPLES] Tentando buscar via proxy simples (rápido, sem Puppeteer)...');
    
    const proxyUrl = 'http://localhost:3003';
    
    // Verificar se o proxy está online (com timeout curto)
    try {
      const statusResponse = await fetch(`${proxyUrl}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      
      if (!statusResponse.ok) {
        console.log('⚠️ [PROXY-SIMPLES] Proxy simples não está respondendo');
        return null;
      }
    } catch (error) {
      console.log('⚠️ [PROXY-SIMPLES] Proxy simples não está rodando (localhost:3003)');
      return null;
    }

    // Se está online, fazer a busca
    const response = await fetch(`${proxyUrl}/buscar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(30000) // 30 segundos
    });

    if (!response.ok) {
      console.log(`⚠️ [PROXY-SIMPLES] Proxy simples retornou erro (${response.status})`);
      return null;
    }

    const data = await response.json();
    
    if (data.credenciais && Array.isArray(data.credenciais) && data.credenciais.length > 0) {
      console.log(`✅ [PROXY-SIMPLES] Proxy simples encontrou ${data.credenciais.length} conta(s)!`);
      return data.credenciais;
    }
    
    // Melhorar mensagem de erro
    if (data.erro) {
      console.log(`⚠️ [PROXY-SIMPLES] Proxy simples retornou erro: ${data.erro}`);
    } else if (data.encontradas === 0) {
      console.log(`⚠️ [PROXY-SIMPLES] Proxy simples não encontrou credenciais na página`);
    } else {
      console.log(`⚠️ [PROXY-SIMPLES] Proxy simples não encontrou credenciais`);
    }
    
    return null;
  } catch (error) {
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      console.log('⏰ [PROXY-SIMPLES] Timeout ao chamar proxy simples');
    } else {
      console.log(`⚠️ [PROXY-SIMPLES] Erro ao chamar proxy simples: ${error.message}`);
    }
    return null;
  }
}

/**
 * Tenta buscar credenciais via serviço local (Puppeteer no PC do usuário)
 * @param {string} url - URL do jogo no pokopow.com
 * @param {number} jogoId - ID do jogo
 * @param {string} jogoNome - Nome do jogo
 * @returns {Promise<Array>} Array de credenciais ou null se falhar
 */
export async function buscarCredenciaisViaServicoLocal(url, jogoId, jogoNome) {
  if (!url || !jogoId || !jogoNome) {
    return null;
  }

  try {
    console.log('🖥️ [LOCAL] Tentando buscar via serviço local (Puppeteer no seu PC)...');
    
    const localServiceUrl = 'http://localhost:3002';
    
    // Primeiro verificar se o serviço está online
    try {
      const statusResponse = await fetch(`${localServiceUrl}/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 segundos para verificar
      });
      
      if (!statusResponse.ok) {
        console.log('⚠️ [LOCAL] Serviço local não está respondendo');
        return null;
      }
    } catch (error) {
      console.log('⚠️ [LOCAL] Serviço local não está rodando (localhost:3002)');
      return null;
    }

    // Se está online, fazer a busca
    const response = await fetch(`${localServiceUrl}/buscar-contas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        jogoId,
        jogoNome
      }),
      signal: AbortSignal.timeout(60000) // 60 segundos (Puppeteer pode demorar)
    });

    if (!response.ok) {
      console.log(`⚠️ [LOCAL] Serviço local retornou erro (${response.status})`);
      return null;
    }

    const data = await response.json();
    
    if (data.credenciais && Array.isArray(data.credenciais) && data.credenciais.length > 0) {
      console.log(`✅ [LOCAL] Serviço local encontrou ${data.credenciais.length} conta(s)!`);
      return data.credenciais;
    }
    
    // Melhorar mensagem de erro
    if (data.erro) {
      console.log(`⚠️ [LOCAL] Serviço local retornou erro: ${data.erro}`);
    } else if (data.encontradas === 0) {
      console.log(`⚠️ [LOCAL] Serviço local não encontrou credenciais na página (pode não ter contas disponíveis)`);
    } else {
      console.log(`⚠️ [LOCAL] Serviço local não encontrou credenciais`);
    }
    
    return null;
  } catch (error) {
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      console.log('⏰ [LOCAL] Timeout ao chamar serviço local');
    } else {
      console.log(`⚠️ [LOCAL] Erro ao chamar serviço local: ${error.message}`);
    }
    return null;
  }
}

/**
 * Tenta buscar credenciais via proxy público (bypass CORS)
 * @param {string} url - URL do jogo no pokopow.com
 * @returns {Promise<Array>} Array de credenciais ou null se falhar
 */
export async function buscarCredenciaisViaProxyPublico(url) {
  if (!url || !url.includes('pokopow.com')) {
    return null;
  }

  const proxies = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  ];

  for (let i = 0; i < proxies.length; i++) {
    try {
      console.log(`🌐 [PROXY] Tentando proxy público ${i + 1}/${proxies.length}...`);
      
      const response = await fetch(proxies[i], {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(15000) // 15 segundos por proxy
      });

      if (!response.ok) {
        console.log(`⚠️ [PROXY] Proxy ${i + 1} falhou (${response.status})`);
        continue; // Tentar próximo proxy
      }

      // Tentar JSON primeiro (allorigins.win)
      let html = '';
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        try {
          const data = await response.json();
          if (data.contents) {
            html = data.contents; // allorigins.win
          } else {
            console.log(`⚠️ [PROXY] JSON sem campo 'contents' do proxy ${i + 1}`);
            continue;
          }
        } catch (e) {
          console.log(`⚠️ [PROXY] Erro ao parsear JSON do proxy ${i + 1}`);
          continue;
        }
      } else {
        // HTML direto (corsproxy.io ou codetabs)
        html = await response.text();
      }

      if (!html || html.length < 100) {
        console.log(`⚠️ [PROXY] HTML vazio do proxy ${i + 1}`);
        continue;
      }

      console.log(`✅ [PROXY] HTML recebido via proxy ${i + 1} (${html.length} caracteres)`);
      
      // Extrair credenciais do HTML
      const credenciais = extrairCredenciaisDoHTML(html);
      
      if (credenciais.length > 0) {
        console.log(`✅ [PROXY] Encontrou ${credenciais.length} conta(s) via proxy público!`);
        return credenciais;
      }
      
      console.log(`⚠️ [PROXY] Nenhuma credencial encontrada no HTML do proxy ${i + 1}`);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`⏰ [PROXY] Timeout no proxy ${i + 1}`);
      } else {
        console.log(`❌ [PROXY] Erro no proxy ${i + 1}: ${error.message}`);
      }
      // Continuar para próximo proxy
      continue;
    }
  }

  console.log('⚠️ [PROXY] Todos os proxies públicos falharam');
  return null;
}

