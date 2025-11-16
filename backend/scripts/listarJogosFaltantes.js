const { initDatabase, getDatabase } = require('../database/database');
const PokopowScraper = require('../services/pokopowScraper');
const fs = require('fs');
const path = require('path');

/**
 * Script para listar todos os jogos que faltam ser adicionados ao banco
 * Gera um arquivo JSON e TXT com as URLs dos jogos faltantes
 */

async function listarJogosFaltantes() {
  console.log('\n🔍 Buscando jogos faltantes...\n');
  
  await initDatabase();
  const db = getDatabase();
  const scraper = new PokopowScraper();
  
  try {
    // 1. Buscar todos os jogos do site
    console.log('📡 Buscando todos os jogos do site pokopow.com...');
    console.log('⚠️  Isso pode demorar alguns minutos...\n');
    
    const jogosSite = await scraper.encontrarTodosJogos();
    console.log(`\n✅ ${jogosSite.length} jogos encontrados no site\n`);
    
    // 2. Buscar todos os jogos do banco
    const jogosBanco = await new Promise((resolve, reject) => {
      db.all('SELECT nome FROM jogos', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    console.log(`💾 ${jogosBanco.length} jogos já estão no banco de dados\n`);
    
    // 3. Criar um Set com nomes normalizados dos jogos do banco
    const nomesBanco = new Set(
      jogosBanco.map(j => j.nome.trim().toLowerCase())
    );
    
    // 4. Identificar jogos faltantes
    const jogosFaltantes = jogosSite.filter(jogo => {
      const nomeNormalizado = jogo.nome.trim().toLowerCase();
      return !nomesBanco.has(nomeNormalizado);
    });
    
    console.log(`\n📊 RESULTADO:`);
    console.log(`   ✅ Jogos no site: ${jogosSite.length}`);
    console.log(`   💾 Jogos no banco: ${jogosBanco.length}`);
    console.log(`   ⏳ Jogos faltantes: ${jogosFaltantes.length}\n`);
    
    if (jogosFaltantes.length === 0) {
      console.log('🎉 Todos os jogos já estão no banco de dados!\n');
      return;
    }
    
    // 5. Preparar dados para salvar
    const dados = {
      totalJogosSite: jogosSite.length,
      totalJogosBanco: jogosBanco.length,
      totalJogosFaltantes: jogosFaltantes.length,
      dataGeracao: new Date().toISOString(),
      jogosFaltantes: jogosFaltantes.map(jogo => ({
        nome: jogo.nome,
        url: jogo.url,
        titulo_pagina: jogo.titulo_pagina || null,
        h1: jogo.h1 || null
      }))
    };
    
    // 6. Salvar arquivo JSON
    const jsonPath = path.join(__dirname, '..', 'jogos_faltantes.json');
    fs.writeFileSync(jsonPath, JSON.stringify(dados, null, 2), 'utf8');
    console.log(`✅ Arquivo JSON salvo: ${jsonPath}`);
    
    // 7. Salvar arquivo TXT simples (apenas URLs)
    const txtPath = path.join(__dirname, '..', 'jogos_faltantes.txt');
    const urlsTxt = jogosFaltantes.map(jogo => jogo.url).join('\n');
    fs.writeFileSync(txtPath, urlsTxt, 'utf8');
    console.log(`✅ Arquivo TXT salvo: ${txtPath}`);
    
    // 8. Salvar arquivo CSV
    const csvPath = path.join(__dirname, '..', 'jogos_faltantes.csv');
    let csv = 'Nome,URL\n';
    jogosFaltantes.forEach(jogo => {
      const nome = `"${jogo.nome.replace(/"/g, '""')}"`;
      const url = `"${jogo.url}"`;
      csv += `${nome},${url}\n`;
    });
    fs.writeFileSync(csvPath, csv, 'utf8');
    console.log(`✅ Arquivo CSV salvo: ${csvPath}\n`);
    
    // 9. Mostrar primeiros 10 jogos faltantes como exemplo
    console.log('📋 Primeiros 10 jogos faltantes:');
    jogosFaltantes.slice(0, 10).forEach((jogo, index) => {
      console.log(`   ${index + 1}. ${jogo.nome}`);
      console.log(`      ${jogo.url}`);
    });
    
    if (jogosFaltantes.length > 10) {
      console.log(`   ... e mais ${jogosFaltantes.length - 10} jogos\n`);
    } else {
      console.log('');
    }
    
    console.log('✅ Processo concluído!\n');
    
  } catch (error) {
    console.error('❌ Erro ao listar jogos faltantes:', error);
    process.exit(1);
  }
}

// Executar
listarJogosFaltantes().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});



