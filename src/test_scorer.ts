import { extractResume } from './services/extractor';
import { scoreResume } from './services/scorer';
import { JobDescriptionSchema } from './models';
import fs from 'fs';
import path from 'path';

async function test() {
    console.log("Starting E2E Test (Extractor -> Scorer)...");
    try {
        const resumePath = path.join(__dirname, '../mock_resume_text.txt');
        const resumeText = fs.readFileSync(resumePath, 'utf-8');

        const jdPath = path.join(__dirname, '../mock_jd.json');
        const jdRaw = JSON.parse(fs.readFileSync(jdPath, 'utf-8'));
        const jd = JobDescriptionSchema.parse(jdRaw);

        console.log("1. Extracting Resume...");
        const parsedResume = await extractResume(resumeText);

        console.log("2. Scoring Resume against JD...");
        const scoreReport = await scoreResume(parsedResume, jd);

        console.log("\nSuccess! Final Score Report:\n", JSON.stringify(scoreReport, null, 2));

    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
