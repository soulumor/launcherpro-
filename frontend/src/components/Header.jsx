import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';
import logoImage from '../assets/logo.png';

function Header({ onLibraryClick }) {
  const { user, logout } = useAuth();

  return (
    <header className="relative border-b-2 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
      <div className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3 group">
          <img src={logoImage} alt="Logo" className="w-10 h-10 rounded-full object-cover" />
          <h1 className="text-[rgb(0,181,215)] transition-all duration-300 group-hover:text-cyan-300 group-hover:[text-shadow:0_0_30px_rgba(6,182,212,0.8)] text-[24px] font-normal italic text-center">
            LúmorAccounts
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 text-cyan-400">
              <User className="w-4 h-4" />
              <span className="text-sm font-semibold">{user.nome}</span>
              {user.tipo !== 'admin' && user.diasRestantes !== null && (
                <span className={`text-xs px-2 py-1 rounded ${
                  user.diasRestantes <= 0 ? 'bg-red-500/30 text-red-300' :
                  user.diasRestantes <= 7 ? 'bg-yellow-500/30 text-yellow-300' :
                  'bg-green-500/30 text-green-300'
                }`}>
                  {user.diasRestantes} dias
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              onClick={onLibraryClick}
              className="bg-black/80 hover:bg-black border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] transition-all duration-300"
            >
              <span className="text-[rgb(0,181,215)] group-hover:text-cyan-400 transition-colors font-bold">
                Biblioteca
              </span>
            </Button>

            {user && (
              <Button
                onClick={logout}
                className="bg-red-600/80 hover:bg-red-600 border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] hover:shadow-[0_0_25px_rgba(239,68,68,0.8)] transition-all duration-300"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="text-red-200 hover:text-red-100 transition-colors font-bold">
                  Sair
                </span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export { Header };

