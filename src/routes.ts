import { Router, Request, Response } from 'express';
import { JobDescriptionSchema } from './models';
import { extractResume } from './services/extractor';
import { scoreResume } from './services/scorer';
import multer from 'multer';
const pdfParse = require('pdf-parse');

const upload = multer();
const router = Router();

router.post('/evaluate', upload.single('resume_file'), async (req: Request, res: Response) => {
    try {
        const { job_description } = req.body;
        const uploadedFile = (req as any).file;

        if (!uploadedFile) {
            return res.status(400).json({ error: "Missing candidate resume. Please upload a PDF file." });
        }

        if (uploadedFile.mimetype !== 'application/pdf') {
            return res.status(400).json({ error: "Uploaded file must be a PDF." });
        }

        let finalResumeText = "";
        try {
            const pdfData = await pdfParse(uploadedFile.buffer);
            finalResumeText = pdfData.text;
        } catch (e: any) {
            require('fs').writeFileSync('pdf_error.log', e.stack || String(e));
            console.error("PDF Parsing exception raised:", e);
            return res.status(400).json({ error: "Failed to extract text from the uploaded PDF file." });
        }

        if (!job_description) {
            return res.status(400).json({ error: "Missing 'job_description' in request body." });
        }

        let parsedJd;
        try {
            parsedJd = typeof job_description === 'string' ? JSON.parse(job_description) : job_description;
            console.log("Parsed JD object:", parsedJd);
        } catch (e) {
            console.error("JSON parse failed for string:", job_description);
            return res.status(400).json({ error: "job_description must be a valid JSON string." });
        }

        const jdValidation = JobDescriptionSchema.safeParse(parsedJd);
        if (!jdValidation.success) {
            console.error("Zod Validation Error:", (jdValidation as any).error.errors);
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
