const PokopowScraper = require('../services/pokopowScraper');

const scraper = new PokopowScraper();

console.log('=== TESTES DE IGNORAR JOGOS ===\n');

const testes = [
  'Ride 4 Free Steam Accounts - CDKeys',
  'Cyberpunk 2077 CDKeys', 
  'GTA V - CDKeys',
  'Call of Duty Steam Accounts Free',
  'Minecraft Only CDKeys',
  'The Witcher 3',
  'Friday The 13th The Game',
  'Among Us',
  'Fortnite - CDKeys',
  'Valorant CDKeys'
];

testes.forEach(teste => {
  const deveIgnorar = scraper.deveIgnorarJogo(teste);
  const status = deveIgnorar ? '🚫 IGNORAR' : '✅ MANTER';
  console.log(`${teste} → ${status}`);
});

console.log('\n✅ Testes concluídos!');



