# Comparador Visual de Algoritmos de Busca em Labirinto com Pesos

Este é um projeto **Frontend** desenvolvido em React e TypeScript, utilizando o Vite como *bundler*. Seu objetivo principal é fornecer uma ferramenta visual e interativa para comparar, simultaneamente, a execução passo a passo de diferentes algoritmos de busca em um labirinto bidimensional com custos (pesos/terrenos).

## 🚀 Funcionalidades

- **Múltiplos Algoritmos em Paralelo**: O projeto permite a visualização concorrente de até 6 algoritmos de busca, facilitando a compreensão de qual algoritmo é mais performático ou eficiente na busca pelo menor caminho.
- **Terrenos com Custos (Heatmap)**: Modela a complexidade do terreno dando pesos diferentes para os blocos, do qual os algoritmos reagem determinando o custo de locomoção.
- **Algoritmos Implementados**:
  - Busca em Largura (BFS - Breadth-First Search)
  - Busca em Profundidade (DFS - Depth-First Search)
  - Busca de Custo Uniforme (UCS / Dijkstra)
  - Busca Gulosa (Greedy Best-First Search)
  - A* (A-Star)
  - Busca em Profundidade Iterativa (IDDFS - Iterative Deepening DFS)
- **Controles de Reprodução**: Painel de controles na aplicação para dar play, pausar e resetar o estado da busca, e acompanhar o modo *step-by-step*.

## 🛠️ Tecnologias Utilizadas

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- CSS Modules / CSS Nativo

## 💻 Como rodar o projeto localmente

Para clonar e testar esta aplicação na sua máquina, você precisa ter o [Node.js](https://nodejs.org/) instalado.

1. **Clone repositório (ou acesse a pasta do projeto):**
```bash
# Caso esteja clonando
git clone <url-do-repositorio>
cd <nome-da-pasta>
```

2. **Instale as dependências:**
```bash
npm install
```

3. **Inicie o servidor de desenvolvimento:**
```bash
npm run dev
```
O servidor deverá abrir em `http://localhost:5173/` (ou outra porta indicada no terminal).

4. **Gerar build de produção e testar:**
```bash
npm run build
npm run preview
```

## 🧠 Arquitetura e Personalização

### Como trocar o labirinto (preset)
As matrizes representam o mapa. A convenção de valores do labirinto funciona da seguinte forma:
- `0` = Parede (Obstáculo).
- `>= 1` = Custo do terreno (Custo de entrar na célula).
 
Para trocar o labirinto, edite o arquivo `src/maze/presets.ts` e substitua a matriz do labirinto (ex: `DEFAULT_MAZE_21x21.grid`) pela sua. Ajuste também os pontos de `start` e `goal` neste mesmo arquivo.

### Como ajustar a paleta de cores (Heatmap)
Abra `src/render/palette.ts`:
- `costToColor(0)`: Define a cor das paredes.
- A constante `COST_PALETTE` define o mapeamento de cores para os custos entre `1` e `8`. Para os custos acima ou iguais a `9`, a cor é definda por `costToColor(9)`.

### Como adicionar um novo algoritmo
A arquitetura do projeto foi pensada para ser extensível. Se quiser adicionar um novo algoritmo de busca:
1. Implemente a lógica criando uma classe/função que atenda à interface `SearchRunner` (veja exemplos no diretório `src/algorithms/runners/`).
2. Exporte a tipologia em `src/algorithms/types.ts`.
3. Adicione a sua nova implementação no arquivo de fábrica `src/algorithms/createRunners.ts` para que ele apareça e seja renderizado nos painéis de simulação, substituindo ou acrescentando à exibição.
