# Guia de Arquitetura e Estrutura do Koala Score (Para IAs)

Este documento foi criado para fornecer uma visão abrangente e detalhada sobre a arquitetura, estrutura de arquivos, regras de negócio, integrações e lógica de funcionamento da aplicação **Koala Score** (Placar de Tênis). Ele serve para que qualquer Inteligência Artificial ou desenvolvedor possa compreender e manter o projeto com máxima rapidez e precisão.

---

## 1. Visão Geral do Projeto

O **Koala Score** é um aplicativo de marcação de pontos de tênis projetado para funcionar no Android, iOS e Web (PWA). É construído com **React Native** e **Expo**.

### Principais Diferenciais:
- **Pontuação de Tênis Clássico:** Configurações customizáveis (Sets, Games, Vantagem/No-Ad, Tiebreak, Match Tiebreak).
- **Modo Rotativo Multiplayer:** Para grupos de mais de 2 jogadores que desejam jogar de forma rápida (com fila de espera, rotação automática de times e pontuação rápida estilo *Gold Point*).
- **Controle Remoto Bluetooth & Mapeamento Físico:** Permite usar botões de controle remoto Bluetooth (como passadores de slide) ou botões de volume/mídia do próprio celular para alterar o placar sem tocar na tela.
- **Integração com Apple Watch:** Recebe comandos remotamente via Webhooks associados a uma chave de API do usuário e monitorados em tempo real.
- **Sintese de Voz (Text-to-Speech):** Narra o placar por voz em três idiomas (Português, Inglês e Espanhol).
- **Sincronização Cloud (Firebase):** Autenticação e banco de dados via Firebase (Firestore) para backup automático e controle de assinatura (Tiers Free vs. Pro).

---

## 2. Estrutura de Diretórios e Arquivos Principais

```text
├── App.tsx                     # Componente raiz, gerencia o estado global de navegação e listeners de controle
├── app.json                    # Configurações do Expo (nome, slug, versão, permissões, etc.)
├── package.json                # Dependências, scripts de execução e build (Expo, Firebase, BLE, Ads)
├── supabase_schema.sql         # Referência histórica da estrutura do banco (migrado para Firebase Firestore)
├── copy-public.js              # Script auxiliar de build para copiar manifest/sw no ambiente web
├── src/
│   ├── components/             # Interface de usuário (telas e sub-componentes)
│   │   ├── HomeScreen.tsx          # Tela inicial com opções de jogo, histórico, configurações
│   │   ├── MatchSetup.tsx          # Configuração de partida de tênis tradicional
│   │   ├── ScoreboardView.tsx      # Visualização do placar clássico com interações táteis e estatísticas
│   │   ├── MultiplayerSetup.tsx    # Configuração do modo rotativo (jogadores, formato, etc.)
│   │   ├── MultiplayerBoard.tsx    # Placar e controle da rotação de jogadores
│   │   ├── MultiplayerRanking.tsx  # Tabela de classificação/ranking da sessão multiplayer
│   │   ├── BluetoothConnector.tsx  # Tela para escanear, emparelhar e mapear botões BLE
│   │   ├── HistoryScreen.tsx       # Histórico de partidas salvas (locais e sincronizadas na nuvem)
│   │   ├── LoginScreen.tsx         # Fluxo de login e cadastro do usuário
│   │   ├── UpgradeScreen.tsx       # Apresentação dos benefícios do plano Pro e assinatura
│   │   └── HelpScreen.tsx          # Instruções de uso e FAQ do aplicativo
│   │
│   ├── services/               # Serviços de infraestrutura e integrações externas
│   │   ├── firebaseConfig.ts       # Inicialização do Firebase Auth e Firestore (Android/iOS/Web)
│   │   ├── historyService.ts       # Gerenciamento de histórico (AsyncStorage + Sincronização Firestore)
│   │   ├── bleService.ts           # Integração BLE (Nativo via react-native-ble-plx / Web via Web Bluetooth)
│   │   ├── speechService.ts        # Narração de placar por voz (expo-speech)
│   │   ├── pwaMediaInterceptor.ts  # Captura de botões de mídia de fone/bluetooth via Audio API na Web
│   │   └── trackPlayerService.ts   # Auxiliar para recursos de mídia (se necessário)
│   │
│   ├── utils/                  # Motores lógicos da aplicação (puros em TypeScript)
│   │   ├── tennisEngine.ts         # Motor matemático que gerencia as regras e pontuação do tênis clássico
│   │   └── multiplayerEngine.ts    # Motor que gerencia a fila e pontuação do modo rotativo multiplayer
│   │
│   └── mocks/                  # Mocks para evitar falhas ao compilar o app em simuladores ou Web
│       ├── react-native-ble-plx.ts
│       └── react-native-google-mobile-ads.ts
```

