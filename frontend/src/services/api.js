import axios from 'axios';

// URL base da API - pode ser configurada via variável de ambiente
// Em desenvolvimento, usa o proxy do Vite (vazio = relativo)
// Em produção, usa a URL completa do backend hospedado
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'http://localhost:3001');

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

// Funções de autenticação
export const authService = {
  login: async (email, senha) => {
    try {
      const response = await api.post('/api/auth/login', { email, senha });
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

