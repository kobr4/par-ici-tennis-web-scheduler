// index.js
import { readFileSync } from 'fs';
import { join } from 'path';
import { OpenAI } from 'openai';
import { dirname } from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function sendImageToGPT(img_path) {
  const imagePath = join(__dirname, img_path);
  const base64Image = readFileSync(imagePath, { encoding: 'base64' });

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "What do you see in this image? Return only the text that can be seen." },
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
