import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface GardeningTip {
  id: string;
  title: string;
  content: string;
  category: 'seasonal' | 'care' | 'beginner' | 'expert';
  icon: string;
}

export const aiTipsService = {
  async getCuratedTips(): Promise<GardeningTip[]> {
    const month = new Date().toLocaleString('pt-BR', { month: 'long' });
    const model = "gemini-3-flash-preview";

    const prompt = `Gere 3 dicas de jardinagem curtas e práticas para o mês de ${month} no Brasil. 
    As dicas devem ser variadas (ex: uma sazonal, uma de cuidado geral, uma para iniciantes).
    Inclua: id, title, content (máximo 150 caracteres), category (seasonal, care, beginner, expert) e icon (nome do ícone lucide, ex: Leaf, Droplets, Sun, Sparkles).`;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts: [{ text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                category: { type: Type.STRING, enum: ['seasonal', 'care', 'beginner', 'expert'] },
                icon: { type: Type.STRING }
              },
              required: ["id", "title", "content", "category", "icon"]
            }
          }
        }
      });

      if (!response.text) {
        throw new Error("No response from AI");
      }

      return JSON.parse(response.text.trim());
    } catch (error) {
      console.error("Erro ao gerar dicas de IA:", error);
      // Fallback tips in case of failure
      return [
        {
          id: '1',
          title: 'Rega Matinal',
          content: 'Regue suas plantas pela manhã para que as folhas sequem durante o dia, prevenindo fungos.',
          category: 'care',
          icon: 'Droplets'
        },
        {
          id: '2',
          title: 'Luz Indireta',
          content: 'A maioria das plantas de interior prefere luz indireta brilhante. Evite o sol forte do meio-dia.',
          category: 'beginner',
          icon: 'Sun'
        },
        {
          id: '3',
          title: 'Adubação Sazonal',
          content: `Para ${month}, verifique se suas plantas precisam de nutrientes extras para o crescimento.`,
          category: 'seasonal',
          icon: 'Leaf'
        }
      ];
    }
  }
};
