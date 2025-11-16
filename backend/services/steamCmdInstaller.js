const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const https = require('https');
const { promisify } = require('util');

/**
 * Serviço para instalar automaticamente o SteamCMD
 */
class SteamCmdInstaller {
  constructor() {
    this.steamCmdDir = path.join(__dirname, '../../steamcmd');
    this.steamCmdExe = path.join(this.steamCmdDir, 'steamcmd.exe');
    this.steamCmdZip = path.join(this.steamCmdDir, 'steamcmd.zip');
    this.downloadUrl = 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip';
  }

  /**
   * Verifica se o SteamCMD já está instalado
   */
  async verificarInstalacao() {
    try {
      if (fs.existsSync(this.steamCmdExe)) {
        // Verificar se o arquivo é válido (não está corrompido)
        const stats = fs.statSync(this.steamCmdExe);
        if (stats.size > 1000000) { // Pelo menos 1MB
          console.log('✅ SteamCMD já está instalado');
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Baixa o SteamCMD do servidor oficial
   */
  async baixarSteamCmd() {
    return new Promise((resolve, reject) => {
      console.log('📥 Baixando SteamCMD...');
      console.log(`   URL: ${this.downloadUrl}`);
      
      // Criar diretório se não existir
      if (!fs.existsSync(this.steamCmdDir)) {
        fs.mkdirSync(this.steamCmdDir, { recursive: true });
      }

      const file = fs.createWriteStream(this.steamCmdZip);
      let downloadedBytes = 0;
      let totalBytes = 0;

      https.get(this.downloadUrl, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Seguir redirect
          https.get(response.headers.location, (redirectResponse) => {
            totalBytes = parseInt(redirectResponse.headers['content-length'], 10);
            redirectResponse.pipe(file);
            redirectResponse.on('data', (chunk) => {
              downloadedBytes += chunk.length;
              if (totalBytes) {
                const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
                process.stdout.write(`\r   Progresso: ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB)`);
              }
            });
            redirectResponse.on('end', () => {
              console.log('\n✅ Download concluído!');
              resolve();
            });
          }).on('error', reject);
        } else {
          totalBytes = parseInt(response.headers['content-length'], 10);
          response.pipe(file);
          response.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            if (totalBytes) {
              const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
              process.stdout.write(`\r   Progresso: ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB)`);
            }
          });
          response.on('end', () => {
            console.log('\n✅ Download concluído!');
            resolve();
          });
        }
      }).on('error', (error) => {
        file.close();
        fs.unlinkSync(this.steamCmdZip);
        reject(error);
      });

      file.on('error', (error) => {
        file.close();
        if (fs.existsSync(this.steamCmdZip)) {
          fs.unlinkSync(this.steamCmdZip);
        }
        reject(error);
      });
    });
  }

  /**
   * Extrai o arquivo ZIP do SteamCMD
   */
  async extrairSteamCmd() {
    return new Promise((resolve, reject) => {
      console.log('📦 Extraindo SteamCMD...');
      
      // Usar módulo nativo do Node.js ou fallback para unzip
      try {
        // Tentar usar AdmZip se disponível, senão usar método alternativo
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(this.steamCmdZip);
        zip.extractAllTo(this.steamCmdDir, true);
        console.log('✅ Extração concluída!');
        
        // Remover arquivo ZIP
        fs.unlinkSync(this.steamCmdZip);
        resolve();
      } catch (error) {
        // Se AdmZip não estiver disponível, tentar método alternativo
        console.log('⚠️  Tentando método alternativo de extração...');
        this.extrairComPowerShell()
          .then(resolve)
          .catch(reject);
      }
    });
  }

  /**
   * Extrai usando PowerShell (fallback)
   */
  async extrairComPowerShell() {
    return new Promise((resolve, reject) => {
      const powershell = spawn('powershell', [
        '-Command',
        `Expand-Archive -Path "${this.steamCmdZip}" -DestinationPath "${this.steamCmdDir}" -Force`
      ]);

      let output = '';
      powershell.stdout.on('data', (data) => {
        output += data.toString();
      });

      powershell.stderr.on('data', (data) => {
        output += data.toString();
      });

      powershell.on('close', (code) => {
        if (code === 0) {
          // Remover arquivo ZIP
          if (fs.existsSync(this.steamCmdZip)) {
            fs.unlinkSync(this.steamCmdZip);
          }
          console.log('✅ Extração concluída!');
          resolve();
        } else {
          reject(new Error(`Erro ao extrair: código ${code}`));
        }
      });

      powershell.on('error', reject);
    });
  }

  /**
   * Configura o SteamCMD executando uma vez
   */
  async configurarSteamCmd() {
    return new Promise((resolve, reject) => {
      console.log('⚙️  Configurando SteamCMD (primeira execução)...');
      
      const steamcmd = spawn(this.steamCmdExe, ['+quit'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.steamCmdDir
      });

      let output = '';
      steamcmd.stdout.on('data', (data) => {
        output += data.toString();
      });

      steamcmd.stderr.on('data', (data) => {
        output += data.toString();
      });

      // Timeout de 30 segundos
      const timeout = setTimeout(() => {
        steamcmd.kill();
        console.log('⚠️  Timeout na configuração, mas continuando...');
        resolve();
      }, 30000);

      steamcmd.on('close', (code) => {
        clearTimeout(timeout);
        console.log('✅ SteamCMD configurado!');
        resolve();
      });

      steamcmd.on('error', (error) => {
        clearTimeout(timeout);
        // Mesmo com erro, pode funcionar depois
        console.log('⚠️  Aviso na configuração, mas continuando...');
        resolve();
      });
    });
  }

  /**
   * Instala o SteamCMD completamente (baixa, extrai e configura)
   */
  async instalar() {
    try {
      // Verificar se já está instalado
      if (await this.verificarInstalacao()) {
        return { sucesso: true, jaInstalado: true };
      }

      console.log('\n🔧 INSTALAÇÃO AUTOMÁTICA DO STEAMCMD\n');
      console.log('📁 Diretório de instalação:', this.steamCmdDir);
      console.log('');

      // Baixar
      await this.baixarSteamCmd();

      // Extrair
      await this.extrairSteamCmd();

      // Configurar
      await this.configurarSteamCmd();

      // Verificar instalação final
      if (await this.verificarInstalacao()) {
        console.log('\n✅ SteamCMD instalado com sucesso!');
        return { sucesso: true, jaInstalado: false };
      } else {
        throw new Error('Instalação concluída mas SteamCMD não foi encontrado');
      }

    } catch (error) {
      console.error('\n❌ Erro durante instalação:', error.message);
      return { sucesso: false, erro: error.message };
    }
  }

  /**
   * Retorna o caminho do SteamCMD
   */
  getCaminho() {
    return this.steamCmdExe;
  }

  /**
   * Retorna o diretório do SteamCMD
   */
  getDiretorio() {
    return this.steamCmdDir;
  }
}

module.exports = SteamCmdInstaller;



