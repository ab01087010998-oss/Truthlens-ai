export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { inputText } = req.body || {};
    if (!inputText) {
      return res.status(400).json({ error: 'inputText is required' });
    }

    // Vercel 환경 변수(API_KEY)에서 우선 가져오고, 없으면 기본 키 사용
    const apiKey = process.env.API_KEY || "sk-so-HhJDgWgiwDsY-coOqAil7X4-Lgmz8DsV";
    const apiUrl = 'https://schoolorder.kr/v1/chat/completions';
    const model = 'gemini-3.1-pro-preview';

    const systemPrompt = `당신은 대한민국 최고 수준의 AI 언론 포렌식 및 팩트체크 전문 분석가 'TruthLens AI'입니다.
사용자가 입력한 뉴스 기사, URL, 뉴스 헤드라인, 주장, 루머 또는 소문을 바탕으로 팩트체크 리포트를 작성하세요.
웹 검색 도구가 제공되지 않았으므로 확인하지 못한 사실을 검색으로 확인했다고 말하지 말고, 입력 내용만으로 판단한 한계를 summary와 explanation에 분명히 적으세요.

반드시 유효한 단일 JSON 객체만을 응답해야 합니다 (마크다운 \`\`\`json 태그 없이 pure JSON만):
{
  "score": (0~100 사이의 신뢰도 점수 정수),
  "statusText": "(예: '매우 안전 (공식 보도)', '보통 (교차검증 권장)', '주의 필요 (자극성 어휘 감지)', '심각한 위험 (허위 루머)')",
  "badgeColorType": "emerald" | "indigo" | "amber" | "rose",
  "tags": ["태그1", "태그2", "태그3"],
  "summary": [
    "핵심 검증 결과 1번째 줄",
    "교차 대조 및 출처 연동 관련 2번째 줄",
    "최종 판단 및 유의사항 3번째 줄"
  ],
  "explanation": "입력 내용에 대한 종합적인 포렌식 AI 분석 총평 (2~3문장)"
}`;

    const payload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `다음 내용이나 링크/주장을 분석하고 팩트체크 결과를 JSON으로 반환하세요:\n\n"${inputText}"` }
      ],
      response_format: { type: 'json_object' }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Upstream API error: ${response.status}`, details: errText });
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;
    const cleanText = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
