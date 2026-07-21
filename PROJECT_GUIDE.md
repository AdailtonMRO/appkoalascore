# Guia de Arquitetura e Estrutura do Koala Score (Para IAs)

Este documento fornece uma visão abrangente e detalhada sobre a arquitetura, estrutura de arquivos, regras de negócio, integrações e lógica de funcionamento da aplicação **Koala Score** (Placar de Tênis).

---

## 1. Visão Geral do Projeto

O **Koala Score** é um aplicativo de marcação de pontos de tênis projetado para funcionar no Android (Nativo + TWA), iOS e Web (PWA). É construído com **React Native** e **Expo**.

### Principais Diferenciais:
- **Pontuação de Tênis Clássico:** Configurações customizáveis (Sets, Games, Vantagem/No-Ad, Tiebreak, Match Tiebreak).
- **Modo Rotativo Multiplayer:** Para grupos de mais de 2 jogadores (fila de espera, rotação automática de times e pontuação rápida estilo *Gold Point*).
- **Controle Remoto Bluetooth & Mapeamento Físico:** Conexão direta com dispositivos BLE de botão único ou duplo (ex: passadores de slide, botões de selfie) e captura de teclas físicas/mídia (Volume, Mídia, Gestos).
- **Integração com Apple Watch (PRO):** Recebe comandos remotamente via requisição HTTP (REST API no Firebase) vinculada à Chave de API Secreta do usuário cadastrado.
- **Sintese de Voz (Text-to-Speech):** Narra o placar por voz em três idiomas (Português, Inglês e Espanhol).
- **Sincronização Cloud (Firebase):** Autenticação e banco de dados via Firebase (Firestore) para backup automático e controle de assinatura (Tiers Free vs. Pro).
- **Arquitetura TWA (Trusted Web Activity):** Versão otimizada para publicação e atualização na Google Play Store via **Bubblewrap** apontando para o **Firebase Hosting** com validação `assetlinks.json`.

---

## 2. Estrutura de Diretórios e Arquivos Principais

