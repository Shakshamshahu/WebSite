import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const GEMINI_API_KEY = "AIzaSyAdVEjjokqPh5c7m6PYratOOX5KFk2pJ3I";

app.get("/", (req, res) => {
  res.send("AI Portfolio Backend Running");
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callGemini(model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,       // increased from 2048
      responseMimeType: "application/json", // force JSON output mode
    },
  });

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim();
      if (text) return text;
      throw new Error("Empty response");
    }

    if (res.status === 429) {
      const wait = attempt * 5000;
      console.warn(`⏳ Rate limited, waiting ${wait / 1000}s (attempt ${attempt}/3)...`);
      await sleep(wait);
      continue;
    }

    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }
  throw new Error("Rate limit not resolved after 3 retries");
}

/* ── Try to rescue truncated JSON by extracting whatever is valid ── */
function repairJSON(raw) {
  // Already valid — great
  try { return JSON.parse(raw); } catch (_) {}

  // Try to close any open structure by appending closing chars
  let attempt = raw.trim();

  // Count open braces/brackets to figure out what to close
  let braces = 0, brackets = 0, inString = false, escape = false;
  for (const ch of attempt) {
    if (escape)       { escape = false; continue; }
    if (ch === "\\")  { escape = true;  continue; }
    if (ch === '"')   { inString = !inString; continue; }
    if (inString)     continue;
    if (ch === "{")   braces++;
    if (ch === "}")   braces--;
    if (ch === "[")   brackets++;
    if (ch === "]")   brackets--;
  }

  // If we're mid-string, close the string first
  if (inString) attempt += '"';

  // Close any open arrays / objects
  attempt += "]".repeat(Math.max(0, brackets));
  attempt += "}".repeat(Math.max(0, braces));

  try { return JSON.parse(attempt); } catch (_) {}

  // Last resort: extract only the fields we can find with regex
  const extract = (key, isArray) => {
    if (isArray) {
      const m = raw.match(new RegExp(`"${key}"\\s*:\\s*(\\[[\\s\\S]*?\\])(?=[,}]|$)`));
      try { return m ? JSON.parse(m[1]) : []; } catch { return []; }
    } else {
      const m = raw.match(new RegExp(`"${key}"\\s*:\\s*"([^"]*?)"`));
      return m ? m[1] : "";
    }
  };

  return {
    name:       extract("name"),
    title:      extract("title"),
    summary:    extract("summary"),
    skills:     extract("skills", true),
    experience: extract("experience", true),
    education:  extract("education", true),
    projects:   extract("projects", true),
    contact:    { email: extract("email"), linkedin: "", github: "", website: "" },
  };
}

app.post("/generate-portfolio", async (req, res) => {
  try {
    const { name, email, resumeText } = req.body;

    if (!resumeText || resumeText.trim().length < 20) {
      return res.status(400).json({ error: "resumeText is required." });
    }

    const prompt = `You are a resume parser. Extract portfolio information from the resume below.
Return ONLY a valid JSON object. No markdown, no code fences, no explanation. Just raw JSON.

Use this exact structure:
{
  "name": "Full name",
  "title": "Job title or professional headline",
  "summary": "2-3 sentence professional summary in third person",
  "skills": ["Skill1", "Skill2"],
  "experience": [
    { "company": "Company", "role": "Role", "duration": "Start to End", "description": "Brief description" }
  ],
  "education": [
    { "institution": "School", "degree": "Degree", "year": "Year" }
  ],
  "projects": [
    { "name": "Project", "description": "What it does", "tech": ["Tech1"] }
  ],
  "contact": {
    "email": "${email || ""}",
    "linkedin": "",
    "github": "",
    "website": ""
  }
}

Rules:
- Use name "${name || ""}" if provided, otherwise extract from resume.
- Use email "${email || ""}" for contact.email if provided.
- If a section has no data use [] or "".
- Keep description fields SHORT — max 2 sentences each.
- Extract ALL experience, education, project entries.
- Extract any LinkedIn, GitHub, website URLs found in the resume.

Resume:
${resumeText.slice(0, 8000)}`;

    const models = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-flash-latest",
    ];

    let rawText = null;
    let lastError = null;

    for (const model of models) {
      try {
        console.log(`🔄 Trying: ${model}`);
        rawText = await callGemini(model, prompt);
        console.log(`✅ Success with: ${model}`);
        break;
      } catch (e) {
        lastError = `${model} — ${e.message}`;
        console.warn(`⚠️  ${lastError}`);
      }
    }

    if (!rawText) {
      return res.status(500).json({ error: "All models failed.", detail: lastError });
    }

    // Strip markdown fences if present
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    // Parse — with auto-repair if truncated
    let portfolioData;
    try {
      portfolioData = repairJSON(cleaned);
      console.log("✅ JSON parsed successfully");
    } catch (e) {
      console.error("JSON repair also failed. Raw:\n", rawText);
      return res.status(500).json({ error: "Could not parse AI response.", raw: rawText });
    }

    if (name && name.trim()) portfolioData.name = name.trim();
    if (email && email.trim()) {
      portfolioData.contact = portfolioData.contact || {};
      portfolioData.contact.email = email.trim();
    }

    console.log("✅ Portfolio generated for:", portfolioData.name || "Unknown");
    res.json(portfolioData);

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Server error: " + (error?.message || "Unknown") });
  }
});

app.get("/list-models", async (req, res) => {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
    const data = await r.json();
    res.json({ available_models: data.models?.map((m) => m.name) || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📌 Using gemini-2.5-flash with 8192 token output\n`);
});