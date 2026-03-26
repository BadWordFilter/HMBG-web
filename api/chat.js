export default async function handler(req, res) {
  // CORS 처리 (필요시)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages array' });
  }

  try {
    const response = await fetch('https://factchat-cloud.mindlogic.ai/v1/gateway/chat/completions/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Vercel 환경변수에서 API_KEY를 가져옵니다.
        'Authorization': `Bearer ${process.env.API_KEY || ''}`
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6", // API Gateway에서 지원하는 모델명 (gpt-4o 등 변경 가능)
        messages: messages,
      })
    });

    if (!response.ok) {
      throw new Error(`Gateway API returned status: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Error proxying to API Gateway:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
