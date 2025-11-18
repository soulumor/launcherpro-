import { useState, useEffect } from 'react'
import GameCard from './GameCard'
import api from '../services/api'

/**
 * Componente que renderiza uma grade de jogos
 * Busca os jogos da API e exibe em cards
 */
function GameGrid({ onGameClick, onJogosCountChange, gridConfig }) {
  const [jogos, setJogos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [contasPorJogo, setContasPorJogo] = useState({}) // { jogoId: { validas: X, total: Y } }

  useEffect(() => {
    // Buscar jogos da API
    const fetchJogos = async () => {
      try {
        setLoading(true)
        
        // Buscar jogos com contagem de contas (mais eficiente - uma única query SQL)
        const response = await api.get('/api/jogos?comContas=true')
        const jogosData = response.data
        setJogos(jogosData)
        setError(null)
        
        // Notificar o componente pai sobre a quantidade de jogos
        if (onJogosCountChange) {
          onJogosCountChange(jogosData.length)
        }

        // Usar contagens que já vêm com os jogos (muito mais rápido!)
        const contasData = {}
        jogosData.forEach(jogo => {
          contasData[jogo.id] = {
            validas: jogo.contasValidas || 0,
            total: jogo.totalContas || 0
          }
        })
        
        setContasPorJogo(contasData)
      } catch (err) {
        console.error('Erro ao buscar jogos:', err)
        setError('Erro ao carregar jogos. Certifique-se de que o backend está rodando.')
        if (onJogosCountChange) {
          onJogosCountChange(0)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchJogos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-steam-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando jogos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
        <p className="text-red-400">{error}</p>
        <p className="text-gray-500 text-sm mt-2">
          Execute o backend com: <code className="bg-gray-800 px-2 py-1 rounded">npm install && npm start</code>
        </p>
      </div>
    )
  }

  if (jogos.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-xl">Nenhum jogo encontrado</p>
      </div>
    )
  }

  // Usar configuração de grid se fornecida, senão usar padrão
  // FORÇAR máximo de 5 colunas em telas grandes
  const grid = gridConfig ? {
    ...gridConfig,
    large: Math.min(gridConfig.large || 5, 5) // Forçar máximo de 5
  } : {
    mobile: 1,
    tablet: 2,
    desktop: 3,
    large: 5
  }

  // Mapear valores para classes Tailwind (safepist)
  const gridClassMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8'
  }

  const smClassMap = {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
    5: 'sm:grid-cols-5',
    6: 'sm:grid-cols-6'
  }

  const mdClassMap = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6'
  }

  const lgClassMap = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-5', // Limitar a 5 mesmo se configurado 6
    7: 'lg:grid-cols-5', // Limitar a 5 mesmo se configurado 7
    8: 'lg:grid-cols-5'  // Limitar a 5 mesmo se configurado 8
  }

  // Garantir que large nunca seja maior que 5
  const largeCols = Math.min(grid.large || 5, 5)
  
  const gridClasses = `grid gap-3 ${gridClassMap[grid.mobile] || 'grid-cols-1'} ${smClassMap[grid.tablet] || 'sm:grid-cols-2'} ${mdClassMap[grid.desktop] || 'md:grid-cols-3'} ${lgClassMap[largeCols] || 'lg:grid-cols-5'}`

  return (
    <div className={gridClasses}>
      {jogos.map((jogo) => {
        const contasInfo = contasPorJogo[jogo.id] || { validas: 0, total: 0 }
        return (
          <GameCard
            key={jogo.id}
            jogo={jogo}
            onClick={() => onGameClick(jogo)}
            contasValidas={contasInfo.validas}
            totalContas={contasInfo.total}
          />
        )
      })}
    </div>
  )
}

export default GameGrid

