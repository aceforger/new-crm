const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/author-info", async (req, res) => {
  const { name, email, book_title } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Tell me more about this author:
Name: ${name || "Unknown"}
Email: ${email || "Not provided"}
Book Title: ${book_title || "Unknown"}

Please research and provide information about:
1. This author's presence on Amazon (find their book if available)
2. Any existing website they might have
3. Any press releases or media coverage they've had
4. Additional biographical information if available

Please format the response in a clear, organized way with sections for Amazon Presence, Website, Press Coverage, and Biography. If specific information is not found, please indicate that.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({ content: text });
  } catch (err) {
    console.error("Gemini error:", err.message);
    // If quota exceeded, return a friendly message
    if (err.message.includes("429")) {
      return res.json({
        content:
          "AI summary temporarily unavailable. Please try again in a minute.",
      });
    }
    res.status(500).json({ message: "Failed to fetch author info" });
  }
});

module.exports = router;
