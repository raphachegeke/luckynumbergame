const africastalking = require("africastalking")({
  apiKey: process.env.AT_API_KEY,
  username: "sandbox"
});
const sms = africastalking.SMS;
const connectToDB = require("../lib/mongo");

module.exports = async (req, res) => {
  const { phoneNumber, text } = req.body || {};
  const db = await connectToDB();
  const players = db.collection("players");

  let response = "";

  if (!text || text === "") {
    response = "CON Pick a number (1 - 7)\n98. View Scoreboard";
  } else if (text === "98") {
    // fetch stats
    const player = await players.findOne({ phone: phoneNumber });
    const wins = player?.wins || 0;
    const losses = player?.losses || 0;
    response = `END Your Stats:\nWins: ${wins}\nLosses: ${losses}`;
  } else {
    const userChoice = parseInt(text.trim(), 10);
    if (userChoice >= 1 && userChoice <= 7) {
      const systemChoice = Math.floor(Math.random() * 7) + 1;
      let result;

      if (userChoice === systemChoice) {
        result = `🎉 You WIN! You chose ${userChoice}, system chose ${systemChoice}.`;
        await players.updateOne(
          { phone: phoneNumber },
          { $inc: { wins: 1 } },
          { upsert: true }
        );
      } else {
        result = `😢 You LOSE. You chose ${userChoice}, system chose ${systemChoice}.`;
        await players.updateOne(
          { phone: phoneNumber },
          { $inc: { losses: 1 } },
          { upsert: true }
        );
      }

      await sms.send({ to: [phoneNumber], message: result, from: 'Rapha Bet' });
      response = "END Your result has been sent via SMS.";
    } else {
      response = "END Invalid choice. Pick between 1 - 7.";
    }
  }

  res.setHeader("Content-Type", "text/plain");
  res.send(response);
};
