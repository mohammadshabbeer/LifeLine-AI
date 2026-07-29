const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

exports.askGemini = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({
        error: "Gemini API Key not configured."
      });
    }

    const { userMessage } = req.body;

    const prompt = `
You are LifeLine AI Emergency Assistant.

The user describes a medical situation.

Give a helpful response.

Format:

🩺 Possible Condition:
(short explanation)

🚨 Severity:
Low / Medium / High / Critical

🩹 Immediate First Aid:
- point 1
- point 2
- point 3

🏥 Recommendation:
(action)

⚠ Disclaimer:
This is informational guidance only and not a replacement for a doctor.

Keep response under 150 words.

User:
${userMessage}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(400).json(data);
    }

    res.json({
      reply: data.candidates[0].content.parts[0].text
    });

  } catch (err) {
    logger.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});