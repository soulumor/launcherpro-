import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se há token e usuário armazenados
    const storedUser = authService.getStoredUser();
    const hasToken = authService.isAuthenticated();
    
    // Se não tem token, não tentar validar
    if (!hasToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    
    // Se tem token mas não tem usuário armazenado, limpar token (inconsistência)
    if (!storedUser) {
      authService.logout();
      setUser(null);
      setLoading(false);
      return;
    }
    
    // Validar token com o backend
    setUser(storedUser); // Mostrar temporariamente enquanto valida
    authService.getCurrentUser()
      .then((currentUser) => {
        // Token válido - atualizar dados do usuário
        setUser({
          ...storedUser,
          ...currentUser
        });
      })
      .catch((error) => {
        // Token inválido, expirado ou usuário não encontrado
        console.warn('Token inválido ou expirado:', error);
        authService.logout();
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });

    // Ouvir evento de logout forçado (quando conta é deletada)
    const handleForcedLogout = () => {
      authService.logout();
      setUser(null);
    };

    window.addEventListener('auth:logout', handleForcedLogout);

    return () => {
      window.removeEventListener('auth:logout', handleForcedLogout);
    };
  }, []);

  const login = async (email, senha) => {
    try {
      const data = await authService.login(email, senha);
      setUser(data.user);
      return { success: true, data };
    } catch (error) {
      console.error('Erro no login:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Erro ao fazer login. Verifique sua conexão.';
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.tipo === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}

