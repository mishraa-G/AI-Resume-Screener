import { Router, Request, Response } from 'express';
import { JobDescriptionSchema } from './models';
import { extractResume } from './services/extractor';
import { scoreResume } from './services/scorer';

const router = Router();

router.post('/evaluate', async (req: Request, res: Response) => {
    try {
        const { resume_text, job_description } = req.body;

        // 1. Validate Input
        if (!resume_text || typeof resume_text !== 'string') {
            return res.status(400).json({ error: "Missing or invalid 'resume_text' in request body." });
        }

        if (!job_description) {
            return res.status(400).json({ error: "Missing 'job_description' in request body." });
        }

        const jdValidation = JobDescriptionSchema.safeParse(job_description);
        if (!jdValidation.success) {
            return res.status(400).json({
                error: "Invalid 'job_description' format.",
                details: jdValidation.error.errors
            });
        }
        const jd = jdValidation.data;

        // 2. Extract structured resume from text
        const parsedResume = await extractResume(resume_text);

        // 3. Score the candidate against the Job Description
        const scoreReport = await scoreResume(parsedResume, jd);

        // 4. Return Final Evaluation
        return res.status(200).json({
            candidate_name: parsedResume.candidate_name,
            evaluation: scoreReport,
            extracted_data: parsedResume // optional: return it so client can verify extraction
        });

    } catch (error: any) {
        console.error("Evaluation Error:", error);

        // Catch-all 500
        // In a real app we might distinguish between an LLM extraction failure (502/503) vs Internal App Logic
        return res.status(500).json({
            error: "An internal evaluation error occurred.",
            message: error.message
        });
    }
});

export default router;