```text
├── App.tsx                     # Componente raiz, gerencia navegação global, listeners BLE e ouvinte do Apple Watch
├── app.json                    # Configurações do Expo (nome, slug, versão, permissões BLE/Audio, etc.)
├── package.json                # Dependências, scripts de execução, build web e deploy gh-pages
├── twa-manifest.json           # Configuração de build do pacote TWA do Android / Google Play Store (Bubblewrap)
├── public/
│   ├── manifest.json           # Manifesto da PWA Web
│   ├── sw.js                   # Service Worker com estratégia de bypass de cache para atualizações instantâneas
│   └── .well-known/
│       └── assetlinks.json     # Chave SHA-256 da Keystore para validação TWA de tela cheia no Android
├── copy-public.js              # Script auxiliar de build para copiar public/ (incluindo .well-known) para dist/
├── functions/                  # Cloud Functions do Firebase para rotinas de backend e APIs do placar
├── src/
│   ├── components/             # Interface de usuário (telas e sub-componentes)
│   │   ├── HomeScreen.tsx          # Tela inicial com opções de jogo, histórico, login e anúncios
│   │   ├── MatchSetup.tsx          # Configuração de partida de tênis tradicional
│   │   ├── ScoreboardView.tsx      # Visualização do placar clássico com interações táteis e estatísticas
│   │   ├── MultiplayerSetup.tsx    # Configuração do modo rotativo (jogadores, formato, etc.)
│   │   ├── MultiplayerBoard.tsx    # Placar e controle da rotação de jogadores
│   │   ├── MultiplayerRanking.tsx  # Tabela de classificação/ranking da sessão multiplayer
│   │   ├── BluetoothConnector.tsx  # Tela de conexão BLE, ativação de voz, mapeamento de controle físico e Apple Watch
│   │   ├── HistoryScreen.tsx       # Histórico de partidas salvas (locais e sincronizadas na nuvem)
│   │   ├── LoginScreen.tsx         # Fluxo de login e cadastro do usuário
│   │   ├── UpgradeScreen.tsx       # Apresentação dos benefícios do plano Pro e assinatura
│   │   └── HelpScreen.tsx          # Instruções de uso e FAQ do aplicativo
│   │
│   ├── services/               # Serviços de infraestrutura e integrações externas
│   │   ├── firebaseConfig.ts       # Inicialização do Firebase Auth e Firestore (Android/iOS/Web)
│   │   ├── historyService.ts       # Gerenciamento de histórico (AsyncStorage + Sincronização Firestore)
│   │   ├── bleService.ts           # Integração BLE com suporte a múltiplos ouvintes (Web Bluetooth + Native BLE)
│   │   ├── speechService.ts        # Narração de placar por voz (expo-speech)
│   │   └── pwaMediaInterceptor.ts  # Captura de botões de mídia de fone/bluetooth via Audio API na Web
│   │
│   └── utils/                  # Motores lógicos da aplicação (puros em TypeScript)
│       ├── tennisEngine.ts         # Motor matemático de regras e pontuação do tênis clássico
│       └── multiplayerEngine.ts    # Motor que gerencia a fila e pontuação do modo rotativo multiplayer
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
  - Ao final do confronto:
    - O time vencedor permanece em quadra.
    - O time perdedor sai de quadra e vai para o final da fila de espera (`queue`).
    - Os próximos da fila entram para enfrentar os vencedores.
  - O sistema mantém um ranking em tempo real (`totalWins`) dos jogadores da sessão.

---

## 4. Integrações de Hardware e Remotas

O aplicativo permite que o árbitro ou jogador altere a pontuação sem tocar na tela do celular por meio de três caminhos:

### 4.1. Bluetooth Low Energy (BLE) (`src/services/bleService.ts`)
- **Arquitetura Reativa com Múltiplos Ouvintes:** O `bleService` gerencia um `Set` de ouvintes reativos de status (`onConnectionState`), permitindo que a tela inicial e a tela de conexão reflitam a conectividade sem sobrescrever callbacks.
- **Nativo (Android/iOS):** Usa a biblioteca `react-native-ble-plx` para se conectar a dispositivos BLE (ex: controles remotos de selfie, passadores de slide, botões inteligentes customizados).
- **Web:** Utiliza a API `navigator.bluetooth` (Web Bluetooth) disponível em navegadores modernos compatíveis.

### 4.2. Mapeamento de Controle Físico & Mídia (`src/services/pwaMediaInterceptor.ts` & `BluetoothConnector.tsx`)
- **Gatilhos Customizados:** Permite associar ações do jogo (`Ponto Jogador 1`, `Ponto Jogador 2`, `Desfazer`, `Falar Placar`) a botões físicos gravados na hora (Teclas de Volume, Botão Play/Pause de fones Bluetooth e Gestos de Swipe).
- **Web Session Interceptor:** Mantém uma sessão de mídia ativa no navegador para capturar cliques de fones Bluetooth mesmo com a tela do celular apagada.

### 4.3. Atalhos / Comandos do Apple Watch (`BluetoothConnector.tsx` e Firestore)
- Usuários PRO possuem uma **Chave de API Secreta** única.
- O Apple Watch dispara requisições HTTP REST diretamente para a coleção `watch_events` no Firestore usando a URL do Firebase Hosting / Firestore API:
  `https://firestore.googleapis.com/v1/projects/koalascore-e7ffe/databases/(default)/documents/watch_events`
- O `App.tsx` escuta em tempo real (`onSnapshot`) novos eventos com a chave do usuário e atualiza a pontuação na hora.
- Ações suportadas no payload JSON: `addPointP1`, `addPointP2`, `undo`, `reset`.

---

## 5. Estrutura de Banco de Dados (Firestore)

O Firestore possui 4 coleções principais:
- **`profiles`:** Guarda dados e permissões do usuário cadastrado (`id`, `email`, `tier`, `api_key`).
- **`settings`:** Guarda preferências de idioma, estado de voz e mapeamentos.
- **`matches`:** Registro histórico de jogos sincronizados.
- **`watch_events`:** Fila temporária para comandos enviados remotamente pelo Apple Watch.

---

## 6. Processo de Build, Deploy e TWA (Play Store)

### 6.1. Build Web & Deploy Firebase / GitHub Pages
- **Build Web:** `npm run build:web` (compila com Expo Web e executa o `copy-public.js` para incluir a pasta `.well-known`).
- **Deploy GitHub Pages:** `npm run deploy` (envia a pasta `dist/` compilada para a branch `gh-pages`).
- **Deploy Firebase Hosting:** `npx firebase deploy --only hosting` (publica o app na URL `https://koalascore-e7ffe.web.app`).

### 6.2. Gerando o pacote TWA (.aab) para a Play Store
1. O arquivo `twa-manifest.json` está configurado para o pacote `com.adailtonmro.koalatenisscore`.
2. O arquivo `public/.well-known/assetlinks.json` contém a chave SHA-256 da Keystore de produção (`release.keystore`).
3. Para gerar o pacote Android App Bundle (`.aab`):
   ```bash
   npx @bubblewrap/cli build
   ```
