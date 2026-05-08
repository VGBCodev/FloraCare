import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface PlantResult {
  commonName: string;
  scientificName: string;
  confidence: number;
  careInstructions: {
    sunlight: string;
    watering: string;
    soil: string;
    temperature: string;
    humidity: string;
    toxicity: string;
    generalCare: string;
  };
  funFact: string;
}

export async function identifyPlant(base64Image: string, mimeType: string): Promise<PlantResult> {
  const model = "gemini-3-flash-preview";
  
  const imagePart = {
    inlineData: {
      data: base64Image.split(',')[1],
      mimeType: mimeType,
    },
  };
  
  const prompt = `Identifique a planta nesta foto. Forneça instruções detalhadas de cuidado no formato JSON.
  Retorne os valores em Português do Brasil.
  Inclua: commonName (nome comum), scientificName (nome científico), confidence (confiança, de 0.0 a 1.0), funFact (curiosidade), 
  e o objeto careInstructions com os campos: sunlight (luz solar), watering (rega), soil (solo), temperature (temperatura), humidity (umidade), toxicity (toxicidade) e generalCare (cuidados gerais).
  Seja específico e prestativo como um mestre jardineiro.`;

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [imagePart, { text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          commonName: { type: Type.STRING },
          scientificName: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          funFact: { type: Type.STRING },
          careInstructions: {
            type: Type.OBJECT,
            properties: {
              sunlight: { type: Type.STRING },
              watering: { type: Type.STRING },
              soil: { type: Type.STRING },
              temperature: { type: Type.STRING },
              humidity: { type: Type.STRING },
              toxicity: { type: Type.STRING },
              generalCare: { type: Type.STRING },
            },
            required: ["sunlight", "watering", "soil", "temperature", "humidity", "toxicity", "generalCare"]
          }
        },
        required: ["commonName", "scientificName", "confidence", "careInstructions", "funFact"]
      }
    }
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  return JSON.parse(response.text.trim());
}

export async function diagnosePlant(base64Image: string, mimeType: string, symptoms: string): Promise<string> {
  const model = "gemini-3-flash-preview";
  
  const imagePart = {
    inlineData: {
      data: base64Image.split(',')[1],
      mimeType: mimeType,
    },
  };
  
  const prompt = `Esta planta está apresentando estes sintomas: "${symptoms}". 
  Analise a foto e forneça um diagnóstico e um plano de tratamento. 
  Responda em Português do Brasil e use Formatação Markdown. Inclua seções para:
  1. Diagnóstico Provável
  2. Causas Potenciais
  3. Passos Imediatos
  4. Prevenção a Longo Prazo`;

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [imagePart, { text: prompt }] },
  });

  return response.text || "AI could not provide a diagnosis at this time.";
}
