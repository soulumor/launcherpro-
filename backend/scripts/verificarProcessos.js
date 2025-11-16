const { exec } = require('child_process');
const os = require('os');

console.log('\n🔍 PROCESSOS NODE.JS EM EXECUÇÃO:\n');

// Windows PowerShell command para listar processos Node.js
const command = 'powershell "Get-Process node | Select-Object Id, ProcessName, StartTime, @{Name=\'CPU(s)\';Expression={$_.CPU}}, @{Name=\'Memória(MB)\';Expression={[math]::Round($_.WorkingSet/1MB,2)}} | Format-Table -AutoSize"';

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('Erro ao executar comando:', error);
    return;
  }
  
  console.log(stdout);
  
  // Verificar qual processo está usando a porta 3001
  console.log('\n🌐 PROCESSO USANDO PORTA 3001 (Backend):\n');
  
  exec('netstat -ano | findstr :3001', (error2, stdout2, stderr2) => {
    if (stdout2) {
      const lines = stdout2.trim().split('\n');
      lines.forEach(line => {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          console.log(`   ✅ Processo ID: ${pid} está escutando na porta 3001`);
          console.log(`   📡 Backend está rodando!\n`);
        }
      });
    }
    
    // Verificar processos relacionados ao backend
    console.log('📋 PROCESSOS RELACIONADOS AO BACKEND:\n');
    console.log('   🔄 Sincronização geral: Pode estar rodando em background');
    console.log('   🔄 Monitoramento: Pode estar rodando em background');
    console.log('   🚀 Servidor API: Deve estar na porta 3001');
    console.log('\n💡 Dica: Use "taskkill /PID <número> /F" para encerrar um processo específico\n');
  });
});







