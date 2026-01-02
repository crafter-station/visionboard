import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generatePhrase(goal: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a motivational coach. Generate a short, powerful phrase (max 8 words) for a vision board goal. The phrase should be inspiring and personal, written in first person. No quotes, no punctuation at the end.",
      },
      {
        role: "user",
        content: `Generate a motivational phrase for this goal: ${goal}`,
      },
    ],
    max_tokens: 30,
    temperature: 0.8,
  });

  return response.choices[0].message.content?.trim() || "I will achieve this";
}
