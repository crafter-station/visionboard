import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_KEY,
});

export async function pixelateImage(imageUrl: string): Promise<string> {
  const stream = await fal.stream("fal-ai/gpt-image-1.5/edit", {
    input: {
      prompt: `8-bit pixel-art portrait, chest-up view. Keep the person's likeness and features recognizable. Use a simple solid color background. Style should be cartoonish, anime inspired, cute and tender soft. Maintain the original pose and expression.`,
      image_urls: [imageUrl],
    },
  });

  for await (const event of stream) {
    console.log(event);
  }

  const result = await stream.done();
  return result.images[0].url;
}

export async function removeBackground(imageUrl: string): Promise<string> {
  const result = await fal.subscribe("fal-ai/birefnet", {
    input: {
      image_url: imageUrl,
    },
  });

  return result.data.image.url;
}

export async function generateImageWithUser(
  userImageUrl: string,
  goalPrompt: string
): Promise<string> {
  const stream = await fal.stream("fal-ai/gpt-image-1.5/edit", {
    input: {
      prompt: `8-bit pixel-art portrait, chest-up view. This person ${goalPrompt}. The person is happy, confident, and achieving their goal. Use a simple solid background for easy cutout. Style should be printed, cartoonish, anime inspired, and cute tender soft`,
      image_urls: [userImageUrl],
    },
  });

  for await (const event of stream) {
    console.log(event);
  }

  const result = await stream.done();
  return result.images[0].url;
}
