import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const config = {
  api: {
    bodyParser: { sizeLimit: "1mb" }
  }
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      name,
      email,
      phone,
      productType,
      dimensions,
      woodType,
      designDescription,
      finish,
      engraving,
      generatedImage,
      referenceImages
    } = req.body;

    let imageSection = "";
    if (generatedImage) {
      imageSection += `<p><b>Generated Design:</b><br><img src="${generatedImage}" width="200"/></p>`;
    }

    let referenceSection = "";
    if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
      referenceSection = "<h2>Reference Images</h2>";
      referenceImages.forEach(url => {
        referenceSection += `<p><img src="${url}" width="200"/></p>`;
      });
    } else {
      referenceSection = "<h2>Reference Images</h2><p>None provided</p>";
    }

    // Format display strings based on product type
    let dimensionsDisplay = dimensions;
    let woodTypeDisplay = woodType;
    let finishDisplay = finish || "natural";

    if (productType === 'custom-plaque') {
      dimensionsDisplay = "Custom (see description)";
      woodTypeDisplay = "Custom (see description)";
      finishDisplay = "Custom (see description)";
    } else if (productType === 'squared-plaque') {
      // For squared plaque, the "finish" field holds the actual type (e.g., High Gloss Mahogany)
      // and woodType may be "custom" placeholder. Show finish as "Type".
      woodTypeDisplay = finishDisplay; // Type
      finishDisplay = "N/A (see Type)";
    } else if (productType === 'shadowbox') {
      // Shadow box: woodType is the stain, finish is not used
      finishDisplay = "Not applicable for shadow box";
    }

    const html = `
      <h2>Customer Information</h2>
      <p><b>Name:</b> ${name}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Phone:</b> ${phone}</p>

      <h2>Design Details</h2>
      <p><b>Product Type:</b> ${productType}</p>
      <p><b>Dimensions:</b> ${dimensionsDisplay}</p>
      <p><b>${productType === 'squared-plaque' ? 'Type' : 'Wood Stain / Type'}:</b> ${woodTypeDisplay}</p>
      <p><b>Finish:</b> ${finishDisplay}</p>
      <p><b>Engraving:</b> ${engraving === "yes" ? "Yes (laser engraved)" : "No (printed)"}</p>
      <p><b>Design Description:</b> ${designDescription}</p>

      <h2>Generated Image</h2>
      ${imageSection}

      ${referenceSection}
    `;

    await resend.emails.send({
      from: "Wooden Items Designer <onboarding@resend.dev>",
      to: "lcww@integritybottles.com", // replace with your team email
      subject: `New ${productType} Design Request from ${name}`,
      html,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Email sending failed" });
  }
}