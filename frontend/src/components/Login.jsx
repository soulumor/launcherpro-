import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import profileImage from '../assets/profile.png';
import qrCodeImage from '../assets/qrcode-whatsapp.jpeg';

function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, senha);

      if (!result.success) {
        setError(result.error);
        setLoading(false);
      } else {
        // Login bem-sucedido, o contexto já atualizou o usuário
        // O App.jsx vai redirecionar automaticamente
        setLoading(false);
      }
    } catch (err) {
      console.error('Erro ao fazer login:', err);
      setError('Erro inesperado ao fazer login. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-black p-8">
          <div className="text-center mb-8">
            <div className="mb-4 flex justify-center">
              <img 
                src={profileImage} 
                alt="Profile" 
                className="w-32 h-32 object-cover rounded-full"
              />
            </div>
            <h1 className="text-white text-3xl font-bold mb-2">
              LúmorAccounts
            </h1>
            <p className="text-gray-400">Faça login para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-900/50 border-2 border-red-500 text-red-200 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-white mb-2 font-semibold">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="bg-black border-gray-700 text-white"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-white mb-2 font-semibold">
                Senha
              </label>
              <Input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-black border-gray-700 text-white"
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] transition-all duration-300"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white text-lg font-semibold mb-3">Compre seu login</p>
            <div className="flex justify-center">
              <img 
                src={qrCodeImage} 
                alt="QR Code WhatsApp" 
                className="w-40 h-40 object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

