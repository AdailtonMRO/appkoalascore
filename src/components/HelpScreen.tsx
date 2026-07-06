import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HelpScreenProps {
  onBack: () => void;
  language: 'pt' | 'en' | 'es';
}

interface AccordionSection {
  id: string;
  title: string;
  icon: string;
  iconColor: string;
  content: React.ReactNode;
}

export default function HelpScreen({ onBack, language }: HelpScreenProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection(expandedSection === id ? null : id);
  };

  const translations = {
    pt: {
      title: 'AJUDA & INSTRUÇÕES',
      subtitle: 'Entenda como aproveitar o app ao máximo',
      back: 'Voltar',
      generalTitle: 'Uso Geral (Modo Clássico)',
      remoteTitle: 'Controles Remotos Bluetooth',
      multiplayerTitle: 'Modo Multiplayer (Treinos)',
    },
    en: {
      title: 'HELP & INSTRUCTIONS',
      subtitle: 'Learn how to get the most out of the app',
      back: 'Back',
      generalTitle: 'General Usage (Classic Mode)',
      remoteTitle: 'Bluetooth Remote Controls',
      multiplayerTitle: 'Multiplayer Mode (Training)',
    },
    es: {
      title: 'AYUDA E INSTRUCCIONES',
      subtitle: 'Aprende a sacar el máximo provecho de la app',
      back: 'Volver',
      generalTitle: 'Uso General (Modo Clásico)',
      remoteTitle: 'Controles Remotos Bluetooth',
      multiplayerTitle: 'Modo Multiplayer (Entrenamientos)',
    }
  };

  const t = translations[language] || translations.pt;

  const sections: AccordionSection[] = [
    {
      id: 'general',
      title: t.generalTitle,
      icon: 'tennisball',
      iconColor: '#06b6d4',
      content: language === 'pt' ? (
        <View style={styles.contentBlock}>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Marcar Pontos:</Text> Para pontuar, basta dar um toque no card com a pontuação do respectivo jogador na tela de placar.
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Desfazer Jogadas (Undo):</Text> Errou a marcação? Use o botão <Text style={styles.bold}>Desfazer</Text> no rodapé para retornar ao ponto anterior.
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Inverter Lado:</Text> Toque em <Text style={styles.bold}>Inverter Lado</Text> para alternar visualmente as posições esquerda/direita dos jogadores no placar.
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Cantar Placar (TTS):</Text> O aplicativo fala o placar automaticamente. Você pode silenciar ou falar o placar manualmente usando o botão de som.
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Salvar Partida:</Text> Ao terminar uma partida, o sistema habilitará um botão para salvá-la no seu Histórico.
          </Text>
        </View>
      ) : language === 'en' ? (
        <View style={styles.contentBlock}>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Score Points:</Text> Simply tap on the score card of the corresponding player to add a point.
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Undo Action:</Text> Made a mistake? Press the <Text style={styles.bold}>Undo</Text> button in the footer to roll back the last point.
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Swap Ends:</Text> Tap <Text style={styles.bold}>Swap Ends</Text> to visually switch left/right positions of the players on the screen.
          </Text>
          <Text style={styles.helpText}>
            • ` `<Text style={styles.bold}>Text-to-Speech (TTS):</Text> The app announces scores out loud. Mute or repeat the score announcement using the sound buttons.
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Save Match:</Text> When a match is completed, a button will appear to save it to your History.
          </Text>
        </View>
      ) : (
        <View style={styles.contentBlock}>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Anotar Puntos:</Text> Simplemente toca el panel de puntuación del jugador correspondiente para sumar un punto.
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Deshacer Acción:</Text> ¿Te equivocaste? Usa el botón <Text style={styles.bold}>Deshacer</Text> en el pie de página para volver al punto anterior.
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Cambiar Lado:</Text> Toca en <Text style={styles.bold}>Cambiar Lado</Text> para alternar visualmente las posiciones izquierda/derecha de los jugadores.
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Cantar Marcador (TTS):</Text> El dispositivo anunciará los puntos en voz alta. Puedes silenciar o activar la voz usando los botones de sonido.
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Guardar Partido:</Text> Al finalizar el juego, aparecerá una opción para guardarlo en tu Historial.
          </Text>
        </View>
      ),
    },
    {
      id: 'remote',
      title: t.remoteTitle,
      icon: 'bluetooth',
      iconColor: '#f97316',
      content: language === 'pt' ? (
        <View style={styles.contentBlock}>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Pareamento:</Text> Acesso a tela de "Controles Remotos" no menu para conectar dispositivos via Bluetooth (como botões clickers de selfie ou smartwatches).
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Mapeamento:</Text> Você pode atribuir funções customizadas para os botões do seu controle remoto (ex: botão 1 marca ponto para o Jogador 1, botão 2 desfaz, etc.).
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Status do Controle:</Text> O rodapé da tela principal mostra o status de conexão em tempo real (Conectado, Buscando, Desconectado).
          </Text>
        </View>
      ) : language === 'en' ? (
        <View style={styles.contentBlock}>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Pairing:</Text> Navigate to the "Remote Controls" screen from the main menu to connect Bluetooth clickers or smartwatches.
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Button Mapping:</Text> Assign custom actions to the buttons of your controller (e.g., button 1 scores for Player 1, button 2 triggers undo, etc.).
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Connection Status:</Text> The footer on the main screen shows real-time status (Connected, Scanning, Disconnected).
          </Text>
        </View>
      ) : (
        <View style={styles.contentBlock}>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Emparejamiento:</Text> Abre la pantalla de "Controles Remotos" en el menú para buscar y conectar botones Bluetooth o relojes.
          </Text>
          <Text style={styles.helpText}>
            • <Text style={styles.bold}>Mapeo de Botones:</Text> Configura qué hace cada botón de tu control (ej: el botón 1 anota punto para Jugador 1, el botón 2 deshace, etc.).
          </Text>
          <Text style={styles.helpText}>
            • ` `<Text style={styles.bold}>Estado del Control:</Text> El pie de página en el menú principal te indica el estado de conexión del control remoto en tiempo real.
          </Text>
        </View>
      ),
    },
    {
      id: 'multiplayer',
      title: t.multiplayerTitle,
      icon: 'people',
      iconColor: '#10b981',
      content: language === 'pt' ? (
        <View style={styles.contentBlock}>
          <Text style={styles.helpSubtitle}>Fila de Espera e Rotatividade Rápida:</Text>
          <Text style={styles.helpText}>
            1. <Text style={styles.bold}>Cadastro e Sorteio:</Text> Registre os nomes de todos os jogadores presentes. O sistema fará um sorteio aleatório para definir quem entra em quadra primeiro e montará a fila inicial.
          </Text>
          <Text style={styles.helpText}>
            2. <Text style={styles.bold}>Modos de Jogo:</Text> Funciona em modo <Text style={styles.bold}>Individual</Text> (Singles) ou <Text style={styles.bold}>Duplas</Text> (Doubles).
          </Text>
          <Text style={styles.helpText}>
            3. <Text style={styles.bold}>Partidas Rápidas:</Text> Configura-se como melhor de 3 games (vence quem fizer 2 games) ou melhor de 5 games (vence quem fizer 3 games).
          </Text>
          <Text style={styles.helpText}>
            4. <Text style={styles.bold}>Fim da Partida & Rotação:</Text> Ao término da partida rápida, o time perdedor sai e vai para o final da fila de espera. O próximo da fila é chamado para jogar.
          </Text>
          <Text style={styles.helpText}>
            5. <Text style={styles.bold}>Limite de Vitórias (Regra de Ouro):</Text> O time/jogador vencedor pode ter no máximo <Text style={styles.bold}>3 vitórias seguidas</Text>. Caso atinja essa marca, ele é substituído pelo próximo da fila (indo para o fim da fila) para que todos possam jogar.
          </Text>
          <Text style={styles.helpText}>
            6. <Text style={styles.bold}>Gerenciamento de Fila:</Text> Se o jogador chamado não quiser jogar, você pode tocar em <Text style={styles.bold}>Pular</Text> (vai para o fim da fila) ou <Text style={styles.bold}>Remover</Text> para tirá-lo da sessão. Novos jogadores que chegarem atrasados podem ser adicionados à fila a qualquer momento.
          </Text>
          <Text style={styles.helpText}>
            7. <Text style={styles.bold}>Posição na Quadra:</Text> Não há trocas de lados no meio da partida. O jogador ou dupla que entra é direcionado diretamente para o lado de onde o adversário saiu.
          </Text>
          <Text style={styles.helpText}>
            8. <Text style={styles.bold}>Ranking e Campeão:</Text> Ao encerrar o treino, o aplicativo gera um ranking baseado no número de partidas vencidas por cada um, celebra o grande vencedor e permite salvar o resultado.
          </Text>
        </View>
      ) : language === 'en' ? (
        <View style={styles.contentBlock}>
          <Text style={styles.helpSubtitle}>Queue and Fast Rotation System:</Text>
          <Text style={styles.helpText}>
            1. ` `<Text style={styles.bold}>Registration & Draw:</Text> Enter the names of all players. The system automatically draws the starting players and creates the initial queue.
          </Text>
          <Text style={styles.helpText}>
            2. <Text style={styles.bold}>Game Modes:</Text> Supports <Text style={styles.bold}>Singles</Text> or <Text style={styles.bold}>Doubles</Text>.
          </Text>
          <Text style={styles.helpText}>
            3. <Text style={styles.bold}>Short Match Formats:</Text> Play a match of best-of-3 games (first to 2 games wins) or best-of-5 games (first to 3 games wins).
          </Text>
          <Text style={styles.helpText}>
            4. <Text style={styles.bold}>Rotation:</Text> When a match ends, the losing team goes to the back of the queue. The next players in line enter the court.
          </Text>
          <Text style={styles.helpText}>
            5. <Text style={styles.bold}>3-Win Limit Rule:</Text> A winning team/player can stay on the court for a maximum of <Text style={styles.bold}>3 consecutive wins</Text>. After that, they are rotated out to the end of the queue so others get a turn.
          </Text>
          <Text style={styles.helpText}>
            6. <Text style={styles.bold}>Queue Actions:</Text> If a called player cannot play, you can choose to <Text style={styles.bold}>Skip</Text> them (sends them to the end of the queue) or <Text style={styles.bold}>Remove</Text> them. Late arrivals can be added to the queue at any time.
          </Text>
          <Text style={styles.helpText}>
            7. <Text style={styles.bold}>Court Positions:</Text> There are no side changes during a match. The incoming team goes to the exact side of the court vacated by the leaving team.
          </Text>
          <Text style={styles.helpText}>
            8. <Text style={styles.bold}>Ranking and Champion:</Text> Once finished, the app calculates a leaderboard sorted by matches won, announces the session champion, and lets you save it.
          </Text>
        </View>
      ) : (
        <View style={styles.contentBlock}>
          <Text style={styles.helpSubtitle}>Sistema de Fila y Rotación Rápida:</Text>
          <Text style={styles.helpText}>
            1. ` `<Text style={styles.bold}>Registro y Sorteo:</Text> Registra los nombres de todos los jugadores. El sistema sorteará automáticamente quién juega primero y ordenará al resto en la fila de espera.
          </Text>
          <Text style={styles.helpText}>
            2. <Text style={styles.bold}>Modos de Juego:</Text> Disponible en <Text style={styles.bold}>Individuales</Text> (Singles) o <Text style={styles.bold}>Dobles</Text> (Doubles).
          </Text>
          <Text style={styles.helpText}>
            3. <Text style={styles.bold}>Duración:</Text> Partida a mejor de 3 games (gana quien haga 2 games) o mejor de 5 games (gana quien haga 3 games).
          </Text>
          <Text style={styles.helpText}>
            4. <Text style={styles.bold}>Rotación:</Text> Al terminar el partido, los perdedores van al final de la fila de espera y la primera persona de la fila entra a jugar.
          </Text>
          <Text style={styles.helpText}>
            5. <Text style={styles.bold}>Límite de 3 Victorias:</Text> Un jugador o dupla puede acumular como máximo <Text style={styles.bold}>3 victorias consecutivas</Text>. Al lograrlo, saldrá al final de la fila para dar turno a otros.
          </Text>
          <Text style={styles.helpText}>
            6. <Text style={styles.bold}>Gestión de la Fila:</Text> Si el jugador llamado no desea jugar en ese momento, puedes elegir <Text style={styles.bold}>Pulsar/Saltar</Text> (lo envía al final de la fila) o <Text style={styles.bold}>Eliminar</Text>. Se pueden agregar nuevos jugadores en cualquier momento.
          </Text>
          <Text style={styles.helpText}>
            7. <Text style={styles.bold}>Posición en la Pista:</Text> No se cambia de lado de pista. La dupla o jugador que entra va al lado que dejó libre el equipo que salió.
          </Text>
          <Text style={styles.helpText}>
            8. <Text style={styles.bold}>Leaderboard y Campeón:</Text> Al cerrar el entrenamiento, verás un ranking por partidos ganados, se anunciará al ganador y podrás guardar la sesión.
          </Text>
        </View>
      ),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Top navigation Back button */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#ccff00" />
          <Text style={styles.backButtonText}>{t.back}</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="help-circle" size={42} color="#14b8a6" style={styles.helpIcon} />
        <Text style={styles.title}>{t.title}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.accordionContainer} showsVerticalScrollIndicator={false}>
        {sections.map(section => {
          const isExpanded = expandedSection === section.id;
          return (
            <View key={section.id} style={styles.sectionCard}>
              <TouchableOpacity
                style={[styles.sectionHeader, isExpanded && styles.sectionHeaderActive]}
                onPress={() => toggleSection(section.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconWrapper, { backgroundColor: section.iconColor }]}>
                  <Ionicons name={section.icon as any} size={20} color="#fff" />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.sectionBody}>
                  {section.content}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#ccff00',
    fontSize: 15,
    fontWeight: '700',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  helpIcon: {
    textShadowColor: 'rgba(20, 184, 166, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  accordionContainer: {
    paddingBottom: 40,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sectionHeaderActive: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
  },
  sectionBody: {
    padding: 16,
    backgroundColor: 'rgba(9, 13, 22, 0.4)',
  },
  contentBlock: {
    gap: 12,
  },
  helpSubtitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ccff00',
    marginBottom: 4,
  },
  helpText: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  bold: {
    fontWeight: '700',
    color: '#f8fafc',
  },
});
