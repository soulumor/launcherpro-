const PokopowScraper = require('../services/pokopowScraper');

const scraper = new PokopowScraper();

console.log('=== TESTES DE LIMPEZA DE TÍTULOS ===\n');

const testes = [
  'Ride 4 Free Steam Accounts - CDKeys',
  'Cyberpunk 2077 Steam Account', 
  'GTA V - Free Download',
  'Call of Duty Steam Keys',
  'Minecraft Account Free',
  'The Witcher 3 Full Game',
  'Friday The 13th The Game',
  'Among Us',
  'Fortnite Steam Accounts',
  'Valorant - CDKeys'
];

testes.forEach(teste => {
  const limpo = scraper.limparTituloJogo(teste);
  console.log(`${teste} → ${limpo}`);
});

console.log('\n✅ Testes concluídos!');



