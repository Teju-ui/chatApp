const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

async function run() {
  try {
    const response = await openai.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [{ role: 'user', content: 'hello' }],
    });
    console.log(response.choices[0].message.content);
  } catch (err) {
    console.error(err);
  }
}

run();