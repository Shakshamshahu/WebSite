import dotenv from "dotenv";
dotenv.config();

import express from "express";
import OpenAI from "openai";
import cors from "cors";
import axios from "axios";

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

    const response = await axios.post("http://localhost:11434/api/generate", {
      model: "llama3",
      prompt: `
Extract portfolio information from this resume.

Return JSON format:

{
"name":"",
"title":"",
"summary":"",
"skills":[]
}

Resume:
${resumeText}
`,
      stream: false
    });

    const aiText = response.data.response;

    res.json({
      result: aiText
    });

  } catch (error) {

    console.error("AI error:", error);

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