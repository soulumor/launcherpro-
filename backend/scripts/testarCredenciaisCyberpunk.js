const PokopowScraper = require('../services/pokopowScraper');

(async () => {
  const scraper = new PokopowScraper();
  console.log('\n🔍 Testando extração de credenciais do Cyberpunk 2077...\n');
  
  try {
    const creds = await scraper.extrairCredenciais('https://pokopow.com/cyberpunk-2077');
    console.log(`✅ Credenciais encontradas: ${creds.length}\n`);
    
    if (creds.length > 0) {
      creds.forEach((c, i) => {
        console.log(`${i + 1}. USER: ${c.user || 'N/A'} | PASS: ${c.pass ? '***' : 'N/A'}`);
      });
    } else {
      console.log('⚠️  Nenhuma credencial encontrada');
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  process.exit(0);
})();







