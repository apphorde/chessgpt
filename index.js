/*
Minimal Node.js backend that calls OpenAI Chat API to request an AI move.

Important:
- Set env var OPENAI_API_KEY to your API key (or create a .env file with OPENAI_API_KEY=...).
- This endpoint expects JSON { moves: [...] } and will return { move: "e2e4" }.
*/

const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_KEY) {
  console.warn(
    "OPENAI_API_KEY not set. Set environment variable before running the server."
  );
}

const moveMatcher = /\b[a-h][1-8][a-h][1-8][qrbn]?\b/i; // regex to match UCI move like e2e4 or e7e8q

async (req, res) => {
  if (req.method === 'GET') {
    res.end('AI chess moves server. POST / with JSON { moves: [{ from: "e2", to: "e4", capture: false }] }');
    return;
  }
  
  try {
    const { moves } = Buffer.from(await req.toArray()).toString('utf8');
    const system = `You are a chess move generator. You MUST respond with exactly one move in UCI format (e.g. e2e4, g1f3, e7e8q for promotion) and nothing else. Do NOT include commentary, explanation, JSON, or any extra text. If you cannot find a legal move, respond with PASS. Use standard algebraic coordinates: a1..h8. Assume position FEN provided is to move. Use reasonable chess knowledge but do not invent illegal moves. Avoid castling if unclear.`;
    const user = `Move history: ${
      moves.map(({from, to, capture }, i) => `${i+1}. ${from}-${to}`).join('\n')
    }\nRespond with one UCI move only.`;

    const body = {
      model: process.env.GPT_MODEL  || "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error("OpenAI error", r.status, txt);
      return res.status(500).send("API error.");
    }
    
    const j = await r.json();
    const reply = j.choices?.[0]?.message.content;
    
    if (!reply) {
      return res.writeHead(500).send("Empty reply from server.");
    }
    
    const move = reply.trim();
    
    if (!move) {
      console.warn("Could not get move from model", reply);
      return res.writeHead(500).send("Empty reply from server.");
    }
    
    return res.end(JSON.stringify({ move }));
  } catch (err) {
    console.error(err);
    res.writeHead(500).end('Internal server error.');
  }
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AI server listening on ${PORT}`));
