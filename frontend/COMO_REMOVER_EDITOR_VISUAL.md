# 🗑️ Como Remover o Editor Visual

Este guia mostra como remover o editor visual caso você não precise mais dele.

## 📁 Arquivos para Deletar

1. `frontend/src/components/VisualEditor.jsx`
2. `frontend/src/hooks/useVisualConfig.js`

## ✏️ Arquivos para Editar

### 1. `frontend/src/components/Header.jsx`

**Remover:**
- Linha 2: `import { Settings } from 'lucide-react';`
- Linha 5: Parâmetro `onCustomizeClick` da função
- Linhas 17-24: Todo o botão "Customizar"

**Resultado:**
```jsx
function Header({ onLibraryClick }) {
  return (
    <header className="relative border-b-2 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
      <div className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3 group">
          <img src={logoImage} alt="Logo" className="w-10 h-10 rounded-full object-cover" />
          <h1 className="text-[rgb(0,181,215)] transition-all duration-300 group-hover:text-cyan-300 group-hover:[text-shadow:0_0_30px_rgba(6,182,212,0.8)] text-[24px] font-normal italic text-center">
            LauncherPro
          </h1>
        </div>

        <Button
          onClick={onLibraryClick}
          className="bg-black/80 hover:bg-black border-2 border-cyan-500 text-cyan-400 hover:text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.5)] hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] transition-all duration-300"
        >
          Biblioteca
        </Button>
      </div>
    </header>
  );
}
```

### 2. `frontend/src/App.jsx`

**Remover:**
- Linha 7: `import VisualEditor from './components/VisualEditor'`
- Linha 8: `import { useVisualConfig } from './hooks/useVisualConfig'`
- Linha 14: `const [editorOpen, setEditorOpen] = useState(false)`
- Linha 15: `const { config } = useVisualConfig()`
- Linha 47: `onCustomizeClick={() => setEditorOpen(true)}`
- Linha 57: `{config.tituloJogos || 'Jogos Disponíveis'}` → `'Jogos Disponíveis'`
- Linha 67: `gridConfig={config.gridColunas}` → remover esta prop
- Linha 85: `abasConfig={config.abas}` → remover esta prop
- Linhas 89-93: Todo o componente `<VisualEditor />`

**Resultado:**
```jsx
import { useState } from 'react'
import GameGrid from './components/GameGrid'
import GameModal from './components/GameModal'
import SyncTimer from './components/SyncTimer'
import SearchBar from './components/SearchBar'
import { Header } from './components/Header'

function App() {
  const [selectedGame, setSelectedGame] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [jogosCount, setJogosCount] = useState(0)

  // ... resto do código ...

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* ... */}
      <Header onLibraryClick={handleLibraryClick} />
      
      <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
        {/* ... */}
        <div className="mb-6">
          <h2 className="flex items-center gap-3">
            Jogos Disponíveis
            {/* ... */}
          </h2>
        </div>

        <GameGrid 
          onGameClick={handleGameClick} 
          onJogosCountChange={handleJogosCountChange}
        />
      </main>
      {/* ... */}
      {isModalOpen && selectedGame && (
        <GameModal
          game={selectedGame}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
```

### 3. `frontend/src/components/GameGrid.jsx`

**Remover:**
- Linha 9: Parâmetro `gridConfig`
- Linhas 71-120: Todo o código de grid dinâmico

**Substituir por:**
```jsx
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {jogos.map((jogo) => (
        <GameCard
          key={jogo.id}
          jogo={jogo}
          onClick={() => onGameClick(jogo)}
        />
      ))}
    </div>
  )
```

### 4. `frontend/src/components/GameModal.jsx`

**Remover:**
- Linha 16: Parâmetro `abasConfig`
- Linhas 143-169: Todo o código de abas dinâmicas

**Substituir por código fixo das abas originais**

## ✅ Verificação

Após remover, verifique se:
- ✅ O app compila sem erros
- ✅ Não há imports quebrados
- ✅ As funcionalidades principais funcionam

## 💾 Nota sobre Configurações Salvas

As configurações salvas no `localStorage` continuarão existindo, mas não serão usadas. Se quiser limpar:

```javascript
// No console do navegador (F12)
localStorage.removeItem('launcherpro_visual_config')
```

---

**Pronto!** O editor visual foi completamente removido.



