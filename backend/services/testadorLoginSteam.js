const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getDatabase } = require('../database/database');
const SteamCmdInstaller = require('./steamCmdInstaller');

/**
 * Testador de contas Steam que REALMENTE testa login e senha
 */
class TestadorLoginSteam {
  constructor() {
    this.installer = new SteamCmdInstaller();
    this.steamCmdPath = null;
    this.delayEntreLogins = 5000; // 5 segundos entre tentativas
    this.timeoutLogin = 30000; // 30 segundos timeout por login
    this.instalacaoEmAndamento = false;
  }

  /**
   * Encontra o caminho do SteamCMD (com instalação automática se necessário)
   */
  async encontrarSteamCmd() {
    // Se já encontramos antes, retornar
    if (this.steamCmdPath && fs.existsSync(this.steamCmdPath)) {
      return this.steamCmdPath;
    }

    // Detectar sistema operacional
    const isWindows = process.platform === 'win32';
    const isLinux = process.platform === 'linux';
    
    // Verificar caminhos possíveis baseado no SO
    let possiveisCaminhos = [];
    
    if (isWindows) {
      possiveisCaminhos = [
        path.join(__dirname, '../../steamcmd/steamcmd.exe'), // Pasta do projeto
        'C:\\steamcmd\\steamcmd.exe',
        'C:\\Program Files\\steamcmd\\steamcmd.exe',
        'C:\\Program Files (x86)\\steamcmd\\steamcmd.exe',
        './steamcmd/steamcmd.exe',
        'steamcmd.exe' // Se estiver no PATH
      ];
    } else if (isLinux) {
      // Caminhos para Linux (usado no Render)
      possiveisCaminhos = [
        path.join(__dirname, '../../steamcmd/steamcmd.sh'), // Pasta do projeto
        path.join(__dirname, '../../steamcmd/steamcmd'), // Pasta do projeto
        './steamcmd/steamcmd.sh',
        './steamcmd/steamcmd',
        '/home/steam/steamcmd/steamcmd.sh',
        '/home/steam/steamcmd/steamcmd',
        '~/steamcmd/steamcmd.sh',
        '~/steamcmd/steamcmd',
        'steamcmd' // Se estiver no PATH
      ];
    } else {
      // macOS ou outro
      possiveisCaminhos = [
        path.join(__dirname, '../../steamcmd/steamcmd.sh'),
        './steamcmd/steamcmd.sh',
        'steamcmd'
      ];
    }

    for (const caminho of possiveisCaminhos) {
      try {
        if (fs.existsSync(caminho)) {
          this.steamCmdPath = caminho;
          return caminho;
        }
      } catch (err) {
        // Ignorar erros de caminho inválido (ex: ~/steamcmd)
      }
    }

    // Se não encontrou, tentar instalar automaticamente
    if (!this.instalacaoEmAndamento) {
      this.instalacaoEmAndamento = true;
      console.log('🔧 SteamCMD não encontrado. Iniciando instalação automática...');
      
      const resultado = await this.installer.instalar();
      
      if (resultado.sucesso) {
        this.steamCmdPath = this.installer.getCaminho();
        this.instalacaoEmAndamento = false;
        return this.steamCmdPath;
      } else {
        this.instalacaoEmAndamento = false;
        throw new Error('Não foi possível instalar o SteamCMD automaticamente: ' + (resultado.erro || 'Erro desconhecido'));
      }
    }

    return 'steamcmd'; // Fallback
  }

