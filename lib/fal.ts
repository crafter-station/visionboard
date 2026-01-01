import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_KEY,
});

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
      prompt: `This person ${goalPrompt}. The person is happy, confident, and achieving their goal. Photorealistic, professional photography, cinematic lighting.`,
      image_urls: [userImageUrl],
    },
  });

  for await (const event of stream) {
    console.log(event);
  }

  const result = await stream.done();
  return result.images[0].url;
}
