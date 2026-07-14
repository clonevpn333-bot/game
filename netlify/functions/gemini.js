// FridgeChef → Gemini proxy (Netlify Function).
// Keeps the API key server-side: set GEMINI_API_KEY in Netlify → Site
// settings → Environment variables. The browser POSTs the exact Gemini
// request body to /.netlify/functions/gemini and this forwards it verbatim.

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return { statusCode: 500, body: JSON.stringify({ error: "GEMINI_API_KEY is not set" }) };
  }
  try {
    const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: event.body,
    });
    const body = await res.text();
    return {
      statusCode: res.status,
      headers: { "Content-Type": "application/json" },
      body,
    };
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: "Upstream request failed" }) };
  }
};
