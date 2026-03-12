import nodemailer from "nodemailer";

export default async function handler(req, res) {

  // --- CORS ---
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  try {

    const {
      name,
      email,
      phone,
      type,
      shape,
      frontDescription,
      backDescription,
      patchDescription,
      velcro
    } = req.body;

    // --- EMAIL TRANSPORT ---
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // --- EMAIL HTML ---
    const html = `
      <h2>New AI Design Submission</h2>

      <h3>Customer Info</h3>
      <p><b>Name:</b> ${name}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Phone:</b> ${phone}</p>

      <h3>Design Details</h3>
      <p><b>Type:</b> ${type}</p>
      <p><b>Shape:</b> ${shape}</p>

      ${frontDescription ? `<p><b>Front:</b> ${frontDescription}</p>` : ""}
      ${backDescription ? `<p><b>Back:</b> ${backDescription}</p>` : ""}
      ${patchDescription ? `<p><b>Patch:</b> ${patchDescription}</p>` : ""}

      <p><b>Velcro:</b> ${velcro}</p>
    `;

    await transporter.sendMail({
      from: `"AI Coin Generator" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_RECEIVER,
      subject: "New Coin/Patch Design Submission",
      html
    });

    return res.status(200).json({
      success: true
    });

  } catch (error) {

    console.error("Send design error:", error);

    return res.status(500).json({
      success: false,
      error: "Email failed"
    });

  }
}