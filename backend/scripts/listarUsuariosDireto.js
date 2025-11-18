const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho do banco de dados
const DB_PATH = path.join(__dirname, '..', 'database', 'launcherpro.db');

console.log('');
console.log('=== LISTAR USUARIOS DO BANCO DE DADOS ===');
console.log('');
console.log(`📁 Banco: ${DB_PATH}`);
console.log('');

// Abrir banco de dados
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Erro ao abrir banco de dados:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Banco de dados aberto com sucesso!');
  console.log('');
  
  // Buscar todos os usuários
  db.all('SELECT id, nome, email, tipo, ativo, data_vencimento, data_criacao FROM usuarios ORDER BY data_criacao DESC', 
    (err, usuarios) => {
      if (err) {
        console.error('❌ Erro ao buscar usuários:', err.message);
        db.close();
        process.exit(1);
      }
      
      if (usuarios.length === 0) {
        console.log('⚠️  Nenhum usuário encontrado no banco de dados.');
        db.close();
        return;
      }
      
      // Separar por tipo
      const admins = usuarios.filter(u => u.tipo === 'admin');
      const clientes = usuarios.filter(u => u.tipo === 'cliente');
      const semTipo = usuarios.filter(u => !u.tipo || (u.tipo !== 'admin' && u.tipo !== 'cliente'));
      
      // Estatísticas
      console.log('=== RESUMO ===');
      console.log(`Total de Usuários: ${usuarios.length}`);
      console.log(`Admins: ${admins.length}`);
      console.log(`Clientes: ${clientes.length}`);
      if (semTipo.length > 0) {
        console.log(`Sem Tipo: ${semTipo.length}`);
      }
      console.log('');
      
      // Listar TODOS os usuários
      console.log('=== TODOS OS USUÁRIOS ===');
      console.log('');
      
      usuarios.forEach((usuario, index) => {
        const status = usuario.ativo === 1 ? '✅ ATIVO' : '❌ INATIVO';
        const tipo = usuario.tipo || '[SEM TIPO]';
        
        console.log(`${index + 1}. ${usuario.nome || '[SEM NOME]'}`);
        console.log(`   Email: ${usuario.email}`);
        console.log(`   Tipo: ${tipo}`);
        console.log(`   Status: ${status}`);
        console.log(`   ID: ${usuario.id}`);
        
        if (usuario.data_vencimento) {
          const vencimento = new Date(usuario.data_vencimento);
          const hoje = new Date();
          const diasRestantes = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
          
          if (diasRestantes > 7) {
            console.log(`   Vencimento: ${vencimento.toLocaleDateString('pt-BR')} (${diasRestantes} dias restantes)`);
          } else if (diasRestantes > 0) {
            console.log(`   Vencimento: ${vencimento.toLocaleDateString('pt-BR')} (${diasRestantes} dias restantes) ⚠️`);
          } else {
            console.log(`   Vencimento: ${vencimento.toLocaleDateString('pt-BR')} (VENCIDO) ❌`);
          }
        } else if (usuario.tipo === 'admin') {
          console.log(`   Vencimento: ILIMITADO (Admin)`);
        }
        
        if (usuario.data_criacao) {
          const criacao = new Date(usuario.data_criacao);
          console.log(`   Criado em: ${criacao.toLocaleString('pt-BR')}`);
        }
        
        console.log('');
      });
      
      // Listar apenas emails (para facilitar login)
      console.log('=== EMAILS DISPONÍVEIS PARA LOGIN ===');
      console.log('');
      usuarios.forEach((usuario, index) => {
        if (usuario.ativo === 1) {
          console.log(`${index + 1}. ${usuario.email} (${usuario.tipo || 'sem tipo'})`);
        }
      });
      
      console.log('');
      console.log('✅ Listagem concluída!');
      
      db.close((err) => {
        if (err) {
          console.error('❌ Erro ao fechar banco:', err.message);
        }
      });
    }
  );
});

