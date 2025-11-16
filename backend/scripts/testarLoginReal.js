const { initDatabase } = require('../database/database');
const TestadorLoginSteam = require('../services/testadorLoginSteam');

async function executarTestesLoginReal() {
  console.log('\n🔐 TESTADOR DE LOGIN REAL - STEAM\n');
  
  try {
    await initDatabase();
    
    const testador = new TestadorLoginSteam();
    
    // Verificar se SteamCMD está disponível
    console.log('🔍 Verificando SteamCMD...');
    const steamCmdDisponivel = await testador.verificarSteamCmd();
    
    if (!steamCmdDisponivel) {
      console.log('❌ SteamCMD não encontrado!');
      console.log('\n📥 Para usar este testador, você precisa instalar o SteamCMD:');
      console.log('   1. Baixe de: https://developer.valvesoftware.com/wiki/SteamCMD');
      console.log('   2. Extraia para C:\\steamcmd\\');
      console.log('   3. Execute steamcmd.exe uma vez para configurar\n');
      process.exit(1);
    }
    
    console.log('✅ SteamCMD encontrado!\n');
    
    const args = process.argv.slice(2);
    
    if (args.includes('--jogo')) {
      const jogoId = parseInt(args[args.indexOf('--jogo') + 1]);
      const limite = parseInt(args[args.indexOf('--limite') + 1]) || 5;
      
      if (!jogoId) {
        console.error('❌ Forneça um ID de jogo válido');
        process.exit(1);
      }
      
      console.log(`🎮 Testando até ${limite} conta(s) do jogo ID: ${jogoId}`);
      console.log('⚠️  ATENÇÃO: Isso fará login REAL nas contas Steam!\n');
      
      const resultados = await testador.testarContasDoJogo(jogoId, limite);
      
      if (args.includes('--salvar')) {
        await testador.atualizarStatusContas(resultados);
      }
      
    } else if (args.includes('--conta')) {
      // Testar uma conta específica
      const usuario = args[args.indexOf('--conta') + 1];
      const senha = args[args.indexOf('--conta') + 2];
      
      if (!usuario || !senha) {
        console.error('❌ Forneça usuário e senha: --conta usuario senha');
        process.exit(1);
      }
      
      console.log('🔐 Testando conta específica...\n');
      const resultado = await testador.testarLoginReal(usuario, senha);
      
      console.log('\n📋 RESULTADO:');
      console.log(`   Usuário: ${resultado.usuario}`);
      console.log(`   Status: ${resultado.sucesso ? 'VÁLIDO' : 'INVÁLIDO'}`);
      console.log(`   Motivo: ${resultado.motivo}`);
      console.log(`   Duração: ${resultado.duracao}ms\n`);
      
    } else {
      console.log('📖 USO DO TESTADOR DE LOGIN REAL:\n');
      console.log('  Testar contas de um jogo:');
      console.log('    node testarLoginReal.js --jogo 1 --limite 5');
      console.log('');
      console.log('  Testar conta específica:');
      console.log('    node testarLoginReal.js --conta meuusuario minhasenha');
      console.log('');
      console.log('  Salvar resultados no banco:');
      console.log('    node testarLoginReal.js --jogo 1 --limite 3 --salvar');
      console.log('');
      console.log('⚠️  IMPORTANTE:');
      console.log('   - Isso faz login REAL nas contas Steam');
      console.log('   - Use com moderação para evitar rate limiting');
      console.log('   - Contas com Steam Guard não funcionarão');
      console.log('   - Requer SteamCMD instalado\n');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
  
  process.exit(0);
}

if (require.main === module) {
  executarTestesLoginReal();
}

module.exports = executarTestesLoginReal;



