import axios from 'axios';

// URL base da API - pode ser configurada via variável de ambiente
// Em desenvolvimento, usa o proxy do Vite (vazio = relativo)
// Em produção, usa a URL completa do backend hospedado na nuvem
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://launcherpro.onrender.com');

// Criar instância do axios
const api = axios.create({
  baseURL: API_URL || undefined, // undefined faz o axios usar URL relativa
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // Timeout de 30 segundos para todas as requisições
});

// Interceptor para adicionar token em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Token inválido, expirado ou usuário não encontrado/deletado
      const errorMessage = error.response?.data?.error || '';
      
      // Se a conta foi deletada, usuário não encontrado ou sessão expirada (outro login), fazer logout imediato
      if (errorMessage.includes('deletada') || 
          errorMessage.includes('não encontrado') || 
          errorMessage.includes('Outro login foi realizado')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Recarregar a página para forçar logout
        window.location.reload();
        return Promise.reject(error);
      }
      
      // Outros erros de autenticação
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Disparar evento customizado para o AuthContext reagir
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

// Função auxiliar para "acordar" o servidor Render.com (se estiver dormindo)
const wakeUpServer = async () => {
  try {
    // Tentar fazer uma requisição simples para acordar o servidor
    const wakeUrl = API_URL || 'https://launcherpro.onrender.com';
    await fetch(wakeUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10000) // 10 segundos para tentar acordar
    }).catch(() => {
      // Ignorar erros - apenas tentar acordar
    });
  } catch (error) {
    // Ignorar erros - apenas tentar acordar
  }
};

// Funções de autenticação
export const authService = {
  login: async (email, senha) => {
    try {
      // Tentar "acordar" o servidor primeiro (se estiver na nuvem)
      if (!import.meta.env.DEV && API_URL && API_URL.includes('onrender.com')) {
        console.log('⏰ Tentando acordar o servidor Render.com...');
        await wakeUpServer();
        // Aguardar um pouco para o servidor processar
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('✅ Aguardando servidor acordar...');
      }
      
      // Timeout maior para login (60 segundos) - Render.com pode estar "dormindo" e precisa acordar
      const response = await api.post('/api/auth/login', { email, senha }, {
        timeout: 60000 // 60 segundos para dar tempo do servidor "acordar"
      });
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  getStoredUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
};

export default api;

