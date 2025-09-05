const africastalking = require("africastalking")({
  apiKey: process.env.AT_API_KEY,   // use environment variables
  username: "sandbox"
});

const sms = africastalking.SMS;

module.exports = async (req, res) => {
  const { phoneNumber, text } = req.body || {};
  let response = "";

  if (!text || text === "") {
    response = "CON Pick a number (1 - 7)";
  } else {
    const userChoice = parseInt(text.trim(), 10);
    if (userChoice >= 1 && userChoice <= 7) {
      const systemChoice = Math.floor(Math.random() * 7) + 1;
      let result = "";

      if (userChoice === systemChoice) {
        result = `🎉 You WIN! You chose ${userChoice}, system chose ${systemChoice}.`;
      } else {
        result = `😢 You LOSE. You chose ${userChoice}, system chose ${systemChoice}.`;
      }

      // send SMS
      await sms.send({
        to: [phoneNumber],
        message: result
      });

      response = "END Your result has been sent via SMS.";
    } else {
      response = "END Invalid choice. Please dial again and choose between 1 - 7.";
    }
  }

  res.setHeader("Content-Type", "text/plain");
  res.send(response);
};
