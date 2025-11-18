// Configurações do Scraper Local
// Copie este arquivo para config.js e ajuste conforme necessário

module.exports = {
  // URL do backend na nuvem
  CLOUD_API_URL: process.env.CLOUD_API_URL || 'https://launcherpro.onrender.com',
  
  // Intervalo de verificação (em minutos)
  INTERVAL_MINUTES: parseInt(process.env.INTERVAL_MINUTES || '30'),
  
  // Delay entre requisições (em milissegundos)
  DELAY_BETWEEN_REQUESTS: 5000,
  
  // Timeout para requisições (em milissegundos)
  REQUEST_TIMEOUT: 30000
};






