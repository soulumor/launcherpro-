const { getDatabase } = require('../database/database');

/**
 * Script para limpar contas inválidas do banco de dados
 * Remove contas que têm "pass", "password", "senha", "user", "login" como credenciais
 */

async function limparContasInvalidas() {
  const db = getDatabase();
  
  console.log('\n🧹 Limpando contas inválidas do banco de dados...\n');
  
  // Buscar todas as contas
  db.all('SELECT * FROM contas', async (err, contas) => {
    if (err) {
      console.error('❌ Erro ao buscar contas:', err);
      process.exit(1);
    }
    
    console.log(`📊 Total de contas no banco: ${contas.length}\n`);
    
    let contasRemovidas = 0;
    const valoresInvalidos = ['pass', 'password', 'senha', 'user', 'login', 'username', 'usuario'];
    
    for (const conta of contas) {
      const usuarioInvalido = !conta.usuario || 
                              conta.usuario.trim().length < 3 ||
                              valoresInvalidos.some(v => conta.usuario.toLowerCase().includes(v)) ||
                              conta.usuario.toLowerCase() === 'user' ||
                              conta.usuario.toLowerCase() === 'login';
      
      const senhaInvalida = !conta.senha || 
                            conta.senha.trim().length < 3 ||
                            valoresInvalidos.some(v => conta.senha.toLowerCase() === v) ||
                            conta.senha.toLowerCase().includes('user') ||
                            conta.senha.toLowerCase().includes('login');
      
      if (usuarioInvalido || senhaInvalida) {
        console.log(`❌ Removendo conta inválida:`);
        console.log(`   ID: ${conta.id}`);
        console.log(`   Jogo ID: ${conta.jogo_id}`);
        console.log(`   Usuário: "${conta.usuario}"`);
        console.log(`   Senha: "${conta.senha}"`);
        console.log('');
        
        // Remover conta inválida
        db.run('DELETE FROM contas WHERE id = ?', [conta.id], (deleteErr) => {
          if (deleteErr) {
            console.error(`   ❌ Erro ao remover conta ${conta.id}:`, deleteErr);
          } else {
            contasRemovidas++;
          }
        });
      }
    }
    
    // Aguardar um pouco para as operações de DELETE terminarem
    setTimeout(() => {
      console.log(`\n✅ Limpeza concluída!`);
      console.log(`   Contas removidas: ${contasRemovidas}`);
      console.log(`   Contas válidas restantes: ${contas.length - contasRemovidas}\n`);
      process.exit(0);
    }, 2000);
  });
}

// Executar
limparContasInvalidas();






