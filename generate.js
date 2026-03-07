import OpenAI from "openai";

export default async function handler(req, res) {

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {

    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text required" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Extract portfolio JSON with name, title, summary, skills." },
        { role: "user", content: text }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);

    res.status(200).json(result);

  } catch (error) {

    res.status(500).json({ error: "Server error" });

  }
}