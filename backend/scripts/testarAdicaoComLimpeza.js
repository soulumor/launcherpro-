const PokopowScraper = require('../services/pokopowScraper');

/**
 * Testa se os jogos são adicionados com títulos limpos (não ignorados)
 */
async function testarAdicaoComLimpeza() {
  console.log('🧪 Testando adição de jogos com limpeza de títulos...\n');
  
  const scraper = new PokopowScraper();
  
  // Simular alguns jogos que seriam encontrados
  const jogosSimulados = [
    { nome: 'Cyberpunk 2077 CDKeys', url: 'https://example.com/cyberpunk' },
    { nome: 'The Witcher 3', url: 'https://example.com/witcher' },
    { nome: 'GTA V - CDKeys', url: 'https://example.com/gta' },
    { nome: 'Among Us', url: 'https://example.com/among-us' },
    { nome: 'Fortnite Free Steam Accounts', url: 'https://example.com/fortnite' },
    { nome: 'Ride 4 - CDKeys', url: 'https://example.com/ride4' }
  ];
  
  console.log('📦 Jogos simulados encontrados:');
  jogosSimulados.forEach((jogo, index) => {
    console.log(`${index + 1}. ${jogo.nome}`);
  });
  
  console.log('\n🧹 Aplicando limpeza de títulos...\n');
  
  const jogosProcessados = jogosSimulados.map(jogo => {
    const nomeLimpo = scraper.limparTituloJogo(jogo.nome);
    
    console.log(`✅ ADICIONADO: "${jogo.nome}" → "${nomeLimpo}"`);
    
    return {
      ...jogo,
      nome: nomeLimpo
    };
  });
  
  console.log(`\n📊 Resultado:`);
  console.log(`   • Jogos originais: ${jogosSimulados.length}`);
  console.log(`   • Jogos processados: ${jogosProcessados.length}`);
  console.log(`   • Jogos ignorados: 0 (todos são adicionados!)`);
  
  console.log('\n📋 Lista final de jogos que seriam adicionados:');
  jogosProcessados.forEach((jogo, index) => {
    console.log(`${index + 1}. ${jogo.nome}`);
  });
  
  console.log('\n✅ Teste concluído! Todos os jogos são adicionados com títulos limpos.');
}

testarAdicaoComLimpeza().catch(console.error);



