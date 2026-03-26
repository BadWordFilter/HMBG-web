export default async function handler(req, res) {
  // GitHub Pages 등 외부 도메인에서 API를 호출할 수 있도록 CORS 허용 세팅
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

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
        model: "gpt-5.2", // 문서에 명시된 사용 가능한 챗 모델 ID 적용
        messages: messages,
        temperature: 0.7, // 마스코트의 창의적이고 친근한 성격을 위해 온도 조절
        max_tokens: 1000  // 불필요하게 긴 답변 방지
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
