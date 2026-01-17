import { fal } from "@fal-ai/client";
import type { SceneData } from "./openai";

fal.config({
  credentials: process.env.FAL_KEY,
});

const DEV_MOCK_FAL = process.env.DEV_MOCK_FAL === "true";
const MOCK_LATENCY_MS = 2000;

// Placeholder images for dev testing
const MOCK_IMAGES = [
  "https://picsum.photos/seed/goal1/1024/1024",
  "https://picsum.photos/seed/goal2/1024/1024",
  "https://picsum.photos/seed/goal3/1024/1024",
  "https://picsum.photos/seed/goal4/1024/1024",
  "https://picsum.photos/seed/goal5/1024/1024",
];

function getRandomMockImage(): string {
  return MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)];
}

async function mockDelay(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
}

export async function pixelateImage(imageUrl: string): Promise<string> {
  if (DEV_MOCK_FAL) {
    console.log("[DEV_MOCK_FAL] Mocking pixelateImage with 2s delay");
    await mockDelay();
    return getRandomMockImage();
  }

  const result = await fal.subscribe("fal-ai/qwen-image-edit", {
    input: {
      prompt: `8-bit pixel-art portrait, chest-up view. Keep the person's likeness and features recognizable. Use a simple solid color background. Style should be cartoonish, anime inspired, cute and tender soft. Maintain the original pose and expression.`,
      image_url: imageUrl,
    },
  });

  return result.data.images[0].url;
}

export async function removeBackground(imageUrl: string): Promise<string> {
  if (DEV_MOCK_FAL) {
    console.log("[DEV_MOCK_FAL] Mocking removeBackground with 2s delay");
    await mockDelay();
    // Return the original image as "background removed" in dev mode
    return imageUrl;
  }

  const result = await fal.subscribe("fal-ai/birefnet", {
    input: {
      image_url: imageUrl,
    },
  });

  return result.data.image.url;
}

function buildImagePrompt(goalPrompt: string, scene?: SceneData): string {
  if (scene) {
    const propsText = scene.props.length > 0 ? scene.props.join(", ") : "";
    console.log(`[DEV_MOCK_FAL] Building image prompt for scene: ${scene.setting}`);
    console.log(`[DEV_MOCK_FAL] Props: ${propsText}`);
    console.log(`[DEV_MOCK_FAL] Atmosphere: ${scene.atmosphere}`);
    console.log(`[DEV_MOCK_FAL] Goal prompt: ${goalPrompt}`);
    return `8-bit pixel-art scene: ${scene.setting}. This person is ${scene.action}, achieving their goal of "${goalPrompt}". ${propsText ? `Include these elements: ${propsText}.` : ""} Atmosphere: ${scene.atmosphere}. The person is happy, confident, and actively living their dream. Style: realistic proportions, anime inspired, vibrant colors, cute and tender. IMPORTANT: make sure head and body are properly proportioned and aligned with the rest of the body.`;
  }

  return `8-bit pixel-art scene showing this person ${goalPrompt}. Full scene with environment and context that represents achieving this goal. The person is happy, confident, and actively living their dream. Include relevant props, setting, and atmosphere. Style: realistic proportions, anime inspired, vibrant colors, cute and tender, IMPORTANT: make sure head and body are properly proportioned and aligned with the rest of the body.`;
}

export async function generateImageWithUser(
  userImageUrl: string,
  goalPrompt: string,
  scene?: SceneData,
): Promise<string> {
  const prompt = buildImagePrompt(goalPrompt, scene);
  console.log(`[DEV_MOCK_FAL] Generated prompt: ${prompt}`);
  console.log(`[DEV_MOCK_FAL] User image URL: ${userImageUrl}`);
  console.log(`[DEV_MOCK_FAL] Scene: ${scene}`);
  console.log(`[DEV_MOCK_FAL] Goal prompt: ${goalPrompt}`);
  console.log(`[DEV_MOCK_FAL] DEV_MOCK_FAL: ${DEV_MOCK_FAL}`);
  console.log(`[DEV_MOCK_FAL] PROMPT: ${prompt}`);
  console.log(`[DEV_MOCK_FAL] USER IMAGE URL: ${userImageUrl}`);
  console.log(`[DEV_MOCK_FAL] SCENE: ${scene}`);
  console.log(`[DEV_MOCK_FAL] GOAL PROMPT: ${goalPrompt}`);
  console.log(`[DEV_MOCK_FAL] DEV_MOCK_FAL: ${DEV_MOCK_FAL}`);
  console.log(`[DEV_MOCK_FAL] PROMPT: ${prompt}`);
  console.log(`[DEV_MOCK_FAL] USER IMAGE URL: ${userImageUrl}`);
  console.log(`[DEV_MOCK_FAL] SCENE: ${scene}`);
  console.log(`[DEV_MOCK_FAL] GOAL PROMPT: ${goalPrompt}`);
  console.log(`[DEV_MOCK_FAL] DEV_MOCK_FAL: ${DEV_MOCK_FAL}`);
  console.log(`[DEV_MOCK_FAL] PROMPT: ${prompt}`);
  console.log(`[DEV_MOCK_FAL] USER IMAGE URL: ${userImageUrl}`);
  console.log(`[DEV_MOCK_FAL] SCENE: ${scene}`);
  console.log(`[DEV_MOCK_FAL] GOAL PROMPT: ${goalPrompt}`);

  if (DEV_MOCK_FAL) {
    console.log(
      `[DEV_MOCK_FAL] Mocking generateImageWithUser with 2s delay for: "${goalPrompt}"`,
    );
    console.log(`[DEV_MOCK_FAL] Generated prompt: ${prompt}`);
    await mockDelay();
    const seed = goalPrompt.replace(/\s+/g, "-").toLowerCase().slice(0, 20);
    return `https://picsum.photos/seed/${seed}/1024/1024`;
  }

  const result = await fal.subscribe("fal-ai/qwen-image-edit", {
    input: {
      prompt,
      image_url: userImageUrl,
    },
  });

  return result.data.images[0].url;
}
