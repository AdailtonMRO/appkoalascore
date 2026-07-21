const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

// Endpoint HTTP para receber o ponto
exports.scorePoint = functions.https.onRequest(async (req, res) => {
  // Garante que é uma requisição POST
  if (req.method !== "POST") {
    return res.status(405).send("Método não permitido. Use POST.");
  }

  const { matchId, player } = req.body;

  if (!matchId || !player) {
    return res.status(400).send("Faltando parâmetros: matchId ou player.");
  }

  try {
    const matchRef = db.collection("matches").doc(matchId);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
      return res.status(404).send("Partida não encontrada.");
    }

    // Incrementa o placar com base no jogador recebido
    if (player === "player1") {
      await matchRef.update({
        "score.player1": admin.firestore.FieldValue.increment(1)
      });
    } else if (player === "player2") {
      await matchRef.update({
        "score.player2": admin.firestore.FieldValue.increment(1)
      });
    } else {
      return res.status(400).send("Jogador inválido. Use 'player1' ou 'player2'.");
    }

    return res.status(200).json({ success: true, message: `Ponto marcado para ${player}` });
  } catch (error) {
    console.error("Erro ao atualizar placar:", error);
    return res.status(500).send("Erro interno do servidor.");
  }
});