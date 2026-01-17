import { generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const SceneAnalysisSchema = z.object({
  phrase: z
    .string()
    .describe("A short motivational phrase (max 8 words), first person, no quotes"),
  scene: z.object({
    setting: z
      .string()
      .describe("Specific location/environment for the scene (e.g., 'Japanese temple garden at sunset')"),
    action: z
      .string()
      .describe("What the person is doing in the scene (e.g., 'meditating peacefully')"),
    props: z
      .array(z.string())
      .describe("3-5 specific objects/elements to include (e.g., ['cherry blossoms', 'koi pond'])"),
    atmosphere: z
      .string()
      .describe("Mood and lighting of the scene (e.g., 'serene, golden hour lighting')"),
  }),
});

export type SceneAnalysis = z.infer<typeof SceneAnalysisSchema>;
export type SceneData = SceneAnalysis["scene"];

export async function generatePhraseAndScene(goal: string): Promise<SceneAnalysis> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: SceneAnalysisSchema,
    prompt: `Create a motivational phrase and scene description for this goal: ${goal}`,
    system: `You are a creative director for vision board images. Given a user's goal, generate:
1. A short, powerful motivational phrase (max 8 words, first person, inspiring)
2. Detailed scene elements for an image showing the person achieving this goal

Be specific and vivid with the scene elements. The setting should be a real, recognizable place or environment. Props should be concrete objects that represent success in this goal. The atmosphere should evoke the emotion of achievement.`,
    temperature: 0.8,
  });

  return object;
}

export async function generatePhrase(goal: string): Promise<string> {
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Generate a motivational phrase for this goal: ${goal}`,
    system:
      "You are a motivational coach. Generate a short, powerful phrase (max 8 words) for a vision board goal. The phrase should be inspiring and personal, written in first person. No quotes, no punctuation at the end.",
    temperature: 0.8,
  });

  return text.trim() || "I will achieve this";
}
