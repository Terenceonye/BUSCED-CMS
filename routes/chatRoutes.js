const express = require("express");
const axios = require("axios");
const stringSimilarity = require("string-similarity");
const twilio = require("twilio");
const Faq = require("../models/faqModel");
const Context = require("../models/contextModel");
const he = require("he"); // For HTML entity decoding
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();

// Twilio Setup
const client = new twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

// 🔹 Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to find the best FAQ match
async function getBestMatch(userQuestion) {
  console.log("🔍 Checking FAQ database for match...");

  // Convert userQuestion to lowercase
  userQuestion = userQuestion.toLowerCase();
  if (typeof userQuestion !== "string" || userQuestion.trim() === "") {
    console.error("❌ Invalid user question:", userQuestion);
    return null;
  }

  const faqs = await Faq.find();
  if (!faqs || faqs.length === 0) {
    console.error("❌ No FAQs found in the database.");
    return null;
  }

  const questions = faqs.map((faq) => faq.question.toLowerCase());
  if (!Array.isArray(questions) || questions.length === 0) {
    console.error("❌ FAQ questions are not in a valid array.");
    return null;
  }

  const bestMatch = stringSimilarity.findBestMatch(userQuestion, questions);

  if (bestMatch.bestMatch.rating > 0.5) {
    console.log(
      `✅ FAQ match found: "${bestMatch.bestMatch.target}" (${(bestMatch.bestMatch.rating * 100).toFixed(1)}% match)`,
    );
    return faqs.find(
      (faq) => faq.question.toLowerCase() === bestMatch.bestMatch.target,
    );
  }

  console.log("❌ No FAQ match found (below 50% threshold)");
  return null;
}

// Function to get chatbot response using context-aware QA model
async function getContextResponse(message) {
  console.log("📚 Checking context database for answer...");

  const contextDoc = await Context.findOne({ content: { $exists: true } });
  if (!contextDoc) {
    console.log("⚠️ No context document found, skipping context QA...");
    return null;
  }

  const contextText = contextDoc.content;
  const CHUNK_SIZE = 1000;

  const chunks = [];
  for (let i = 0; i < contextText.length; i += CHUNK_SIZE) {
    chunks.push(contextText.slice(i, i + CHUNK_SIZE));
  }

  let bestAnswer = null;
  let bestScore = 0;

  for (const chunk of chunks) {
    try {
      const response = await axios.post(
        "https://api-inference.huggingface.co/models/deepset/roberta-base-squad2",
        {
          inputs: {
            question: message.toLowerCase(),
            context: chunk.toLowerCase(),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (
        response.data &&
        response.data.answer &&
        response.data.score !== undefined
      ) {
        const { answer, score } = response.data;
        console.log(
          `  Chunk score: ${(score * 100).toFixed(1)}% | Answer: "${answer.substring(0, 50)}${answer.length > 50 ? "..." : ""}"`,
        );

        // Only accept answers with reasonable length and confidence
        if (answer.trim().length > 2 && score > 0.01 && score > bestScore) {
          bestAnswer = answer;
          bestScore = score;
        }
      }
    } catch (error) {
      console.error("⚠️ Error processing chunk:", error.message);
      continue;
    }
  }

  if (bestAnswer && bestScore > 0.01) {
    console.log(
      `✅ Context match found with score: ${(bestScore * 100).toFixed(1)}%`,
    );
    return bestAnswer.slice(0, 250);
  }

  console.log("❌ No valid answer found in context database");
  return null;
}

/**
 * 🔥 NEW: Gemini API Fallback
 * Uses Google's Gemini model to answer questions when FAQ and context fail
 */
/**
 * 🔥 Gemini API Fallback - FIXED for model availability AND incomplete responses
 */
async function getGeminiResponse(message) {
  console.log("🤖 Using Gemini AI as final fallback...");

  try {
    // Fetch context for Gemini to reference
    const contextDoc = await Context.findOne({ content: { $exists: true } });
    const institutionContext = contextDoc
      ? contextDoc.content.substring(0, 1500)
      : "";

    // 🔹 FIX 1: USE CORRECT AVAILABLE MODEL NAMES
    // Available models as of 2025:
    // - "gemini-1.5-flash-latest" (fast, recommended)
    // - "gemini-1.5-pro-latest" (more capable, slower)
    // - "gemini-pro" (stable, older)
    // ❌ "gemini-2.5-flash" - NOT YET PUBLICLY AVAILABLE

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // ✅ WORKS EVERY TIME
      // model: "gemini-1.5-pro-latest", // ✅ ALTERNATIVE
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 700, // ✅ INCREASED FROM 300 TO 700
        topP: 0.9,
        topK: 40,
      },
    });

    // 🔹 FIX 2: IMPROVED PROMPT for complete responses
    const prompt = `
You are the official AI assistant for UNIVERSITY OF AGRICULTURE AND ENVIRONMENTAL SCIENCE (UAES), UMUAGWO. 
Your role is to help students, staff, and visitors with questions about the institution.

--- CONTEXT REFERENCE (if relevant) ---
${institutionContext ? institutionContext.substring(0, 800) + "..." : "No specific context provided."}

--- USER QUESTION ---
${message}

--- CRITICAL RESPONSE REQUIREMENTS ---
1. ALWAYS complete your entire response - NEVER cut off mid-sentence
2. End every response with proper punctuation (. ! ?)
3. Keep responses helpful but complete (2-4 sentences minimum)
4. If you don't know the exact FPNO-specific answer, provide general guidance
5. Suggest contacting the appropriate department when uncertain
6. End with a helpful follow-up question

--- YOUR COMPLETE RESPONSE ---
`;

    // 🔹 Generate AI response
    const result = await model.generateContent(prompt);
    let responseText = result.response.text();

    // 🔹 FIX 3: ENSURE RESPONSE IS COMPLETE
    responseText = responseText.trim();

    // Check if response is cut off (no ending punctuation)
    const lastChar = responseText.slice(-1);
    const hasEndingPunctuation = [".", "!", "?"].includes(lastChar);

    if (!hasEndingPunctuation && responseText.length > 20) {
      console.log("⚠️ Response cut off - adding completion...");
      responseText += " Is there anything else you'd like to know about us?";
    }

    // If response is too short, it might be incomplete
    if (responseText.split(" ").length < 10) {
      console.log("⚠️ Response too short - regenerating...");

      // Try again with more explicit instruction
      const retryResult = await model.generateContent(
        `Please give a complete, friendly response to this question about UNIVERSITY OF AGRICULTURE AND ENVIRONMENTAL SCIENCE (UAES), UMUAGWO: "${message}". Your response must be at least 2 full sentences.`,
      );
      responseText = retryResult.response.text().trim();

      // Ensure it has ending punctuation
      if (!responseText.match(/[.!?]$/)) {
        responseText += " How can I assist you further?";
      }
    }

    console.log(
      `✅ Gemini response generated (${responseText.length} chars, ${responseText.split(" ").length} words)`,
    );
    return responseText;
  } catch (error) {
    console.error("❌ Gemini API Error:", error.message);

    // 🔹 FIX 4: FALLBACK TO STABLE MODEL
    try {
      console.log("🔄 Attempting fallback to gemini-pro (stable)...");
      const fallbackModel = genAI.getGenerativeModel({
        model: "gemini-pro",
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 600,
        },
      });

      const fallbackResult = await fallbackModel.generateContent(
        `You are the FPNO assistant. Give a complete, friendly response to: "${message}"`,
      );
      let fallbackText = fallbackResult.response.text().trim();

      // Ensure completeness
      if (!fallbackText.match(/[.!?]$/)) {
        fallbackText += " Is there anything else I can help you with?";
      }

      console.log(`✅ Gemini fallback response generated`);
      return fallbackText;
    } catch (fallbackError) {
      console.error("❌ Gemini Fallback Also Failed:", fallbackError.message);
      return "I'm here to help with questions about UNIVERSITY OF AGRICULTURE AND ENVIRONMENTAL SCIENCE (UAES), UMUAGWO. Could you please rephrase your question or contact the registrar's office at info@imopoly.edu.ng?";
    }
  }
}

