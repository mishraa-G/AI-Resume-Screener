import OpenAI from 'openai';
import { ParsedResumeSchema, ParsedResume } from '../models';

const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

export async function extractResume(resumeText: string): Promise<ParsedResume> {
    if (!resumeText || resumeText.trim() === '') {
        throw new Error("Resume text cannot be empty");
    }

    try {
        const completion = await openai.beta.chat.completions.parse({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "You are an expert HR assistant. Your job is to extract candidate information from the provided resume text and strictly format it according to the requested JSON schema. Be precise and extract exactly what is stated in the resume."
                },
                {
                    role: "user",
                    content: `Extract the following resume text:\n\n${resumeText}`
                }
            ],
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "parsed_resume",
                    schema: {
                        type: "object",
                        properties: {
                            candidate_name: { type: "string" },
                            skills: { type: "array", items: { type: "string" } },
                            experiences: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        role: { type: "string" },
                                        company: { type: "string" },
                                        action_bullets: { type: "array", items: { type: "string" } }
                                    },
                                    required: ["role", "company", "action_bullets"],
                                    additionalProperties: false
                                }
                            }
                        },
                        required: ["candidate_name", "skills", "experiences"],
                        additionalProperties: false
                    },
                    strict: true
                }
            }
        });

        const parsedData = completion.choices[0]?.message?.parsed;

        if (!parsedData) {
            throw new Error("Failed to extract data: OpenAI returned an empty or invalid response.");
        }

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
