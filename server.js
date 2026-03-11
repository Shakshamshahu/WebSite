import express from "express";
import OpenAI from "openai";
import cors from "cors";

const app = express();

/* ================================
   Middleware
================================ */

app.use(cors());

// Increase request size limit to prevent PayloadTooLargeError
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

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
      return res.status(400).json({ error: "Resume text is required" });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Extract portfolio data from the resume and return ONLY JSON with: name, title, summary, skills (array)."
        },
        {
          role: "user",
          content: resumeText
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;

    let result;

    try {
      result = JSON.parse(content);
    } catch {
      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: content
      });
    }

    // Optional: attach user info
    result.owner = {
      name: name || "Unknown",
      email: email || "Unknown"
    };

    res.json(result);

  } catch (error) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ error: "AI generation failed" });
  }
});

/* ================================
   Start Server
================================ */

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`AI Portfolio Backend running on port ${PORT}`);
});

