
# Plano: Atualização de Tema e Dark/Light Mode

## Resumo
Vou atualizar o tema da aplicação para usar a paleta de cores da sua marca (amarelo dourado #ffd319, branco #ffffff, preto #000000, cinza #7d7c73), implementar o toggle de dark/light mode respeitando a preferência do sistema, e adicionar texturas visuais com efeitos de glossy gradient para uma aparência mais premium.

---

## Mudancas Visuais Esperadas

### Paleta de Cores
- **Primaria**: Amarelo dourado (#ffd319) - botoes principais, links, destaques
- **Fundo claro**: Branco (#ffffff) com tons suaves de cinza quente
- **Fundo escuro**: Preto (#000000) com cinza escuro para cards
- **Neutros**: Cinza (#7d7c73) para textos secundarios e bordas

### Efeitos de Textura
- Gradientes glossy sutis nos cards
- Efeito de brilho leve nos botoes primarios
- Backgrounds com texturas de luz suave
- Transicoes suaves entre temas

---

## Etapas de Implementacao

### Etapa 1: Criar Provider de Tema
Criar um componente ThemeProvider para gerenciar o estado do tema (light/dark/system) e persistir a preferencia do usuario.

**Arquivos:**
- `src/components/theme/ThemeProvider.tsx` (novo)
- `src/components/theme/ThemeToggle.tsx` (novo)

### Etapa 2: Atualizar CSS com Nova Paleta
Modificar o arquivo `src/index.css` para:
- Substituir a paleta azul atual pela nova paleta amarelo/dourado
- Ajustar variaveis HSL para as novas cores
- Adicionar classes de textura glossy
- Criar gradientes com a nova paleta
- Definir tema dark com cores adequadas

**Cores HSL a serem usadas:**
- Amarelo #ffd319 = HSL(50, 100%, 55%)
- Branco #ffffff = HSL(0, 0%, 100%)
- Preto #000000 = HSL(0, 0%, 0%)
- Cinza #7d7c73 = HSL(48, 6%, 47%)

### Etapa 3: Integrar ThemeProvider no App
Envolver a aplicacao com o ThemeProvider para que todas as paginas respeitem o tema selecionado.

**Arquivo:** `src/App.tsx`

### Etapa 4: Adicionar Toggle de Tema no Layout
Inserir o botao de alternar tema no header da aplicacao para acesso facil.

**Arquivo:** `src/components/layout/AppLayout.tsx`

### Etapa 5: Ajustar Componentes com Efeitos Glossy
Adicionar classes de textura aos componentes principais:
- Cards com efeito de vidro (glassmorphism)
- Botoes com brilho sutil
- Sidebar com gradiente suave
- Background principal com textura de luz

**Arquivos afetados:**
- `src/components/ui/card.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/pages/Login.tsx`
- `src/pages/Dashboard.tsx`

---

## Detalhes Tecnicos

### Variaveis CSS Atualizadas
```text
Light Mode:
- --primary: 50 100% 55% (amarelo dourado)
- --background: 0 0% 98% (branco quente)
- --foreground: 0 0% 10% (quase preto)
- --muted: 48 6% 90% (cinza claro)
- --accent: 50 30% 95% (amarelo suave)

Dark Mode:
- --primary: 50 100% 50% (amarelo vibrante)
- --background: 0 0% 5% (preto suave)
- --foreground: 0 0% 95% (branco)
- --muted: 0 0% 15% (cinza escuro)
- --accent: 50 20% 15% (amarelo escuro)
```

### Efeitos Glossy
```text
.glossy-card:
  - background com gradiente sutil de branco
  - backdrop-blur para efeito de profundidade
  - borda semi-transparente
  - sombra colorida suave

.glossy-button:
  - gradiente de amarelo para dourado
  - brilho interno no hover
  - sombra amarela suave
```

### ThemeProvider
O provider usara a biblioteca `next-themes` (ja instalada) para:
- Detectar preferencia do sistema automaticamente
- Persistir escolha do usuario no localStorage
- Aplicar classe `.dark` no elemento HTML
- Evitar flash de tema incorreto no carregamento

---

## Resultado Final
A aplicacao tera uma identidade visual alinhada com sua marca, com:
- Cores amarelo/dourado como destaque principal
- Opcao de alternar entre modo claro e escuro
- Visual mais premium com efeitos de textura e brilho
- Transicoes suaves entre temas
- Preferencia salva automaticamente

