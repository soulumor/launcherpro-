const { initDatabase, getDatabase } = require('../database/database');
const PokopowScraper = require('../services/pokopowScraper');

async function extrairContasCyberpunk() {
  console.log('\n🔍 Extraindo contas do Cyberpunk 2077...\n');
  
  await initDatabase();
  const db = getDatabase();
  const scraper = new PokopowScraper();
  
  const url = 'https://pokopow.com/cyberpunk-2077/';
  
  // Buscar jogo no banco
  db.get('SELECT id, nome FROM jogos WHERE nome LIKE "%Cyberpunk%"', async (err, jogo) => {
    if (err) {
      console.error('❌ Erro ao buscar jogo:', err);
      process.exit(1);
    }
    
    if (!jogo) {
      console.log('❌ Cyberpunk 2077 não encontrado no banco de dados');
      console.log('   Criando o jogo primeiro...');
      
      // Criar o jogo
      const { buscarCapaJogo } = require('../services/capaService');
      const capa = await buscarCapaJogo('Cyberpunk 2077');
      
      db.run(
        'INSERT INTO jogos (nome, descricao, preco, capa) VALUES (?, ?, ?, ?)',
        ['Cyberpunk 2077', 'Um RPG de ação e aventura ambientado em Night City', 0, capa || null],
        function(insertErr) {
          if (insertErr) {
            console.error('❌ Erro ao criar jogo:', insertErr);
            process.exit(1);
          }
          console.log(`✅ Jogo criado com ID: ${this.lastID}`);
          processarCredenciais(this.lastID);
        }
      );
    } else {
      console.log(`✅ Jogo encontrado: ${jogo.nome} (ID: ${jogo.id})`);
      processarCredenciais(jogo.id);
    }
  });
  
  async function processarCredenciais(jogoId) {
    // Verificar contas existentes
    db.all('SELECT usuario FROM contas WHERE jogo_id = ?', [jogoId], async (err, contasExistentes) => {
      const usuariosExistentes = new Set((contasExistentes || []).map(c => c.usuario.toLowerCase()));
      console.log(`📊 Contas existentes: ${usuariosExistentes.size}\n`);
      
      console.log(`🔐 Extraindo credenciais de: ${url}\n`);
      
      try {
        const credenciais = await scraper.extrairCredenciais(url);
        
        console.log(`✅ ${credenciais.length} credencial(is) encontrada(s)!\n`);
        
        if (credenciais.length === 0) {
          console.log('⚠️  Nenhuma credencial encontrada. Verificando HTML da página...\n');
          
          // Debug: ver HTML
          const $ = await scraper.fetchPage(url);
          if ($) {
            const html = $.html();
            const texto = $.text();
            
            // Procurar por "LOGIN" no HTML
            if (html.includes('LOGIN') || texto.includes('LOGIN')) {
              console.log('✅ Encontrado "LOGIN" no HTML!');
              
              // Procurar botões com LOGIN
              $('button, span, div, a').each((i, elem) => {
                const textoElem = $(elem).text() || '';
                const htmlElem = $(elem).html() || '';
                if (textoElem.includes('LOGIN') || htmlElem.includes('LOGIN')) {
                  console.log(`\n📋 Elemento ${i} com LOGIN:`);
                  console.log(`   Texto: ${textoElem.substring(0, 200)}`);
                  console.log(`   HTML: ${htmlElem.substring(0, 300)}`);
                }
              });
            } else {
              console.log('❌ "LOGIN" não encontrado no HTML');
            }
          }
        } else {
          let contasAdicionadas = 0;
          let contasJaExistentes = 0;
          
          console.log('📋 Credenciais encontradas:\n');
          
          for (const cred of credenciais) {
            if (!cred.user || !cred.pass) {
              console.log(`   ⚠️  Credencial inválida: USER=${cred.user || 'N/A'}, PASS=${cred.pass ? '***' : 'N/A'}`);
              continue;
            }
            
            const usuarioLower = cred.user.toLowerCase();
            
            if (usuariosExistentes.has(usuarioLower)) {
              contasJaExistentes++;
              console.log(`   ⏭️  ${cred.user} - já existe`);
              continue;
            }
            
            // Adicionar nova conta
            await new Promise((resolve) => {
              db.run(
                'INSERT INTO contas (jogo_id, usuario, senha, status) VALUES (?, ?, ?, ?)',
                [jogoId, cred.user, cred.pass, 'disponivel'],
                (insertErr) => {
                  if (insertErr) {
                    console.error(`   ❌ Erro ao adicionar ${cred.user}:`, insertErr.message);
                  } else {
                    console.log(`   ✅ ${cred.user} - adicionada`);
                    contasAdicionadas++;
                  }
                  resolve();
                }
              );
            });
          }
          
          console.log(`\n${'═'.repeat(60)}`);
          console.log(`\n📊 RESUMO:`);
          console.log(`   ➕ Contas adicionadas: ${contasAdicionadas}`);
          console.log(`   ⏭️  Contas já existentes: ${contasJaExistentes}`);
          console.log(`   📦 Total de contas agora: ${usuariosExistentes.size + contasAdicionadas}\n`);
        }
        
        process.exit(0);
      } catch (error) {
        console.error('❌ Erro ao extrair credenciais:', error.message);
        console.error(error.stack);
        process.exit(1);
      }
    });
  }
}

extrairContasCyberpunk().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});