  /**
   * Testa uma conta Steam fazendo login real
   * @param {string} usuario - Nome de usuário Steam
   * @param {string} senha - Senha Steam
   * @returns {Promise<Object>} Resultado do teste
   */
  async testarLoginReal(usuario, senha) {
    // Garantir que SteamCMD está disponível
    const steamCmdPath = await this.encontrarSteamCmd();
    
    return new Promise((resolve) => {
      console.log(`🔐 Testando login real: ${usuario}`);
      
      const startTime = Date.now();
      
      // Comando SteamCMD para testar login
      const args = ['+login', usuario, senha, '+quit'];
      
      const steamcmd = spawn(steamCmdPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: this.timeoutLogin
      });

      let output = '';
      let errorOutput = '';

      // Capturar saída
      steamcmd.stdout.on('data', (data) => {
        output += data.toString();
      });

      steamcmd.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Quando o processo terminar
      steamcmd.on('close', (code) => {
        const duration = Date.now() - startTime;
        const resultado = this.analisarResultadoLogin(output, errorOutput, code, duration);
        resultado.usuario = usuario;
        resultado.timestamp = new Date().toISOString();
        
        console.log(`${resultado.sucesso ? '✅' : '❌'} ${usuario}: ${resultado.motivo}`);
        resolve(resultado);
      });

      // Timeout
      steamcmd.on('error', (error) => {
        console.log(`⚠️ ${usuario}: Erro ao executar SteamCMD - ${error.message}`);
        resolve({
          usuario: usuario,
          sucesso: false,
          status: 'erro',
          motivo: `Erro ao executar SteamCMD: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      });

      // Enviar entrada se necessário (para Steam Guard)
      setTimeout(() => {
        if (!steamcmd.killed) {
          steamcmd.stdin.write('\n'); // Pressionar Enter se estiver esperando
        }
      }, 10000);
    });
  }

  /**
   * Analisa o resultado do login SteamCMD
   * @param {string} output - Saída padrão
   * @param {string} errorOutput - Saída de erro
   * @param {number} code - Código de saída
   * @param {number} duration - Duração em ms
   * @returns {Object} Resultado analisado
   */
  analisarResultadoLogin(output, errorOutput, code, duration) {
    const outputLower = output.toLowerCase();
    const errorLower = errorOutput.toLowerCase();
    
    // Login bem-sucedido
    if (outputLower.includes('logged in ok') || 
        outputLower.includes('login successful') ||
        (code === 0 && !outputLower.includes('login failure'))) {
      return {
        sucesso: true,
        status: 'valido',
        motivo: 'Login realizado com sucesso',
        duracao: duration
      };
    }

    // Credenciais inválidas
    if (outputLower.includes('invalid password') || 
        outputLower.includes('invalid username') ||
        outputLower.includes('login failure') ||
        outputLower.includes('incorrect login')) {
      return {
        sucesso: false,
        status: 'credenciais_invalidas',
        motivo: 'Usuário ou senha incorretos',
        duracao: duration
      };
    }

    // Steam Guard necessário
    if (outputLower.includes('steam guard') || 
        outputLower.includes('two-factor') ||
        outputLower.includes('authentication code')) {
      return {
        sucesso: false,
        status: 'steam_guard',
        motivo: 'Conta protegida por Steam Guard',
        duracao: duration
      };
    }

    // Conta bloqueada/suspensa
    if (outputLower.includes('account disabled') || 
        outputLower.includes('account suspended') ||
        outputLower.includes('account locked')) {
      return {
        sucesso: false,
        status: 'conta_bloqueada',
        motivo: 'Conta desabilitada ou suspensa',
        duracao: duration
      };
    }

    // Rate limiting
    if (outputLower.includes('rate limit') || 
        outputLower.includes('too many login failures') ||
        outputLower.includes('please wait')) {
      return {
        sucesso: false,
        status: 'rate_limit',
        motivo: 'Muitas tentativas de login - aguarde',
        duracao: duration
      };
    }

    // Erro desconhecido
    return {
      sucesso: false,
      status: 'erro_desconhecido',
      motivo: `Erro não identificado (código: ${code})`,
      duracao: duration,
      output: output.substring(0, 200) // Primeiros 200 chars para debug
    };
  }

  /**
   * Testa múltiplas contas com delay entre elas
   * @param {Array} contas - Array de objetos {usuario, senha}
   * @returns {Promise<Array>} Resultados dos testes
   */
  async testarMultiplasContas(contas) {
    console.log(`\n🚀 Iniciando teste de ${contas.length} conta(s) Steam...\n`);
    
    const resultados = [];
    let contasValidas = 0;
    let contasInvalidas = 0;
    let contasComSteamGuard = 0;
    let contasComErro = 0;

    for (let i = 0; i < contas.length; i++) {
      const conta = contas[i];
      
      console.log(`\n[${i + 1}/${contas.length}] Testando conta...`);
      
      const resultado = await this.testarLoginReal(conta.usuario, conta.senha);
      resultado.conta_id = conta.id;
      resultado.jogo_id = conta.jogo_id;
      
      resultados.push(resultado);

      // Contabilizar
      if (resultado.sucesso) {
        contasValidas++;
      } else if (resultado.status === 'credenciais_invalidas') {
        contasInvalidas++;
      } else if (resultado.status === 'steam_guard') {
        contasComSteamGuard++;
      } else {
        contasComErro++;
      }

      // Delay entre tentativas (importante para evitar rate limiting)
      if (i < contas.length - 1) {
        console.log(`⏳ Aguardando ${this.delayEntreLogins/1000}s antes da próxima tentativa...`);
        await this.sleep(this.delayEntreLogins);
      }
    }

    // Resumo
    console.log(`\n📊 RESUMO DOS TESTES REAIS DE LOGIN:`);
    console.log(`   ✅ Contas válidas (login OK): ${contasValidas}`);
    console.log(`   ❌ Credenciais inválidas: ${contasInvalidas}`);
    console.log(`   🔐 Protegidas por Steam Guard: ${contasComSteamGuard}`);
    console.log(`   ⚠️  Outros erros: ${contasComErro}`);
    console.log(`   📈 Total testado: ${resultados.length}\n`);

    return resultados;
  }

  /**
   * Testa contas de um jogo específico
   * @param {number} jogoId - ID do jogo
   * @param {number} limite - Limite de contas para testar
   */
  async testarContasDoJogo(jogoId, limite = 10) {
    const db = getDatabase();
    
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM contas WHERE jogo_id = ? ORDER BY id LIMIT ?',
        [jogoId, limite],
        async (err, contas) => {
          if (err) {
            reject(err);
            return;
          }

          if (contas.length === 0) {
            console.log('⚠️ Nenhuma conta encontrada para este jogo.');
            resolve([]);
            return;
          }

          const resultados = await this.testarMultiplasContas(contas);
          resolve(resultados);
        }
      );
    });
  }

  /**
   * Atualiza status das contas no banco baseado nos testes reais
   */
  async atualizarStatusContas(resultados) {
    const db = getDatabase();
    let contasAtualizadas = 0;

    for (const resultado of resultados) {
      if (resultado.conta_id) {
        let novoStatus;
        
        if (resultado.sucesso) {
          novoStatus = 'funcionando';
        } else if (resultado.status === 'credenciais_invalidas') {
          novoStatus = 'invalido';
        } else if (resultado.status === 'steam_guard') {
          novoStatus = 'steam_guard';
        } else if (resultado.status === 'conta_bloqueada') {
          novoStatus = 'bloqueado';
        } else {
          novoStatus = 'erro';
        }

        await new Promise((resolve) => {
          db.run(
            'UPDATE contas SET status = ? WHERE id = ?',
            [novoStatus, resultado.conta_id],
            (err) => {
              if (!err) {
                contasAtualizadas++;
                console.log(`📝 Conta ID ${resultado.conta_id}: ${novoStatus} (status original: ${resultado.status}, sucesso: ${resultado.sucesso})`);
              } else {
                console.error(`❌ Erro ao atualizar conta ID ${resultado.conta_id}:`, err);
              }
              resolve();
            }
          );
        });
      }
    }

    console.log(`\n✅ ${contasAtualizadas} conta(s) atualizadas no banco.\n`);
    return contasAtualizadas;
  }

  /**
   * Verifica se SteamCMD está disponível (e instala automaticamente se necessário)
   */
  async verificarSteamCmd() {
    try {
      // No Linux (Render), SteamCMD geralmente não está disponível
      // Mas vamos tentar encontrar primeiro
      const isLinux = process.platform === 'linux';
      const isWindows = process.platform === 'win32';
      
      // Se estiver no Linux e não encontrar, retornar false com mensagem específica
      if (isLinux) {
        const steamCmdPath = await this.encontrarSteamCmd();
        
        // Se não encontrou caminho válido, retornar false
        if (!steamCmdPath || (!fs.existsSync(steamCmdPath) && steamCmdPath !== 'steamcmd')) {
          console.log('⚠️  SteamCMD não encontrado no servidor Linux (Render)');
          console.log('   O teste de contas Steam requer SteamCMD instalado.');
          console.log('   SteamCMD não é instalado automaticamente em servidores Linux.');
          return false;
        }
      }
      
      const steamCmdPath = await this.encontrarSteamCmd();
      
      return new Promise((resolve) => {
        // No Linux, pode ser necessário usar 'sh' para executar
        let comando = steamCmdPath;
        let args = ['+quit'];
        
        if (isLinux && steamCmdPath.endsWith('.sh')) {
          comando = 'sh';
          args = [steamCmdPath, '+quit'];
        }
        
        const steamcmd = spawn(comando, args, {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        steamcmd.on('close', (code) => {
          resolve(code === 0 || code === null); // null pode significar sucesso no Linux
        });

        steamcmd.on('error', (error) => {
          console.error('Erro ao executar SteamCMD:', error.message);
          resolve(false);
        });

        setTimeout(() => {
          if (!steamcmd.killed) {
            steamcmd.kill();
          }
          resolve(false);
        }, 5000);
      });
    } catch (error) {
      console.error('Erro ao verificar SteamCMD:', error.message);
      return false;
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Busca o AppID do jogo na Steam pelo nome
   * @param {string} nomeJogo - Nome do jogo
   * @returns {Promise<number|null>} AppID do jogo ou null se não encontrado
   */
  async buscarAppIdPorNome(nomeJogo) {
    try {
      const https = require('https');
      const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(nomeJogo)}&cc=BR&l=portuguese`;
      
      return new Promise((resolve) => {
        https.get(url, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const response = JSON.parse(data);
              if (response && response.items && response.items.length > 0) {
                // Pegar o primeiro resultado
                const appId = response.items[0].id;
                console.log(`✅ AppID encontrado para ${nomeJogo}: ${appId}`);
                resolve(appId);
              } else {
                console.log(`⚠️ AppID não encontrado para: ${nomeJogo}`);
                resolve(null);
              }
            } catch (err) {
              console.log(`⚠️ Erro ao processar resposta da API Steam para ${nomeJogo}`);
              resolve(null);
            }
          });
        }).on('error', (err) => {
          console.log(`⚠️ Erro ao buscar AppID para ${nomeJogo}: ${err.message}`);
          resolve(null);
        });
      });
    } catch (error) {
      console.log(`⚠️ Erro ao buscar AppID: ${error.message}`);
      return null;
    }
  }

