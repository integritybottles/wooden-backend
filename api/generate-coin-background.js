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

/**
 * Generate an image using Gemini.
 * @param {string} prompt - Text description.
 * @param {Array} files - Array of file objects from multer (optional).
 * @returns {Promise<string>} - Base64 data URL of the generated image.
 */
async function generateImage(prompt, files = []) {
  // Build the parts array: start with the text prompt
  const parts = [{ text: prompt }];

  // Add each uploaded image as inlineData
  for (const file of files) {
    // Convert buffer to base64
    const base64Data = file.buffer.toString('base64');
    parts.push({
      inlineData: {
        mimeType: file.mimetype,
        data: base64Data,
      },
    });
  }

  const model = "gemini-3.1-flash-image-preview"; // current as of March 2026
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: parts,
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
      },
    }),
  });

  const data = await response.json();
  console.log("Gemini response:", JSON.stringify(data, null, 2));

  if (data.error) {
    throw new Error(`Gemini API error: ${data.error.message}`);
  }
  if (!data.candidates || !data.candidates.length) {
    throw new Error("Gemini returned no candidates");
  }

  const partsResponse = data.candidates[0].content.parts;
  const imagePart = partsResponse.find((p) => p.inlineData);
  if (!imagePart) {
    throw new Error("Gemini did not return an image");
  }

  return `data:image/png;base64,${imagePart.inlineData.data}`;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    // Parse multipart form data – this populates req.body and req.files
    await runMiddleware(req, res, multerMiddleware);

    const {
      type,
      shape,
      frontDescription,
      backDescription,
      patchDescription,
      velcro,
    } = req.body;

    // Get uploaded files (if any)
    const uploadedFiles = req.files || [];

    if (!type || (type !== "coin" && type !== "patch")) {
      return res.status(400).json({ error: "Invalid type" });
    }

    if (type === "coin") {
      if (!frontDescription?.trim() || !backDescription?.trim()) {
        return res
          .status(400)
          .json({ error: "Both front and back descriptions required" });
      }

      const frontPrompt = `
High quality 3D ${shape} challenge coin design (front side).
Description: ${frontDescription}.
Centered composition, realistic engraved metal texture,
sharp details, studio lighting, premium collectible coin.
`;

      const backPrompt = `
High quality 3D ${shape} challenge coin design (back side).
Description: ${backDescription}.
Centered composition, realistic engraved metal texture,
sharp details, studio lighting, premium collectible coin.
`;

      // For coin, we send the same set of reference images to both prompts
      const [frontImageUrl, backImageUrl] = await Promise.all([
        generateImage(frontPrompt, uploadedFiles),
        generateImage(backPrompt, uploadedFiles),
      ]);

      return res.status(200).json({
        success: true,
        type: "coin",
        shape,
        velcro: "no",
        frontImageUrl,
        backImageUrl,
      });
    }

    if (type === "patch") {
      if (!patchDescription?.trim()) {
        return res
          .status(400)
          .json({ error: "Patch description required" });
      }

      const extra = velcro === "yes" ? "Include velcro backing." : "";

      const patchPrompt = `
Detailed embroidered military unit patch.
Shape: ${shape}.
Description: ${patchDescription}.
${extra}
Realistic stitching texture, embroidered fabric, centered layout,
high quality patch design.
`;

      const patchImageUrl = await generateImage(patchPrompt, uploadedFiles);

      return res.status(200).json({
        success: true,
        type: "patch",
        shape,
        velcro: velcro || "no",
        patchImageUrl,
      });
    }
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Generation failed",
    });
  }
}