import OpenAI from 'openai';
import { ParsedResumeSchema, ParsedResume } from '../models';
import * as dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

export async function extractResume(resumeText: string): Promise<ParsedResume> {
    if (!resumeText || resumeText.trim() === '') {
        throw new Error("Resume text cannot be empty");
    }

    try {
        const completion = await openai.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `You are an expert HR assistant. Your job is to extract candidate information from the provided resume text and strictly format it as JSON. You must return ONLY a JSON object that satisfies this schema:
{
  "candidate_name": string,
  "skills": string[],
  "experiences": [
    {
      "role": string,
      "company": string,
      "action_bullets": string[]
    }
  ]
}`
                },
                {
                    role: "user",
                    content: `Extract the following resume text:\n\n${resumeText}`
                }
            ]
        });

        if (!completion.choices[0]?.message?.content) {
            throw new Error("Failed to extract data: OpenAI returned an empty or invalid response.");
        }

        const parsedData = JSON.parse(completion.choices[0].message.content);

        // Double-check validation against Zod schema just to be extremely safe, 
        // even though OpenAI Structured Outputs guarantees the structure.
        return ParsedResumeSchema.parse(parsedData);

    } catch (error: any) {
        if (error.name === 'ZodError') {
            console.error("Validation failed for extracted data:", error.errors);
            throw new Error(`Extracted data validation failed: ${error.message}`);
        }
        console.error("Error calling OpenAI during extraction:", error);
        throw new Error(`Extraction Service Failed: ${error.message}`);
    }
}
