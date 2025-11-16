# 🔐 Testador de Contas Steam

Sistema integrado para testar automaticamente se contas Steam estão funcionando através de login real.

## ✨ Funcionalidades

- **Login Real**: Testa credenciais fazendo login verdadeiro na Steam
- **Interface Integrada**: Botão de teste diretamente no modal dos jogos
- **Resultados Detalhados**: Mostra status específico de cada conta
- **Atualização Automática**: Atualiza status das contas no banco
- **Rate Limiting**: Delay automático entre testes para evitar bloqueios
- **Estatísticas Visuais**: Gráficos dos resultados dos testes

## 🛠️ Pré-requisitos

### SteamCMD (Obrigatório)

1. **Baixar SteamCMD:**
   - Acesse: https://developer.valvesoftware.com/wiki/SteamCMD
   - Baixe a versão para Windows

2. **Instalar:**
   - Extraia para `C:\steamcmd\`
   - Execute `steamcmd.exe` uma vez para configurar
   - Aguarde o download inicial completar

3. **Verificar Instalação:**
   ```bash
   cd backend
   node scripts/testarLoginReal.js
   ```

## 🎮 Como Usar na Interface

### 1. Através do Modal do Jogo

1. Clique em qualquer jogo na interface
2. No modal que abrir, você verá a seção **"🔐 Testador de Contas Steam"**
3. Clique no botão **"Testar X Conta(s)"**
4. Aguarde os resultados (pode demorar alguns minutos)
5. Escolha se quer salvar os resultados no banco

### 2. Interpretando os Resultados

- **✅ Válidas**: Contas que fizeram login com sucesso
- **❌ Inválidas**: Usuário ou senha incorretos
- **🔐 Steam Guard**: Contas protegidas por autenticação de dois fatores
- **⚠️ Outros**: Erros diversos (conta bloqueada, rate limit, etc.)

## 💻 Uso via Linha de Comando

### Testar Contas de um Jogo Específico

```bash
cd backend
node scripts/testarLoginReal.js --jogo 1 --limite 5
```

### Testar uma Conta Específica

```bash
cd backend
node scripts/testarLoginReal.js --conta meuusuario minhasenha
```

### Testar e Salvar no Banco

```bash
cd backend
node scripts/testarLoginReal.js --jogo 1 --limite 3 --salvar
```

## 🔧 API Endpoints

### POST /api/contas/testar
Testa uma conta específica.

**Body:**
```json
{
  "usuario": "meuusuario",
  "senha": "minhasenha"
}
```

**Resposta:**
```json
{
  "usuario": "meuusuario",
  "sucesso": true,
  "status": "valido",
  "motivo": "Login realizado com sucesso",
  "duracao": 2500,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### POST /api/contas/testar-jogo/:jogoId
Testa todas as contas de um jogo.

**Body:**
```json
{
  "limite": 5
}
```

### POST /api/contas/atualizar-status
Atualiza status das contas no banco baseado nos resultados.

**Body:**
```json
{
  "resultados": [
    {
      "conta_id": 1,
      "sucesso": true,
      "status": "valido"
    }
  ]
}
```

## ⚠️ Importantes Considerações

### Limitações e Cuidados

1. **Steam Guard**: Contas com autenticação de dois fatores não funcionarão
2. **Rate Limiting**: Delay de 5 segundos entre cada teste
3. **Bloqueios**: Uso excessivo pode resultar em bloqueio temporário
4. **Privacidade**: Use apenas em contas próprias ou com permissão

### Status das Contas

O sistema atualiza o status das contas no banco:

- `funcionando`: Login realizado com sucesso
- `invalido`: Credenciais incorretas
- `steam_guard`: Protegido por Steam Guard
- `bloqueado`: Conta desabilitada/suspensa
- `erro`: Outros erros

### Performance

- **Timeout**: 30 segundos por tentativa de login
- **Delay**: 5 segundos entre tentativas
- **Limite Recomendado**: Máximo 10 contas por vez

## 🐛 Solução de Problemas

### "SteamCMD não encontrado"

1. Verifique se SteamCMD está instalado em `C:\steamcmd\`
2. Execute `steamcmd.exe` manualmente uma vez
3. Adicione SteamCMD ao PATH do sistema (opcional)

### "Erro ao executar SteamCMD"

1. Verifique permissões de execução
2. Execute como administrador se necessário
3. Verifique se não há antivírus bloqueando

### "Rate Limit" ou "Muitas tentativas"

1. Aguarde alguns minutos antes de testar novamente
2. Reduza o número de contas testadas por vez
3. Aumente o delay entre tentativas se necessário

### Conta não funciona mas deveria

1. Verifique se Steam Guard está desabilitado
2. Teste login manual no Steam
3. Verifique se a conta não está bloqueada

## 📊 Logs e Monitoramento

O sistema gera logs detalhados no console:

```
🔐 Testando login real: meuusuario
✅ meuusuario: Login realizado com sucesso
📝 Conta ID 1: funcionando
```

Para monitorar em produção, verifique os logs do servidor backend.

## 🔄 Integração com Sistema Existente

O testador se integra perfeitamente com:

- **GameModal**: Interface visual para testes
- **Controller de Contas**: APIs REST para automação
- **Banco de Dados**: Atualização automática de status
- **Sistema de Sincronização**: Pode ser usado em scripts automatizados

## 📈 Próximas Melhorias

- [ ] Suporte a Steam Guard via API
- [ ] Teste em lote com paralelização
- [ ] Agendamento automático de testes
- [ ] Relatórios de histórico de testes
- [ ] Notificações quando contas param de funcionar



