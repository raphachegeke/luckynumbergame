import { MongoClient } from "mongodb";
import africastalking from "africastalking";

const AT = africastalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});

const sms = AT.SMS;
const client = new MongoClient(process.env.MONGO_URI);
const dbName = "luckyGame";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const { sessionId, serviceCode, phoneNumber, text } = req.body;

  await client.connect();
  const db = client.db(dbName);
  const players = db.collection("players");

  let response = "";

  try {
    if (!text || text === "") {
      response = `CON Welcome to Lucky 7 🎲
Pick a number (1-7):
98. Leaderboard`;
    } else if (/^[1-7]$/.test(text)) {
      const userChoice = parseInt(text, 10);
      const systemChoice = Math.floor(Math.random() * 7) + 1;
      const win = userChoice === systemChoice;

      await players.updateOne(
        { phone: phoneNumber },
        { $inc: win ? { wins: 1 } : { losses: 1 } },
        { upsert: true }
      );

      const message = win
        ? `🎉 You WON! You picked ${userChoice}, system picked ${systemChoice}.`
        : `😢 You lost! You picked ${userChoice}, system picked ${systemChoice}.`;

      await sms.send({ to: phoneNumber, message, from: process.env.AT_SHORTCODE });

      response = `END Game over! Full results sent by SMS 📩`;
    } else if (text === "98") {
      const topPlayers = await players
        .find({})
        .sort({ wins: -1, losses: 1 })
        .limit(5)
        .toArray();

      let scoreboard = "🏆 Top Players 🏆\n";
      topPlayers.forEach((p, i) => {
        let label = `${i + 1}. ${p.phone.slice(-4)} - W:${p.wins || 0} L:${p.losses || 0}`;
        if (p.phone === phoneNumber) label += " ⭐YOU";
        scoreboard += label + "\n";
      });

      response = `CON ${scoreboard}\n99. My Rank`;
    } else if (text === "98*99") {
      const sortedPlayers = await players
        .find({})
        .sort({ wins: -1, losses: 1 })
        .toArray();

      const rank = sortedPlayers.findIndex(p => p.phone === phoneNumber) + 1;
      const me = sortedPlayers.find(p => p.phone === phoneNumber);

      if (rank > 0) {
        response = `END Your Rank: ${rank}/${sortedPlayers.length}\nW:${me.wins || 0} L:${me.losses || 0}`;
      } else {
        response = `END You haven't played yet!`;
      }
    } else {
      response = "END Invalid choice. Try again.";
    }

    res.setHeader("Content-Type", "text/plain");
    res.end(response);
  } catch (err) {
    console.error("USSD Handler Error:", err);
    res.statusCode = 500;
    res.end("END Internal Server Error");
  }
}
