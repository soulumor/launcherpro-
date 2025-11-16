import { useState, useEffect } from 'react'
import { X, Settings, Type, Grid, Layers, Palette, RotateCcw, Save } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useVisualConfig } from '../hooks/useVisualConfig'

function VisualEditor({ isOpen, onClose }) {
  const { config, updateConfig, resetConfig } = useVisualConfig()
  const [localConfig, setLocalConfig] = useState(config)

  // Sincronizar quando config mudar externamente
  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  const handleSave = () => {
    updateConfig(localConfig)
    alert('✅ Configurações salvas! A página será recarregada para aplicar as mudanças.')
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  const handleReset = () => {
    if (confirm('Tem certeza que deseja resetar todas as configurações?')) {
      resetConfig()
      setLocalConfig({
        tituloJogos: 'Jogos Disponíveis',
        tituloBiblioteca: 'Biblioteca',
        gridColunas: {
          mobile: 1,
          tablet: 2,
          desktop: 3,
          large: 4
        },
        abas: [
          { id: 'valid', label: 'Válidas', cor: 'green-cyan', ativa: true },
          { id: 'invalid', label: 'Inválidas/Steam Guard', cor: 'red-orange', ativa: true }
        ],
        cores: {
          primary: '#06b6d4',
          secondary: '#1a1a1a',
          accent: '#a855f7'
        }
      })
    }
  }

  const addAba = () => {
    const novaAba = {
      id: `aba-${Date.now()}`,
      label: 'Nova Aba',
      cor: 'green-cyan',
      ativa: true
    }
    setLocalConfig(prev => ({
      ...prev,
      abas: [...prev.abas, novaAba]
    }))
  }

  const removeAba = (id) => {
    if (localConfig.abas.length <= 1) {
      alert('Você precisa ter pelo menos uma aba!')
      return
    }
    setLocalConfig(prev => ({
      ...prev,
      abas: prev.abas.filter(aba => aba.id !== id)
    }))
  }

  const updateAba = (id, updates) => {
    setLocalConfig(prev => ({
      ...prev,
      abas: prev.abas.map(aba => 
        aba.id === id ? { ...aba, ...updates } : aba
      )
    }))
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Painel lateral */}
      <div className="fixed right-0 top-0 h-full w-96 bg-gray-900 border-l-2 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.3)] z-50 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cyan-500/30 pb-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-cyan-400">Editor Visual</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Seção: Títulos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-cyan-400">
              <Type className="w-4 h-4" />
              <h3 className="font-semibold">Títulos</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Título "Jogos Disponíveis"
                </label>
                <Input
                  value={localConfig.tituloJogos}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, tituloJogos: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Jogos Disponíveis"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Título "Biblioteca"
                </label>
                <Input
                  value={localConfig.tituloBiblioteca}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, tituloBiblioteca: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                  placeholder="Biblioteca"
                />
              </div>
            </div>
          </div>

          {/* Seção: Grid */}
          <div className="space-y-4 border-t border-gray-700 pt-4">
            <div className="flex items-center gap-2 text-cyan-400">
              <Grid className="w-4 h-4" />
              <h3 className="font-semibold">Tamanho da Grid</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Mobile: {localConfig.gridColunas.mobile} coluna(s)
                </label>
                <input
                  type="range"
                  min="1"
                  max="2"
                  value={localConfig.gridColunas.mobile}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    gridColunas: { ...prev.gridColunas, mobile: parseInt(e.target.value) }
                  }))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Tablet: {localConfig.gridColunas.tablet} coluna(s)
                </label>
                <input
                  type="range"
                  min="2"
                  max="4"
                  value={localConfig.gridColunas.tablet}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    gridColunas: { ...prev.gridColunas, tablet: parseInt(e.target.value) }
                  }))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Desktop: {localConfig.gridColunas.desktop} coluna(s)
                </label>
                <input
                  type="range"
                  min="3"
                  max="6"
                  value={localConfig.gridColunas.desktop}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    gridColunas: { ...prev.gridColunas, desktop: parseInt(e.target.value) }
                  }))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Large: {localConfig.gridColunas.large} coluna(s)
                </label>
                <input
                  type="range"
                  min="4"
                  max="8"
                  value={localConfig.gridColunas.large}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    gridColunas: { ...prev.gridColunas, large: parseInt(e.target.value) }
                  }))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Seção: Abas */}
          <div className="space-y-4 border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400">
                <Layers className="w-4 h-4" />
                <h3 className="font-semibold">Abas do Modal</h3>
              </div>
              <Button
                onClick={addAba}
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                + Adicionar
              </Button>
            </div>
            
            <div className="space-y-3">
              {localConfig.abas.map((aba, index) => (
                <div key={aba.id} className="bg-gray-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Aba {index + 1}</span>
                    {localConfig.abas.length > 1 && (
                      <button
                        onClick={() => removeAba(aba.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        🗑️ Remover
                      </button>
                    )}
                  </div>
                  
                  <Input
                    value={aba.label}
                    onChange={(e) => updateAba(aba.id, { label: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white text-sm"
                    placeholder="Nome da aba"
                  />
                  
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400">Cor:</label>
                    <select
                      value={aba.cor}
                      onChange={(e) => updateAba(aba.id, { cor: e.target.value })}
                      className="flex-1 bg-gray-700 border border-gray-600 text-white text-xs rounded px-2 py-1"
                    >
                      <option value="green-cyan">Verde → Cyan</option>
                      <option value="red-orange">Vermelho → Laranja</option>
                      <option value="blue-purple">Azul → Roxo</option>
                      <option value="purple-pink">Roxo → Rosa</option>
                    </select>
                  </div>
                  
                  <label className="flex items-center gap-2 text-xs text-gray-400">
                    <input
                      type="checkbox"
                      checked={aba.ativa}
                      onChange={(e) => updateAba(aba.id, { ativa: e.target.checked })}
                      className="rounded"
                    />
                    Aba ativa
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Seção: Cores */}
          <div className="space-y-4 border-t border-gray-700 pt-4">
            <div className="flex items-center gap-2 text-cyan-400">
              <Palette className="w-4 h-4" />
              <h3 className="font-semibold">Cores</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Cor Primária
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={localConfig.cores.primary}
                    onChange={(e) => setLocalConfig(prev => ({
                      ...prev,
                      cores: { ...prev.cores, primary: e.target.value }
                    }))}
                    className="w-12 h-10 rounded border border-gray-600"
                  />
                  <Input
                    value={localConfig.cores.primary}
                    onChange={(e) => setLocalConfig(prev => ({
                      ...prev,
                      cores: { ...prev.cores, primary: e.target.value }
                    }))}
                    className="flex-1 bg-gray-800 border-gray-700 text-white"
                    placeholder="#06b6d4"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Cor Secundária
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={localConfig.cores.secondary}
                    onChange={(e) => setLocalConfig(prev => ({
                      ...prev,
                      cores: { ...prev.cores, secondary: e.target.value }
                    }))}
                    className="w-12 h-10 rounded border border-gray-600"
                  />
                  <Input
                    value={localConfig.cores.secondary}
                    onChange={(e) => setLocalConfig(prev => ({
                      ...prev,
                      cores: { ...prev.cores, secondary: e.target.value }
                    }))}
                    className="flex-1 bg-gray-800 border-gray-700 text-white"
                    placeholder="#1a1a1a"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Cor de Destaque
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={localConfig.cores.accent}
                    onChange={(e) => setLocalConfig(prev => ({
                      ...prev,
                      cores: { ...prev.cores, accent: e.target.value }
                    }))}
                    className="w-12 h-10 rounded border border-gray-600"
                  />
                  <Input
                    value={localConfig.cores.accent}
                    onChange={(e) => setLocalConfig(prev => ({
                      ...prev,
                      cores: { ...prev.cores, accent: e.target.value }
                    }))}
                    className="flex-1 bg-gray-800 border-gray-700 text-white"
                    placeholder="#a855f7"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="space-y-2 border-t border-gray-700 pt-4">
            <Button
              onClick={handleSave}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </Button>
            
            <Button
              onClick={handleReset}
              variant="outline"
              className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Resetar Tudo
            </Button>
          </div>

          {/* Info */}
          <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-700">
            💡 As mudanças são salvas automaticamente no navegador
          </div>
        </div>
      </div>
    </>
  )
}

export default VisualEditor

