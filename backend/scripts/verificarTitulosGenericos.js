const { initDatabase, getDatabase } = require('../database/database');

async function verificarTitulosGenericos() {
  await initDatabase();
  const db = getDatabase();
  
  const jogos = await new Promise((resolve, reject) => {
    db.all(`
      SELECT nome FROM jogos 
      WHERE nome LIKE '%Steam%' 
         OR nome LIKE '%CDKeys%' 
         OR nome LIKE '%Account%' 
         OR nome LIKE '%Free%'
         OR nome LIKE '%Download%'
      LIMIT 20
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
  
  console.log('Jogos com termos genéricos encontrados:');
  jogos.forEach(jogo => {
    console.log(`- ${jogo.nome}`);
  });
  
  console.log(`\nTotal: ${jogos.length} jogos`);
}

verificarTitulosGenericos().then(() => process.exit(0)).catch(console.error);



