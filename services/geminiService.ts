import { GoogleGenAI, Schema, Type } from "@google/genai";
import { DocumentData, CanonicalSpec } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FAST = 'gemini-3-flash-preview';
const MODEL_REASONING = 'gemini-3-pro-preview';

// --- Schemas for Extraction ---

const entitySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    value: { type: Type.STRING },
    unit: { type: Type.STRING, nullable: true },
    type: { type: Type.STRING, enum: ['CONSTANT', 'VARIABLE', 'MATERIAL', 'DEVICE'] },
  },
  required: ['name', 'value', 'type']
};

const claimSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    statement: { type: Type.STRING },
    type: { type: Type.STRING, enum: ['MEASUREMENT', 'HYPOTHESIS', 'DERIVATION'] },
    confidence: { type: Type.NUMBER, description: "Confidence score 0.0 to 1.0 based on evidence presence" },
    page: { type: Type.NUMBER, nullable: true }
  },
  required: ['statement', 'type', 'confidence']
};

const conflictSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    parameter: { type: Type.STRING },
    description: { type: Type.STRING },
  },
  required: ['parameter', 'description']
};

const extractionResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    entities: { type: Type.ARRAY, items: entitySchema },
    claims: { type: Type.ARRAY, items: claimSchema },
    conflicts: { type: Type.ARRAY, items: conflictSchema }
  },
  required: ['entities', 'claims', 'conflicts']
};

// --- Service Methods ---

export const analyzeDocument = async (text: string): Promise<{
  entities: any[];
  claims: any[];
  conflicts: any[];
}> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: `Analyze the following technical document text. Extract all physical entities (constants, variables), claims (measurements, hypotheses), and identify any internal contradictions or missing units.
      
      Text:
      ${text.substring(0, 100000)}`, // Increased limit for parsed PDFs
      config: {
        responseMimeType: "application/json",
        responseSchema: extractionResponseSchema,
        systemInstruction: "You are a senior physics researcher. Be extremely precise with units and values. If a unit is missing, note it in the value field or leave unit null."
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      entities: result.entities || [],
      claims: result.claims || [],
      conflicts: result.conflicts || []
    };
  } catch (error) {
    console.error("Analysis failed:", error);
    return { entities: [], claims: [], conflicts: [] };
  }
};

export const generateCanonicalSpec = async (documents: DocumentData[]): Promise<CanonicalSpec> => {
  const context = documents.map(d => `Source: ${d.filename}\n${d.content}`).join("\n\n---\n\n");

  const prompt = `
    You are the Chief Technical Engineer. Your goal is to synthesize a "Canonical Technical Specification" based ONLY on the provided sources.
    
    Rules:
    1. Resolve conflicts by choosing the most scientifically rigorous source (e.g. higher precision, later date).
    2. Normalize all units to SI where appropriate, or standard engineering units (consistency is key).
    3. If a parameter is unknown, list it in "Open Questions".
    4. Explicitly state assumptions.
    5. Output the result in JSON format suitable for rendering.

    Structure the JSON with a title, version, sections (title, content), assumptions, and openQuestions.
  `;

  // Schema for Spec
  const specSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      version: { type: Type.STRING },
      sections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['TEXT', 'EQUATION', 'TABLE'] }
          }
        }
      },
      assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
      openQuestions: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_REASONING,
      contents: [
        { role: 'user', parts: [{ text: prompt }] },
        { role: 'user', parts: [{ text: `Context Sources:\n${context}` }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: specSchema,
        thinkingConfig: { thinkingBudget: 2048 } // Use thinking for deep synthesis
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Spec generation failed:", error);
    throw error;
  }
};

export const chatWithNotebook = async (history: { role: string, content: string }[], context: string) => {
  const systemPrompt = `You are a Computational Physics Research Assistant.
  
  Your Capabilities:
  1. Answer questions based strictly on the provided context.
  2. Write and execute Python simulations when asked.
  3. If the user asks for a simulation, plot, or calculation, output the Python code in a standard markdown block (\`\`\`python ... \`\`\`).
  4. Use 'numpy' and 'matplotlib.pyplot' for simulations.
  
  Context:
  ${context}`;

  const chat = ai.chats.create({
    model: MODEL_FAST,
    config: {
      systemInstruction: systemPrompt
    },
    history: history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }))
  });

  // Refined approach:
  const lastUserMessage = history[history.length - 1];
  const previousHistory = history.slice(0, -1);

  const response = await ai.models.generateContent({
    model: MODEL_FAST,
    contents: [
      { role: 'user', parts: [{ text: systemPrompt }] }, 
      ...previousHistory.map(h => ({ role: h.role === 'user' ? 'user' as const : 'model' as const, parts: [{ text: h.content }] })),
      { role: 'user', parts: [{ text: lastUserMessage.content }] }
    ]
  });

  return response.text;
};