  /**
   * Adiciona um jogo à biblioteca Steam de uma conta
   * @param {string} usuario - Nome de usuário Steam
   * @param {string} senha - Senha Steam
   * @param {number} appId - AppID do jogo na Steam
   * @returns {Promise<Object>} Resultado da operação
   */
  async adicionarJogoBiblioteca(usuario, senha, appId) {
    if (!appId) {
      return {
        sucesso: false,
        motivo: 'AppID do jogo não fornecido'
      };
    }

    const steamCmdPath = await this.encontrarSteamCmd();
    
    return new Promise((resolve) => {
      console.log(`📚 Adicionando jogo AppID ${appId} à biblioteca de ${usuario}`);
      
      const startTime = Date.now();
      
      // Comando SteamCMD para adicionar jogo à biblioteca
      // app_set_config <appid> state 1 adiciona o jogo à biblioteca
      const args = [
        '+login', usuario, senha,
        '+app_set_config', String(appId), 'state', '1',
        '+quit'
      ];
      
      const steamcmd = spawn(steamCmdPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: this.timeoutLogin
      });

      let output = '';
      let errorOutput = '';

      steamcmd.stdout.on('data', (data) => {
        output += data.toString();
      });

      steamcmd.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      steamcmd.on('close', (code) => {
        const duration = Date.now() - startTime;
        const outputLower = output.toLowerCase();
        
        if (outputLower.includes('logged in ok') && code === 0) {
          console.log(`✅ Jogo AppID ${appId} adicionado à biblioteca de ${usuario}`);
          resolve({
            sucesso: true,
            motivo: 'Jogo adicionado à biblioteca com sucesso',
            duracao: duration
          });
        } else {
          console.log(`⚠️ Não foi possível adicionar jogo AppID ${appId} à biblioteca de ${usuario}`);
          resolve({
            sucesso: false,
            motivo: 'Erro ao adicionar jogo à biblioteca',
            duracao: duration,
            output: output.substring(0, 200)
          });
        }
      });

      steamcmd.on('error', (error) => {
        console.log(`⚠️ Erro ao executar SteamCMD para adicionar jogo: ${error.message}`);
        resolve({
          sucesso: false,
          motivo: `Erro ao executar SteamCMD: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      });

      setTimeout(() => {
        if (!steamcmd.killed) {
          steamcmd.stdin.write('\n');
        }
      }, 10000);
    });
  }
}

module.exports = TestadorLoginSteam;