---

## 3. Motores de Jogo (Lógica de Pontuação)

### 3.1. Motor do Tênis Clássico (`src/utils/tennisEngine.ts`)
Responsável por processar cada ponto adicionado e atualizar o estado do jogo seguindo as regras oficiais do tênis.

- **Configurações Suportadas (`TennisConfig`):**
  - `setsToWin`: Quantidade de sets para ganhar (1, 2 [melhor de 3] ou 3 [melhor de 5]).
  - `gamesPerSet`: Games necessários para fechar um set (ex: 6 ou 4).
  - `useTieBreak`: Se ativa tie-break ao empatar em games.
  - `tieBreakPoints`: Pontuação do tie-break comum (ex: 7 pontos).
  - `useMatchTieBreakForFinalSet`: Se substitui o último set por um Match Tiebreak.
  - `matchTieBreakPoints`: Pontuação do Match Tiebreak (ex: 10 pontos).
  - `noAdScoring`: Pontuação sem vantagem (Ponto de Ouro / Gold Point no empate 40-40).
  - `autoSideChange`: Alternância de lados de quadra automática.

- **Principais Funções:**
  - `createInitialState(config, firstServer)`: Inicializa a estrutura de dados da partida.
  - `addPoint(state, scorer)`: Adiciona um ponto para o Jogador 1 ou 2, calcula se houve quebra, game ganho, set ganho, tie-break, alternância de lado ou fim de jogo. Armazena um snapshot do estado anterior para permitir **Undo** (desfazer).
  - `undo(state)`: Restaura o estado anterior usando a pilha de histórico `state.history`.
  - `getDisplayPoints(...)`: Converte os pontos internos (`0, 1, 2, 3, 4`) para exibição padrão (`0, 15, 30, 40, AD`).

### 3.2. Motor Multiplayer Rotativo (`src/utils/multiplayerEngine.ts`)
Projetado para cenários onde há múltiplos jogadores e apenas uma quadra disponível.

- **Dinâmica de Funcionamento:**
  - Configura-se uma lista de jogadores, o formato (`singles` ou `doubles`) e a duração do confronto (`melhor de 3` ou `5` games).
  - Um sorteio inicial escolhe os times titulares (`team1` e `team2`). O restante fica na fila de espera (`queue`).
  - As partidas utilizam sempre **Ponto de Ouro (No-Ad scoring)** para velocidade.
  - Ao final do confronto (ex: um time ganha 2 games):
    - O time vencedor permanece em quadra (acumula vitórias consecutivas).
    - O time perdedor sai de quadra e vai para o final da fila de espera (`queue`).
    - Os próximos da fila entram para enfrentar os vencedores.
    - Se o time vencedor atingir o limite de vitórias consecutivas seguidas (para evitar monopólio da quadra), ele é forçado a sair para o final da fila e os próximos dois times da fila entram.
  - O sistema mantém um ranking em tempo real (`totalWins`) dos jogadores individuais da sessão.

---

## 4. Integrações de Hardware e Remotas

O aplicativo permite que o árbitro ou jogador altere a pontuação sem tocar na tela do celular por meio de três caminhos:

### 4.1. Bluetooth Low Energy (BLE) (`src/services/bleService.ts`)
- **Nativo (Android/iOS):** Usa a biblioteca `react-native-ble-plx` para se conectar a dispositivos BLE (ex: controles remotos de selfie, passadores de slide, botões inteligentes customizados).
- **Web:** Utiliza a API `navigator.bluetooth` (Web Bluetooth) disponível em navegadores modernos compatíveis.
- **Funcionamento:** O serviço escuta características de notificação e decodifica valores base64. O usuário pode mapear o ID de cada botão pressionado no controle físico para ações do app (ex: Botão 1 = Ponto P1, Botão 2 = Ponto P2, Botão 3 = Desfazer).

### 4.2. Teclas de Volume & Mídia (`src/services/pwaMediaInterceptor.ts` & `App.tsx`)
- **Web PWA:** Implementa um truque de acessibilidade para capturar cliques de fones de ouvido Bluetooth ou botões de volume. Ele inicia um arquivo de áudio WAV silencioso de 1 segundo em loop para manter ativa a `Media Session` do navegador. Com isso, os eventos do sistema de mídia (`nexttrack`, `previoustrack`, `play`, `pause`) são interceptados e convertidos em comandos do placar (ex: Avançar música = Ponto P2, Voltar música = Desfazer).
- **Nativo:** Escuta eventos físicos ou de mídia equivalentes mapeados nas configurações do dispositivo.

