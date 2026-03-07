import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  try {

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: "Say hello in one sentence"
    });

    res.status(200).json({
      text: response.output_text
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Server error"
    });

  }
}
