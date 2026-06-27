// aiRouting.service.js
// Calls the Python ML microservice to detect department from complaint text.
// Drop-in replacement — same function signature as before.

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5001";

/**
 * Detects departments for a complaint using the ML model.
 * @param {string} description - complaint text from the user
 * @returns {Promise<string[]>} - array of department names e.g. ["Electricity"]
 */
export const detectDepartments = async (description) => {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    });

    if (!response.ok) {
      throw new Error(`AI service responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.departments; // e.g. ["Electricity"]

  } catch (error) {
    console.error("⚠️  AI routing service error:", error.message);

    // Fallback: return General so complaint is never lost
    return ["General"];
  }
};