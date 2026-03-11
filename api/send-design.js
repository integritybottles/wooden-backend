import multer from "multer";
import nodemailer from "nodemailer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    await runMiddleware(req, res, multerMiddleware);

    const {
      name,
      email,
      phone,
      type,
      shape,
      frontDescription,
      backDescription,
      patchDescription,
      velcro,
      generatedFront,
      generatedBack,
      generatedPatch,
      coin3D
    } = req.body;

    const uploadedFiles = req.files || [];

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const html = `
      <h2>New AI Design Submission</h2>

      <h3>Customer Info</h3>
      <p><b>Name:</b> ${name}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Phone:</b> ${phone}</p>

      <h3>Design Details</h3>
      <p><b>Type:</b> ${type}</p>
      <p><b>Shape:</b> ${shape}</p>

      ${frontDescription ? `<p><b>Front Description:</b><br>${frontDescription}</p>` : ""}
      ${backDescription ? `<p><b>Back Description:</b><br>${backDescription}</p>` : ""}
      ${patchDescription ? `<p><b>Patch Description:</b><br>${patchDescription}</p>` : ""}

      <p><b>Velcro:</b> ${velcro || "no"}</p>
    `;

    const attachments = [];

    if (generatedFront) {
      attachments.push({
        filename: "coin-front.png",
        content: generatedFront.split("base64,")[1],
        encoding: "base64",
      });
    }

    if (generatedBack) {
      attachments.push({
        filename: "coin-back.png",
        content: generatedBack.split("base64,")[1],
        encoding: "base64",
      });
    }

    if (generatedPatch) {
      attachments.push({
        filename: "patch.png",
        content: generatedPatch.split("base64,")[1],
        encoding: "base64",
      });
    }

    // if (coin3D) {
    //   attachments.push({
    //     filename: "coin-3d-model.gltf",
    //     content: coin3D.split("base64,")[1],
    //     encoding: "base64",
    //   });
    // }

    if (coin3D) {
  attachments.push({
    filename: "coin-3d-screenshot.png",   // <-- changed from .gltf
    content: coin3D.split("base64,")[1],
    encoding: "base64",
  });
}

    uploadedFiles.forEach((file, index) => {
      attachments.push({
        filename: `reference-${index + 1}-${file.originalname}`,
        content: file.buffer,
      });
    });

    await transporter.sendMail({
      from: `"AI Coin Generator" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_RECEIVER,
      subject: "New Coin/Patch Design Submission",
      html,
      attachments,
    });

    return res.status(200).json({ success: true });

  } catch (error) {

    console.error("Send design error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to send email",
    });

  }
}