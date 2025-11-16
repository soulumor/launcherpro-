import { useState, useEffect } from 'react';
import api from '../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent } from './ui/dialog';
import { X, Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react';

function AdminPanel({ isOpen, onClose }) {
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
    if (isOpen) {
      carregarUsuarios();
    }
  }, [isOpen]);

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
    if (!confirm('Tem certeza que deseja desativar este usuário?')) {
      return;
    }

    try {
      await api.delete(`/api/admin/usuarios/${id}`);
      carregarUsuarios();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao desativar usuário');
    }
  };

  const getDiasColor = (dias) => {
    if (dias === null) return 'text-gray-400';
    if (dias <= 0) return 'text-red-400';
    if (dias <= 7) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gray-900 border-2 border-cyan-500">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">Painel Administrativo</h2>
          <div className="flex gap-2">
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
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
            <Button onClick={onClose} variant="ghost" size="icon">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border-2 border-red-500 text-red-200 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {showForm && (
          <div className="bg-gray-800 border-2 border-cyan-500 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">
              {editingUser ? 'Editar Cliente' : 'Novo Cliente'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-cyan-400 mb-2 font-semibold">Nome</label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                    className="bg-black/50 border-cyan-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-cyan-400 mb-2 font-semibold">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="bg-black/50 border-cyan-500 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-cyan-400 mb-2 font-semibold">
                    {editingUser ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha'}
                  </label>
                  <Input
                    type="password"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    required={!editingUser}
                    className="bg-black/50 border-cyan-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-cyan-400 mb-2 font-semibold">Tipo</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full h-9 rounded-md border border-cyan-500 bg-black/50 text-white px-3"
                  >
                    <option value="cliente">Cliente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-cyan-400 mb-2 font-semibold">Dias de Mensalidade</label>
                  <Input
                    type="number"
                    value={formData.dias_mensalidade}
                    onChange={(e) => setFormData({ ...formData, dias_mensalidade: parseInt(e.target.value) || 30 })}
                    required
                    className="bg-black/50 border-cyan-500 text-white"
                  />
                </div>
                {editingUser && (
                  <div>
                    <label className="block text-cyan-400 mb-2 font-semibold">Adicionar Dias (opcional)</label>
                    <Input
                      type="number"
                      value={formData.adicionar_dias}
                      onChange={(e) => setFormData({ ...formData, adicionar_dias: e.target.value })}
                      placeholder="Ex: 30"
                      className="bg-black/50 border-cyan-500 text-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
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

        {loading ? (
          <div className="text-center py-8 text-cyan-400">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-cyan-500">
                  <th className="text-left p-3 text-cyan-400 font-bold">Nome</th>
                  <th className="text-left p-3 text-cyan-400 font-bold">Email</th>
                  <th className="text-left p-3 text-cyan-400 font-bold">Tipo</th>
                  <th className="text-left p-3 text-cyan-400 font-bold">Dias Restantes</th>
                  <th className="text-left p-3 text-cyan-400 font-bold">Status</th>
                  <th className="text-left p-3 text-cyan-400 font-bold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id} className="border-b border-gray-700 hover:bg-gray-800">
                    <td className="p-3 text-white">{usuario.nome}</td>
                    <td className="p-3 text-gray-300">{usuario.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        usuario.tipo === 'admin' 
                          ? 'bg-purple-500/30 text-purple-300' 
                          : 'bg-cyan-500/30 text-cyan-300'
                      }`}>
                        {usuario.tipo}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`font-bold ${getDiasColor(usuario.diasRestantes)}`}>
                        {usuario.diasRestantes !== null ? `${usuario.diasRestantes} dias` : 'N/A'}
                      </span>
                    </td>
                    <td className="p-3">
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
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEdit(usuario)}
                          size="sm"
                          variant="ghost"
                          className="text-cyan-400 hover:text-cyan-300"
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
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AdminPanel;

