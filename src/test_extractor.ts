import { extractResume } from './services/extractor';
import fs from 'fs';
import path from 'path';

async function test() {
    const resumePath = path.join(__dirname, '../mock_resume_text.txt');
    const resumeText = fs.readFileSync(resumePath, 'utf-8');

    console.log("Testing extraction...");
    try {
        const result = await extractResume(resumeText);
        console.log("Success! Parsed Resume:\n", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error(e);
    }
}

test();
