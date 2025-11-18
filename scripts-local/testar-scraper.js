const puppeteer = require('puppeteer');
const axios = require('axios');

/**
 * Teste rápido do scraper local
 * Verifica se Puppeteer funciona e se consegue acessar o backend
 */

const BACKEND_URL = process.env.CLOUD_API_URL || 'https://launcherpro.onrender.com';

async function testar() {
  console.log('🧪 TESTE DO SCRAPER LOCAL\n');
  
  // Teste 1: Fazer login no backend
  console.log('1️⃣ Fazendo login no backend...');
  let token = null;
  try {
    const email = process.env.ADMIN_EMAIL || 'cursorsemanal@gmail.com';
    const senha = process.env.ADMIN_SENHA || 'Senha123';
    
    const response = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email,
      senha
    }, {
      timeout: 10000
    });
    
    token = response.data.token;
    console.log(`   ✅ Login realizado com sucesso!\n`);
  } catch (error) {
    console.error(`   ❌ Erro ao fazer login: ${error.response?.data?.error || error.message}`);
    console.error(`   💡 Verifique ADMIN_EMAIL e ADMIN_SENHA\n`);
    process.exit(1);
  }
  
  // Teste 2: Verificar conexão com backend
  console.log('2️⃣ Testando conexão com backend...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/jogos`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    const jogos = response.data || [];
    console.log(`   ✅ Backend conectado! Encontrados ${jogos.length} jogos no banco\n`);
  } catch (error) {
    console.error(`   ❌ Erro ao conectar com backend: ${error.message}`);
    console.error(`   💡 Verifique se o backend está rodando em: ${BACKEND_URL}\n`);
    process.exit(1);
  }
  
  // Teste 3: Verificar Puppeteer
  console.log('3️⃣ Testando Puppeteer...');
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('   ✅ Puppeteer iniciado!\n');
    
    // Teste 4: Acessar site pokopow.com
    console.log('4️⃣ Testando acesso ao site pokopow.com...');
    const page = await browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      await page.goto('https://pokopow.com', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      const title = await page.title();
      console.log(`   ✅ Site acessado! Título: "${title}"\n`);
      
      await page.close();
    } catch (error) {
      console.error(`   ⚠️  Erro ao acessar site: ${error.message}`);
      console.error(`   💡 O site pode estar bloqueando ou demorando para responder\n`);
      await page.close();
    }
    
  } catch (error) {
    console.error(`   ❌ Erro ao iniciar Puppeteer: ${error.message}`);
    console.error(`   💡 Verifique se o Chrome/Chromium está instalado\n`);
    if (browser) await browser.close();
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
  
  // Teste 5: Buscar um jogo de exemplo
  console.log('5️⃣ Testando busca de jogo de exemplo...');
  try {
    const response = await axios.get(`${BACKEND_URL}/api/jogos`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    const jogos = response.data || [];
    
    if (jogos.length > 0) {
      const jogoExemplo = jogos[0];
      console.log(`   📦 Jogo de exemplo: "${jogoExemplo.nome}" (ID: ${jogoExemplo.id})`);
      
      // Verificar contas do jogo
      const contasResponse = await axios.get(`${BACKEND_URL}/api/contas/${jogoExemplo.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      const contas = contasResponse.data || [];
      console.log(`   🔐 Contas no banco: ${contas.length}\n`);
      
      if (contas.length === 0) {
        console.log(`   💡 Este jogo não tem contas - seria um candidato para busca!\n`);
      }
    }
  } catch (error) {
    console.error(`   ❌ Erro ao buscar jogo: ${error.message}\n`);
  }
  
  console.log('✅ TESTE CONCLUÍDO!\n');
  console.log('💡 O scraper está pronto para rodar em segundo plano');
  console.log('   Execute: node buscar-contas-background.js\n');
}

// Executar teste
testar().catch(error => {
  console.error('\n❌ ERRO NO TESTE:', error.message);
  process.exit(1);
});

