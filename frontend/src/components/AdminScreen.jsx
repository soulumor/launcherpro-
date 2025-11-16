import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { LogOut, Plus, Edit, Trash2, UserCheck, UserX, Settings } from 'lucide-react';
import logoImage from '../assets/logo.png';

function AdminScreen() {
  const { user, logout } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    tipo: 'cliente',
    dias_mensalidade: 30,
    adicionar_dias: ''
  });

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/usuarios');
      setUsuarios(response.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingUser) {
        // Editar usuário
        const updateData = {
          nome: formData.nome,
          email: formData.email,
          tipo: formData.tipo,
          dias_mensalidade: formData.dias_mensalidade
        };

        if (formData.adicionar_dias) {
          updateData.adicionar_dias = parseInt(formData.adicionar_dias);
        }

        if (formData.senha) {
          updateData.senha = formData.senha;
        }

        await api.put(`/api/admin/usuarios/${editingUser.id}`, updateData);
      } else {
        // Criar usuário
        await api.post('/api/admin/usuarios', {
          nome: formData.nome,
          email: formData.email,
          senha: formData.senha,
          tipo: formData.tipo,
          dias_mensalidade: formData.dias_mensalidade
        });
      }

      setShowForm(false);
      setEditingUser(null);
      setFormData({
        nome: '',
        email: '',
        senha: '',
        tipo: 'cliente',
        dias_mensalidade: 30,
        adicionar_dias: ''
      });
      carregarUsuarios();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar usuário');
    }
  };

  const handleEdit = (usuario) => {
    setEditingUser(usuario);
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      tipo: usuario.tipo,
      dias_mensalidade: usuario.dias_mensalidade,
      adicionar_dias: ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('⚠️ ATENÇÃO: Esta ação é irreversível!\n\nTem certeza que deseja deletar este usuário permanentemente?')) {
      return;
    }

    try {
      setError('');
      await api.delete(`/api/admin/usuarios/${id}`);
      
      // Remover o usuário da lista imediatamente (otimista)
      setUsuarios(prevUsuarios => prevUsuarios.filter(usuario => usuario.id !== id));
      
      // Recarregar a lista para garantir sincronização
      carregarUsuarios();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao deletar usuário');
      // Se der erro, recarregar a lista para garantir estado correto
      carregarUsuarios();
    }
  };

  const getDiasColor = (dias) => {
    if (dias === null) return 'text-gray-400';
    if (dias <= 0) return 'text-red-400';
    if (dias <= 7) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Scan line effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-scan-line" />
        </div>
      </div>

      {/* Header Admin */}
      <header className="relative border-b-2 border-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.5)]">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <img src={logoImage} alt="Logo" className="w-10 h-10 rounded-full object-cover" />
            <div>
              <h1 className="text-purple-400 transition-all duration-300 group-hover:text-purple-300 group-hover:[text-shadow:0_0_30px_rgba(147,51,234,0.8)] text-[24px] font-normal italic">
                LúmorAccounts
              </h1>
              <p className="text-purple-500 text-sm">Painel Administrativo</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 text-purple-400">
                <Settings className="w-4 h-4" />
                <span className="text-sm font-semibold">{user.nome}</span>
              </div>
            )}

            <Button
              onClick={logout}
              className="bg-red-600/80 hover:bg-red-600 border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:shadow-[0_0_25px_rgba(239,68,68,0.8)] transition-all duration-300"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="text-red-200 hover:text-red-100 transition-colors font-bold">
                Sair
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-purple-400 mb-2">Gerenciamento de Clientes</h2>
          <p className="text-gray-400">Gerencie usuários, mensalidades e acessos ao sistema</p>
        </div>

        {error && (
          <div className="bg-red-900/50 border-2 border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Botão Novo Cliente */}
        <div className="mb-6">
          <Button
            onClick={() => {
              setEditingUser(null);
              setFormData({
                nome: '',
                email: '',
                senha: '',
                tipo: 'cliente',
                dias_mensalidade: 30,
                adicionar_dias: ''
              });
              setShowForm(true);
            }}
            className="bg-purple-600 hover:bg-purple-700 border-2 border-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.5)] hover:shadow-[0_0_25px_rgba(147,51,234,0.8)] transition-all duration-300"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Cliente
          </Button>
        </div>

        {/* Formulário de Criar/Editar */}
        {showForm && (
          <div className="bg-gray-900 border-2 border-purple-500 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-purple-400 mb-4">
              {editingUser ? 'Editar Cliente' : 'Novo Cliente'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-purple-400 mb-2 font-semibold">Nome</label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    className="bg-black/50 border-purple-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-purple-400 mb-2 font-semibold">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="bg-black/50 border-purple-500 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-purple-400 mb-2 font-semibold">
                    {editingUser ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha'}
                  </label>
                  <Input
                    type="password"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    required={!editingUser}
                    className="bg-black/50 border-purple-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-purple-400 mb-2 font-semibold">Tipo</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full h-9 rounded-md border border-purple-500 bg-black/50 text-white px-3"
                  >
                    <option value="cliente">Cliente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-purple-400 mb-2 font-semibold">Dias de Mensalidade</label>
                  <Input
                    type="number"
                    value={formData.dias_mensalidade}
                    onChange={(e) => setFormData({ ...formData, dias_mensalidade: parseInt(e.target.value) || 30 })}
                    required
                    className="bg-black/50 border-purple-500 text-white"
                  />
                </div>
                {editingUser && (
                  <div>
                    <label className="block text-purple-400 mb-2 font-semibold">Adicionar Dias (opcional)</label>
                    <Input
                      type="number"
                      value={formData.adicionar_dias}
                      onChange={(e) => setFormData({ ...formData, adicionar_dias: e.target.value })}
                      placeholder="Ex: 30"
                      className="bg-black/50 border-purple-500 text-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  {editingUser ? 'Salvar' : 'Criar'}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                  }}
                  variant="ghost"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Tabela de Usuários */}
        {loading ? (
          <div className="text-center py-8 text-purple-400">Carregando...</div>
        ) : (
          <div className="bg-gray-900 border-2 border-purple-500 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-purple-500 bg-gray-800">
                    <th className="text-left p-4 text-purple-400 font-bold">Nome</th>
                    <th className="text-left p-4 text-purple-400 font-bold">Email</th>
                    <th className="text-left p-4 text-purple-400 font-bold">Tipo</th>
                    <th className="text-left p-4 text-purple-400 font-bold">Dias Restantes</th>
                    <th className="text-left p-4 text-purple-400 font-bold">Último Login</th>
                    <th className="text-left p-4 text-purple-400 font-bold">Status</th>
                    <th className="text-left p-4 text-purple-400 font-bold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id} className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
                      <td className="p-4 text-white">{usuario.nome}</td>
                      <td className="p-4 text-gray-300">{usuario.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          usuario.tipo === 'admin' 
                            ? 'bg-purple-500/30 text-purple-300' 
                            : 'bg-cyan-500/30 text-cyan-300'
                        }`}>
                          {usuario.tipo}
                        </span>
                      </td>
                      <td className="p-4">
                        {usuario.tipo === 'admin' ? (
                          <span className="font-bold text-purple-400">Ilimitado</span>
                        ) : (
                          <span className={`font-bold ${getDiasColor(usuario.diasRestantes)}`}>
                            {usuario.diasRestantes !== null ? `${usuario.diasRestantes} dias` : 'N/A'}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {usuario.ultimo_login ? (
                          <div className="text-sm">
                            <div className="text-cyan-300 font-semibold">
                              {new Date(usuario.ultimo_login).toLocaleDateString('pt-BR')}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {new Date(usuario.ultimo_login).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">Nunca logou</span>
                        )}
                      </td>
                      <td className="p-4">
                        {usuario.ativo === 1 ? (
                          <span className="flex items-center gap-1 text-green-400">
                            <UserCheck className="w-4 h-4" />
                            Ativo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400">
                            <UserX className="w-4 h-4" />
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleEdit(usuario)}
                            size="sm"
                            variant="ghost"
                            className="text-purple-400 hover:text-purple-300"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(usuario.id)}
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t-2 border-purple-500/50 mt-12 relative z-10">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-gray-400 font-semibold">
            <span className="text-purple-400">Painel Administrativo</span> - LúmorAccounts © 2024
          </p>
        </div>
      </footer>
    </div>
  );
}

export default AdminScreen;

