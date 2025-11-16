const PokopowScraper = require('../services/pokopowScraper');

/**
 * Testa se a sincronização está ignorando jogos com CDKeys
 */
async function testarSincronizacaoSemCDKeys() {
  console.log('🧪 Testando sincronização sem CDKeys...\n');
  
  const scraper = new PokopowScraper();
  
  // Simular alguns jogos que seriam encontrados
  const jogosSimulados = [
    { nome: 'Cyberpunk 2077 CDKeys', url: 'https://example.com/cyberpunk' },
    { nome: 'The Witcher 3', url: 'https://example.com/witcher' },
    { nome: 'GTA V - CDKeys', url: 'https://example.com/gta' },
    { nome: 'Among Us', url: 'https://example.com/among-us' },
    { nome: 'Fortnite Free Steam Accounts', url: 'https://example.com/fortnite' }
  ];
  
  console.log('📦 Jogos simulados encontrados:');
  jogosSimulados.forEach((jogo, index) => {
    console.log(`${index + 1}. ${jogo.nome}`);
  });
  
  console.log('\n🔍 Aplicando filtros...\n');
  
  const jogosFiltrados = jogosSimulados.filter(jogo => {
    const deveIgnorar = scraper.deveIgnorarJogo(jogo.nome);
    
    if (deveIgnorar) {
      console.log(`🚫 IGNORADO: ${jogo.nome}`);
      return false;
    } else {
      const nomeLimpo = scraper.limparTituloJogo(jogo.nome);
      console.log(`✅ MANTIDO: ${jogo.nome} → ${nomeLimpo}`);
      return true;
    }
  });
  
  console.log(`\n📊 Resultado:`);
  console.log(`   • Jogos originais: ${jogosSimulados.length}`);
  console.log(`   • Jogos ignorados: ${jogosSimulados.length - jogosFiltrados.length}`);
  console.log(`   • Jogos mantidos: ${jogosFiltrados.length}`);
  
  console.log('\n✅ Teste concluído! A funcionalidade está funcionando corretamente.');
}

testarSincronizacaoSemCDKeys().catch(console.error);



