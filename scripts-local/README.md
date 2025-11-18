# 🚀 Scraper Local em Segundo Plano

Script Node.js que roda **localmente no seu PC** e usa Puppeteer para buscar contas do site `pokopow.com`, enviando automaticamente para o backend na nuvem.

## 🎯 Por que usar?

- ✅ **Backend fraco (512 MB RAM)**: Não pode usar Puppeteer (consome 200-500 MB)
- ✅ **Seu PC tem recursos**: Pode usar Puppeteer tranquilamente
- ✅ **Roda em segundo plano**: Não interfere no uso do app
- ✅ **Busca automática**: Verifica jogos sem contas periodicamente
- ✅ **Envia para nuvem**: Contas ficam disponíveis para todos

## 📋 Pré-requisitos

1. **Node.js instalado** (v16 ou superior)
   - Baixe em: https://nodejs.org

2. **Conexão com internet**
   - Para acessar o site pokopow.com
   - Para enviar dados para o backend na nuvem

## 🚀 Como usar

### Opção 1: Iniciar em Segundo Plano (Recomendado)

1. Abra PowerShell na pasta do projeto:
```powershell
cd "C:\LauncherPro - Copia\scripts-local"
```

2. Execute o script:
```powershell
.\start-background.ps1
```

O script iniciará em uma janela minimizada e rodará em segundo plano.

### Opção 2: Executar Manualmente

1. Instale as dependências:
```powershell
cd scripts-local
npm install
```

2. Execute o script:
```powershell
node buscar-contas-background.js
```

## ⚙️ Configurações

Crie um arquivo `.env` na pasta `scripts-local/` (opcional):

```env
# URL do backend na nuvem
CLOUD_API_URL=https://launcherpro.onrender.com

# Intervalo de verificação (em minutos)
INTERVAL_MINUTES=30
```

Se não criar o `.env`, usará os valores padrão.

## 🔄 Como Funciona

1. **Verifica jogos sem contas**
   - A cada 30 minutos (padrão)
   - Busca jogos do backend na nuvem
   - Identifica jogos sem contas

2. **Busca contas no site**
   - Usa Puppeteer (Chrome real)
   - Navega até pokopow.com
   - Busca o jogo
   - Extrai credenciais da página

3. **Envia para backend**
   - Faz POST para `/api/contas`
   - Backend armazena no banco
   - Contas ficam disponíveis no app

## 📊 Logs

O script mostra logs no console:
- ✅ Jogos processados
- ✅ Contas adicionadas
- ❌ Erros
- ⏳ Próxima verificação

## 🛑 Parar o Script

Pressione `Ctrl+C` no terminal onde o script está rodando.

## 🔧 Troubleshooting

### Erro: "Node.js não encontrado"
- Instale Node.js: https://nodejs.org

### Erro: "Cannot find module 'puppeteer'"
- Execute: `npm install` na pasta `scripts-local/`

### Erro: "Request failed with status code 403"
- O site pode estar bloqueando temporariamente
- O script tentará novamente na próxima verificação

### Script não encontra contas
- Verifique se o jogo existe no site pokopow.com
- Verifique os logs para erros específicos

## 📝 Notas

- O script roda **apenas no seu PC** (não no servidor)
- Usa recursos do **seu PC** (RAM/CPU), não do servidor fraco
- Pode rodar **24/7** se desejar
- Não interfere no uso do app frontend

## 🎯 Resultado

Contas encontradas são **automaticamente adicionadas ao backend na nuvem** e ficam disponíveis para todos os usuários do app!







