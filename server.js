import dotenv from "dotenv";
dotenv.config();

import express from "express";
import OpenAI from "openai";
import cors from "cors";

const app = express();

/* ================================
   Middleware
================================ */

app.use(cors());

// safer request size limit
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/* ================================
   Check API Key
================================ */

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is missing. Add it to .env file");
  process.exit(1);
}

/* ================================
   OpenAI Setup
================================ */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/* ================================
   Health Check Route
================================ */

app.get("/", (req, res) => {
  res.send("AI Portfolio Backend Running");
});

/* ================================
   Generate Portfolio Route
================================ */

app.post("/generate-portfolio", async (req, res) => {
  try {

    const { name, email, resumeText } = req.body;

    if (!resumeText) {
      return res.status(400).json({
        error: "Resume text is required"
      });
    }

    console.log("Generating portfolio for:", name || "Unknown");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Extract portfolio information from the resume. Return ONLY valid JSON with fields: name, title, summary, skills (array)."
        },
        {
          role: "user",
          content: resumeText
        }
      ],
      response_format: { type: "json_object" }
    });

    const aiContent = completion.choices[0].message.content;

    let result;

    try {
      result = JSON.parse(aiContent);
    } catch (parseError) {

      console.error("AI returned invalid JSON:", aiContent);

      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: aiContent
      });
    }

    // attach user info
    result.owner = {
      name: name || "Unknown",
      email: email || "Unknown"
    };

    res.json(result);

  } catch (error) {

    console.error("AI Generation Error:", error);

    res.status(500).json({
      error: "AI generation failed"
    });

  }
});

/* ================================
   Start Server
================================ */

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`🚀 AI Portfolio Backend running on http://localhost:${PORT}`);
});