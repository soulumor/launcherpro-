const PokopowScraper = require('../services/pokopowScraper');

/**
 * Script de debug para verificar o que está sendo capturado nas credenciais
 */

async function debugCredenciais() {
  const scraper = new PokopowScraper();
  
  // Testar com Deltarune como exemplo
  const url = process.argv[2] || 'https://pokopow.com/deltarune';
  
  console.log(`\n🔍 Debug de credenciais para: ${url}\n`);
  
  try {
    const $ = await scraper.fetchPage(url);
    if (!$) {
      console.log('❌ Não foi possível carregar a página');
      return;
    }
    
    // Buscar todos os elementos que podem conter credenciais
    console.log('📋 Buscando elementos com credenciais...\n');
    
    // 1. Divs com classe pagelayer-text-holder
    $('div.pagelayer-text-holder').each((i, elem) => {
      const html = $(elem).html() || '';
      const texto = $(elem).text() || '';
      
      console.log(`\n--- Div pagelayer-text-holder ${i + 1} ---`);
      console.log('HTML:', html.substring(0, 500));
      console.log('Texto:', texto.substring(0, 500));
      
      // Procurar por USER e PASS no texto
      if (texto.toUpperCase().includes('USER') || texto.toUpperCase().includes('PASS')) {
        console.log('\n✅ Encontrou USER ou PASS neste elemento!');
        
        // Mostrar contexto ao redor
        const userIndex = texto.toUpperCase().indexOf('USER');
        const passIndex = texto.toUpperCase().indexOf('PASS');
        
        if (userIndex >= 0) {
          const contexto = texto.substring(Math.max(0, userIndex - 50), userIndex + 200);
          console.log('Contexto USER:', contexto);
        }
        
        if (passIndex >= 0) {
          const contexto = texto.substring(Math.max(0, passIndex - 50), passIndex + 200);
          console.log('Contexto PASS:', contexto);
        }
      }
    });
    
    // 2. Buscar em spans e buttons
    console.log('\n\n📋 Buscando em spans e buttons...\n');
    $('span, button').each((i, elem) => {
      const texto = $(elem).text() || '';
      if (texto.toUpperCase().includes('LOGIN') || texto.toUpperCase().includes('USER') || texto.toUpperCase().includes('PASS')) {
        console.log(`\n--- Elemento ${i + 1} ---`);
        console.log('Tag:', $(elem).prop('tagName'));
        console.log('Texto:', texto);
        console.log('HTML:', $(elem).html()?.substring(0, 300));
        
        // Mostrar elemento pai
        const pai = $(elem).parent();
        console.log('Pai HTML:', pai.html()?.substring(0, 500));
      }
    });
    
    // 3. Extrair credenciais usando o método atual
    console.log('\n\n🔐 Extraindo credenciais com método atual...\n');
    const credenciais = await scraper.extrairCredenciais(url);
    
    console.log(`\n✅ Credenciais encontradas: ${credenciais.length}\n`);
    credenciais.forEach((cred, index) => {
      console.log(`Credencial ${index + 1}:`);
      console.log(`  User: "${cred.user}"`);
      console.log(`  Pass: "${cred.pass}"`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Executar
debugCredenciais();






