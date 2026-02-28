import { Router, Request, Response } from 'express';
import { JobDescriptionSchema } from './models';
import { extractResume } from './services/extractor';
import { scoreResume } from './services/scorer';
import multer from 'multer';
import pdfParse = require('pdf-parse');

const upload = multer();
const router = Router();

router.post('/evaluate', upload.single('resume_file'), async (req: Request, res: Response) => {
    try {
        const { resume_text, job_description } = req.body;

        let finalResumeText = resume_text;

        // If a file was uploaded, parse the PDF instead
        const uploadedFile = (req as any).file;
        if (uploadedFile) {
            if (uploadedFile.mimetype !== 'application/pdf') {
                return res.status(400).json({ error: "Uploaded file must be a PDF." });
            }
            try {
                const pdfParser: any = pdfParse;
                const pdfData = await pdfParser(uploadedFile.buffer);
                finalResumeText = pdfData.text;
            } catch (e) {
                return res.status(400).json({ error: "Failed to parse the uploaded PDF file." });
            }
        }

        // 1. Validate Input
        if (!finalResumeText || typeof finalResumeText !== 'string' || finalResumeText.trim() === '') {
            return res.status(400).json({ error: "Missing or invalid resume text. Please provide 'resume_text' or upload a 'resume_file'." });
        }

        if (!job_description) {
            return res.status(400).json({ error: "Missing 'job_description' in request body." });
        }

        const jdValidation = JobDescriptionSchema.safeParse(job_description);
        if (!jdValidation.success) {
            return res.status(400).json({
                error: "Invalid 'job_description' format.",
                details: (jdValidation as any).error.errors
            });
        }
        const jd = jdValidation.data;

        // 2. Extract structured resume from text
        const parsedResume = await extractResume(finalResumeText);

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
