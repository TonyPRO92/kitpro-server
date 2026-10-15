export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { tipo, prompt } = req.body;
  if (!prompt) return res.status(400).json({ ok: false, error: 'Falta prompt' });

  try {
    let resultado = "";
    if (tipo === 'wallpaper') {
      const r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({ prompt, n: 1, size: "1024x1024", model: "dall-e-3" })
      });
      const d = await r.json();
      resultado = d.data[0].url;
    } else {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const d = await r.json();
      resultado = d.candidates[0].content.parts[0].text;
    }
    res.status(200).json({ ok: true, resultado });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.toString() });
  }
}
