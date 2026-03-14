import { put } from "@vercel/blob";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable();

  form.parse(req, async (err, fields, files) => {

    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Upload parse error" });
    }

    try {

      const file = files.file[0];
      const buffer = fs.readFileSync(file.filepath);

      const blob = await put(
        `uploads/${Date.now()}-${file.originalFilename}`,
        buffer,
        { access: "public" }
      );

      return res.status(200).json({
        success: true,
        url: blob.url
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        error: "Blob upload failed"
      });

    }

  });

}
