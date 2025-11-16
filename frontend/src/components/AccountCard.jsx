import { useState } from 'react'
import { Eye, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

function AccountCard({ account, onViewCredentials, onRetest }) {
  const [retesting, setRetesting] = useState(false)

  const handleRetest = async () => {
    setRetesting(true)
    await onRetest()
    setRetesting(false)
  }

  const getStatusBadge = () => {
    const status = account.status?.toLowerCase()
    
    if (status === 'valid' || status === 'funcionando' || status === 'disponivel') {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]">
          ✓ Válida
        </Badge>
      )
    }
    
    if (status === 'invalid' || status === 'invalido' || status === 'credenciais_invalidas') {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
          ✗ Inválida
        </Badge>
      )
    }
    
    if (status === 'steam-guard' || status === 'steam_guard') {
      return (
        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]">
          🛡️ Steam Guard
        </Badge>
      )
    }
    
    return (
      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50">
        {status || 'Desconhecido'}
      </Badge>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca testada'
    try {
      const date = new Date(dateString)
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return 'Data inválida'
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusBadge()}
            {account.lastTested && (
              <span className="text-xs text-gray-400">
                Testada: {formatDate(account.lastTested)}
              </span>
            )}
          </div>
          <p className="text-white truncate">{account.usuario || account.username}</p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onViewCredentials}
            variant="outline"
            size="sm"
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all duration-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Eye className="w-4 h-4 mr-1" />
            Ver credenciais
          </Button>

          <Button
            onClick={handleRetest}
            disabled={retesting}
            variant="outline"
            size="sm"
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20 hover:border-purple-400 transition-all duration-300 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]"
          >
            {retesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-1" />
                Retestar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AccountCard



