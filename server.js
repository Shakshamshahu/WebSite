import express from "express";
import OpenAI from "openai";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: "YOUR_OPENAI_KEY"
});

app.post("/api/generate", async (req, res) => {
  const { text } = req.body;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Extract portfolio JSON with name, title, summary, skills array."
      },
      {
        role: "user",
        content: text
      }
    ],
    response_format: { type: "json_object" }
  });

  res.json(JSON.parse(completion.choices[0].message.content));
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});