// 🎯 MAIN ENDPOINT - Refactored with Gemini fallback
router.post("/chat", async (req, res) => {
  const { message } = req.body;
  console.log("\n" + "=".repeat(60));
  console.log("📨 NEW CHAT REQUEST RECEIVED");
  console.log(`💬 User: "${message}"`);
  console.log("=".repeat(60));

  let responseText = "I'm not sure. Please contact the school."; // Default fallback

  try {
    // 🔴 STAGE 1: Check FAQ Database (Fast, accurate)
    console.log("\n🟦 STAGE 1: Checking FAQ...");
    const faqMatch = await getBestMatch(message);
    if (faqMatch) {
      responseText = faqMatch.answer;
      console.log("✅ USING: FAQ Answer");
    } else {
      // 🟠 STAGE 2: Check Context Database (AI QA Model)
      console.log("\n🟧 STAGE 2: Checking Context Database...");
      const contextMatch = await getContextResponse(message);
      if (contextMatch) {
        responseText = contextMatch;
        console.log("✅ USING: Context QA Answer");
      } else {
        // 🟢 STAGE 3: Gemini API Final Fallback (Intelligent response)
        console.log("\n🟩 STAGE 3: Using Gemini AI Fallback...");
        responseText = await getGeminiResponse(message);
        console.log("✅ USING: Gemini AI Response");
      }
    }

    // Decode HTML entities and send response
    const decodedResponse = he.decode(responseText);

    console.log("\n" + "-".repeat(60));
    console.log(
      `📤 Response: "${decodedResponse.substring(0, 100)}${decodedResponse.length > 100 ? "..." : ""}"`,
    );
    console.log("-".repeat(60));

    res.json({ reply: decodedResponse });
  } catch (error) {
    console.error("\n💥 CRITICAL ERROR:", error);

    // Ultimate fallback - never leave user without response
    res.json({
      reply:
        "I'm experiencing technical difficulties. Please try again later or contact the registrar's office at registrar@fpno.edu.ng",
    });
  }
});

module.exports = router;
