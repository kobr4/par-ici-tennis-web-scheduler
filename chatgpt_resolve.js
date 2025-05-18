// index.js
import { readFileSync } from 'fs';
import { join } from 'path';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function sendImageToGPT(img_path) {
  const imagePath = join(__dirname, img_path);
  const base64Image = readFileSync(imagePath, { encoding: 'base64' });

  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "What do you see in this image?" },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${base64Image}`,
            }
          }
        ]
      }
    ],
    max_tokens: 100
  });

  return(response.choices[0].message.content);
}

export { sendImageToGPT }

//sendImageToGPT().catch(console.error);
