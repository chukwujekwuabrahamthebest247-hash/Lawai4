
import { GoogleGenAI, Modality } from "@google/genai";
import { GroundingSource, VoiceGender, LegalMethod } from "../types";

const SEARCH_MODEL = 'gemini-3-flash-preview';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

const METHOD_INSTRUCTIONS: Record<LegalMethod, string> = {
  NONE: "",
  IRAC: "For legal queries, you MUST structure your response using IRAC: Issue (identify the legal question), Rule (state the relevant law found via search), Analysis (apply the rule to the facts), and Conclusion.",
  CREC: "For legal queries, you MUST structure your response using CREC: Conclusion (state the answer first), Rule (state the law found via search), Explanation (explain how the law applies), and Conclusion (restate the answer).",
  IPAC: "For legal queries, you MUST structure your response using IPAC: Issue (identify the legal question), Principle (state the legal principle found via search), Application (apply it to the situation), and Conclusion."
};

export const generateAIResponse = async (
  prompt: string,
  base64Images: string[] = [],
  legalMethod: LegalMethod = 'NONE'
): Promise<{ text: string; sources: GroundingSource[]; error?: string }> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return { text: "", sources: [], error: "Search Service Configuration Error: Missing Authorization." };
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const parts: any[] = [{ text: prompt }];
  base64Images.forEach(img => {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: img.split(',')[1] || img
      }
    });
  });

  const systemInstruction = `You are a Google Search Professional. 
  MANDATORY: You must use the 'googleSearch' tool for every query to find factual, up-to-date information.
  ${METHOD_INSTRUCTIONS[legalMethod]}
  If the query involves legal advice or law, state that you are an AI using Google Search data and not a lawyer.
  Always prioritize Google Search results over internal knowledge.`;

  try {
    const response = await ai.models.generateContent({
      model: SEARCH_MODEL,
      contents: { parts },
      config: {
        systemInstruction,
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    });

    const sources: GroundingSource[] = [];
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    
    if (groundingMetadata?.groundingChunks) {
      groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({ title: chunk.web.title || "Search Result", uri: chunk.web.uri });
        }
      });
    }

    return { text: response.text || "I couldn't find a clear answer on Google for that query.", sources };
  } catch (error: any) {
    return { text: "", sources: [], error: error.message || "The Google Search tool failed to respond." };
  }
};

export const generateSpeech = async (text: string, voiceGender: VoiceGender): Promise<Uint8Array | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  
  const ai = new GoogleGenAI({ apiKey });
  const voiceName = voiceGender === 'FEMALE' ? 'Kore' : 'Fenrir';
  
  try {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: text.slice(0, 1000) }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });

    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return data ? decode(data) : null;
  } catch (e) {
    return null;
  }
};

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64.replace(/\s/g, ''));
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
