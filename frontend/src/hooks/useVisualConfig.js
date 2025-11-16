import { useState, useEffect } from 'react'

const STORAGE_KEY = 'launcherpro_visual_config'

// Configurações padrão
const defaultConfig = {
  // Títulos
  tituloJogos: 'Jogos Disponíveis',
  tituloBiblioteca: 'Biblioteca',
  
  // Grid
  gridColunas: {
    mobile: 1,
    tablet: 2,
    desktop: 3,
    large: 5
  },
  
  // Abas do modal
  abas: [
    { id: 'valid', label: 'Válidas', cor: 'green-cyan', ativa: true },
    { id: 'invalid', label: 'Inválidas/Steam Guard', cor: 'red-orange', ativa: true }
  ],
  
  // Cores
  cores: {
    primary: '#06b6d4',
    secondary: '#1a1a1a',
    accent: '#a855f7'
  }
}

export function useVisualConfig() {
  const [config, setConfig] = useState(defaultConfig)
  const [loaded, setLoaded] = useState(false)

  // Carregar do localStorage ao iniciar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setConfig({ ...defaultConfig, ...parsed })
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoaded(true)
    }
  }, [])

  // Salvar no localStorage quando mudar
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
      } catch (error) {
        console.error('Erro ao salvar configurações:', error)
      }
    }
  }, [config, loaded])

  const updateConfig = (updates) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const resetConfig = () => {
    setConfig(defaultConfig)
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    config,
    updateConfig,
    resetConfig,
    loaded
  }
}

