const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../database/launcherpro.db');
const OUTPUT_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'jogos-iniciais.json');

async function exportarJogos() {
  console.log('\n📤 Exportando jogos do banco local...\n');

  // Verificar se o banco existe
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Banco de dados não encontrado:', DB_PATH);
    console.error('   Execute este script na pasta do backend onde está o banco local');
    process.exit(1);
  }

  // Criar diretório de saída se não existir
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log('✅ Diretório criado: data/');
  }

  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('❌ Erro ao conectar ao banco de dados:', err);
        reject(err);
        return;
      }

      console.log('✅ Conectado ao banco de dados');
      console.log('📊 Buscando todos os jogos...\n');

      // Buscar todos os jogos
      db.all(
        'SELECT nome, descricao, preco, capa FROM jogos ORDER BY nome ASC',
        [],
        (err, jogos) => {
          if (err) {
            console.error('❌ Erro ao buscar jogos:', err);
            db.close();
            reject(err);
            return;
          }

          if (!jogos || jogos.length === 0) {
            console.log('⚠️  Nenhum jogo encontrado no banco de dados');
            db.close();
            resolve();
            return;
          }

          console.log(`✅ Encontrados ${jogos.length} jogos`);

          // Formatar jogos para o JSON
          const jogosFormatados = jogos.map((jogo) => ({
            nome: jogo.nome || '',
            descricao: jogo.descricao || '',
            preco: jogo.preco || 0,
            capa: jogo.capa || null
          }));

          // Criar objeto JSON
          const dadosExportados = {
            total: jogosFormatados.length,
            dataExportacao: new Date().toISOString(),
            jogos: jogosFormatados
          };

          // Salvar em arquivo JSON
          try {
            fs.writeFileSync(
              OUTPUT_FILE,
              JSON.stringify(dadosExportados, null, 2),
              'utf8'
            );

            console.log(`\n✅ Exportação concluída!`);
            console.log(`📁 Arquivo criado: ${OUTPUT_FILE}`);
            console.log(`📊 Total de jogos exportados: ${jogosFormatados.length}`);
            console.log(`📦 Tamanho do arquivo: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB\n`);

            db.close();
            resolve();
          } catch (writeErr) {
            console.error('❌ Erro ao salvar arquivo JSON:', writeErr);
            db.close();
            reject(writeErr);
          }
        }
      );
    });
  });
}

// Executar exportação
exportarJogos()
  .then(() => {
    console.log('✨ Exportação finalizada com sucesso!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Erro durante exportação:', err);
    process.exit(1);
  });







