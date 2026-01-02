import { fal } from "@fal-ai/client";

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

export async function generateImageWithUser(
  userImageUrl: string,
  goalPrompt: string,
): Promise<string> {
  if (DEV_MOCK_FAL) {
    console.log(
      `[DEV_MOCK_FAL] Mocking generateImageWithUser with 2s delay for: "${goalPrompt}"`,
    );
    await mockDelay();
    // Return a seeded mock image based on the goal prompt for consistency
    const seed = goalPrompt.replace(/\s+/g, "-").toLowerCase().slice(0, 20);
    return `https://picsum.photos/seed/${seed}/1024/1024`;
  }

  const stream = await fal.stream("fal-ai/gpt-image-1.5/edit", {
    input: {
      prompt: `8-bit pixel-art scene showing this person ${goalPrompt}. Full scene with environment and context that represents achieving this goal. The person is happy, confident, and actively living their dream. Include relevant props, setting, and atmosphere. Style: cartoonish, anime inspired, vibrant colors, cute and tender`,
      image_urls: [userImageUrl],
    },
  });

  for await (const event of stream) {
    console.log(event);
  }

  const result = await stream.done();
  return result.images[0].url;
}