### 4.3. Atalho/Comandos do Apple Watch (`App.tsx` e Firebase)
- Usuários PRO têm acesso a uma integração onde um atalho no Apple Watch pode disparar uma requisição HTTP (Webhook) para salvar registros na coleção `watch_events` no Firestore contendo a `api_key` do perfil do usuário e a ação desejada (`addPointP1`, `addPointP2`, `undo`, etc.).
- O aplicativo escuta em tempo real (via `onSnapshot` do Firestore com query filtrada pela `api_key`) novas adições nessa tabela e executa o comando imediatamente.
- Há um trigger no banco de dados (`trigger_clean_old_watch_events`) que executa a função de auto-limpeza no Firestore, removendo registros com mais de 1 hora para economizar armazenamento.

---

## 5. Sincronização, Banco de Dados e Monetização

### 5.1. Fluxo de Histórico (`src/services/historyService.ts`)
1. **Salvamento Local:** As partidas são gravadas imediatamente no `AsyncStorage` (`@koala_score_matches`). Isso garante funcionamento 100% offline.
2. **Sincronização com Cloud:** Se o usuário estiver autenticado (`auth.currentUser`), o serviço sincroniza todas as partidas locais não enviadas para o Firestore (coleção `matches`), utilizando um identificador único de sincronização (`sync_id`) para evitar duplicidade.

### 5.2. Estrutura do Firestore
O Firestore possui 4 coleções principais em espelho ao esquema do Supabase anteriormente utilizado:
- **`profiles`:** Guarda informações do usuário cadastrado.
  - `id` (Document ID == Auth UID)
  - `email`
  - `tier` ('free' ou 'pro')
  - `api_key` (UUID gerado automaticamente, usado para autenticar comandos do Watch)
- **`settings`:** Preferências de uso de cada conta.
  - `user_id` (Document ID)
  - `language` ('pt', 'en', 'es')
  - `is_voice_muted` (boolean)
  - `button_mappings` (JSON com as teclas Bluetooth mapeadas)
  - `physical_mappings` (JSON com as teclas físicas de volume/mídia mapeadas)
- **`matches`:** Registro histórico de jogos.
  - `id` (Document ID)
  - `user_id` (UID do criador)
  - `opponent`
  - `score` (JSON descritivo)
  - `winner`
  - `duration` (segundos)
  - `date` (Timestamp)
  - `sync_id` (Evitar duplicidade)
  - `payload` (Cópia serializada completa do estado da partida)
- **`watch_events`:** Fila temporária de comandos remotos.
  - `id` (Document ID)
  - `api_key` (UUID do perfil do usuário)
  - `action` (Ação executada ex: 'addPointP1')
  - `created_at` (Timestamp)

---

## 6. Fluxos de Interface de Usuário (Navegação)

A navegação é controlada por uma máquina de estados simples em `App.tsx` através da variável de estado `screen`. As telas válidas são:
- `'home'`: Menu principal.
- `'setup'`: Configurações antes de iniciar um jogo tradicional de tênis.
- `'game'`: O painel do placar clássico em execução.
- `'multiplayer_setup'`: Configuração inicial do modo rotativo.
- `'multiplayer_game'`: Visualização ativa da partida e fila de rotação.
- `'multiplayer_ranking'`: Ranking acumulado da sessão de rotação.
- `'history'`: Histórico de todas as partidas.
- `'remote'`: Tela de conexão Bluetooth.
- `'login'`: Tela de login / registro.
- `'upgrade'`: Detalhes sobre o plano PRO.
- `'help'`: Guia e manual.

---

## 7. Instruções para Desenvolvimento e Execução

### Rodando o projeto localmente:
- **Iniciar Servidor de Desenvolvimento:** `npm start` ou `npx expo start`
- **Iniciar no Emulador Android:** `npm run android`
- **Iniciar no Emulador iOS:** `npm run ios`
- **Iniciar na Web:** `npm run web`

### Processo de Build e Deploy Web (GitHub Pages):
O aplicativo web pode ser compilado e hospedado no GitHub Pages com os comandos:
```bash
npm run deploy
```
*Esse script executa o build de exportação web do Expo (`expo export --platform web`), roda o script `copy-public.js` para garantir os arquivos de manifesto PWA e Service Worker (`sw.js`) corretos, e publica na branch `gh-pages`.*
