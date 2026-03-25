import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const multerMiddleware = upload.array("images", 5);

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      resolve(result);
    });
  });
}

async function generateImage(prompt, files = []) {
  const parts = [{ text: prompt }];

  for (const file of files) {
    const base64Data = file.buffer.toString('base64');
    parts.push({
      inlineData: {
        mimeType: file.mimetype,
        data: base64Data,
      },
    });
  }

  const model = "gemini-3.1-flash-image-preview";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: parts }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(`Gemini API error: ${data.error.message}`);
  if (!data.candidates?.length) throw new Error("Gemini returned no candidates");

  const imagePart = data.candidates[0].content.parts.find(p => p.inlineData);
  if (!imagePart) throw new Error("Gemini did not return an image");

  return `data:image/png;base64,${imagePart.inlineData.data}`;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    await runMiddleware(req, res, multerMiddleware);

    const {
      type,               // shadowbox / squared-plaque / custom-plaque
      dimensions,
      woodType,
      designDescription,
      finish,
      engraving,
    } = req.body;

    const uploadedFiles = req.files || [];

    if (!type || !dimensions || !woodType || !designDescription) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const prompt = `
      Photorealistic image of a custom wooden ${type}.
      Wood type: ${woodType}.
      Dimensions: ${dimensions}.
      Finish: ${finish || "natural"}.
      Engraving: ${engraving === "yes" ? "yes, laser engraved" : "no, printed"}.
      Design: ${designDescription}.
      Show the wooden item with the design clearly visible, natural lighting, high quality.
      Background neutral, focus on the item.
    `;

    const imageUrl = await generateImage(prompt, uploadedFiles);

    return res.status(200).json({
      success: true,
      type,
      imageUrl,
    });
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Generation failed",
    });
  }
}