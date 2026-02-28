import OpenAI from 'openai';
import { ParsedResume, JobDescription, ScoreReport } from '../models';
import * as dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});

export async function scoreResume(resume: ParsedResume, jd: JobDescription): Promise<ScoreReport> {
    const { exactMatchScore, exactMatchReasoning } = calculateExactMatch(resume.skills, jd.required_skills);
    const { achievementScore, achievementReasoning } = calculateAchievementScore(resume.experiences);
    const { ownershipScore, ownershipReasoning } = calculateOwnershipScore(resume.experiences);
    const { similarityScore, similarityReasoning } = await calculateSimilarityScore(resume, jd);

    // Aggregate scores evenly
    const overallScore = (exactMatchScore + achievementScore + ownershipScore + similarityScore) / 4;

    let tier: 'Tier A' | 'Tier B' | 'Tier C' = 'Tier C';
    if (overallScore >= 80) {
        tier = 'Tier A';
    } else if (overallScore >= 60) {
        tier = 'Tier B';
    }

    return {
        exact_match_score: Math.round(exactMatchScore),
        similarity_score: Math.round(similarityScore),
        achievement_score: Math.round(achievementScore),
        ownership_score: Math.round(ownershipScore),
        overall_tier: tier,
        explainability_reasoning: {
            exact_match: exactMatchReasoning,
            similarity: similarityReasoning,
            achievement: achievementReasoning,
            ownership: ownershipReasoning,
            overall: `Candidate scored ${Math.round(overallScore)}/100, placing them in ${tier}.`
        }
    };
}

// 1. Exact Match: Simple intersection of skills
function calculateExactMatch(resumeSkills: string[], requiredSkills: string[]) {
    if (requiredSkills.length === 0) {
        return { exactMatchScore: 100, exactMatchReasoning: "No required skills specified in JD." };
    }

    const normalizedResumeSkills = resumeSkills.map(s => s.toLowerCase());
    const normalizedRequiredSkills = requiredSkills.map(s => s.toLowerCase());

    const matchedSkills = normalizedRequiredSkills.filter(req =>
        normalizedResumeSkills.some(res => res.includes(req) || req.includes(res))
    );

    const exactMatchScore = (matchedSkills.length / requiredSkills.length) * 100;

    return {
        exactMatchScore,
        exactMatchReasoning: `Matched ${matchedSkills.length} out of ${requiredSkills.length} required skills.`
    };
}

// 2. Similarity Score: Uses an OpenAI prompt
async function calculateSimilarityScore(resume: ParsedResume, jd: JobDescription) {
    try {
        const prompt = `
    You are an expert technical recruiter matching a candidate to a job.
    Job Description: ${jd.title}, Skills: ${jd.required_skills.join(", ")}, ${jd.preferred_skills.join(", ")}
    Candidate: ${resume.candidate_name}, Skills: ${resume.skills.join(", ")}
    
    Candidate Experience: 
    ${resume.experiences.map(e => `${e.role} at ${e.company}: ${e.action_bullets.join(" ")}`).join("\n")}

    Evaluate the semantic overlap between the candidate's profile and the job description.
    For instance, AWS Kinesis overlap strongly with Kafka requirements.
    Return a score strictly from 0 to 100, and a 1-sentence explanation.
    `;

        const completion = await openai.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" },
            messages: [{
                role: "system",
                content: `You must return ONLY a JSON object exactly matching this schema:
{
  "score": number (0 to 100),
  "explanation": "1-sentence explanation"
}`
            }, {
                role: "user",
                content: prompt
            }]
        });

        if (!completion.choices[0]?.message?.content) {
            throw new Error("No text data returned");
        }
        const result = JSON.parse(completion.choices[0].message.content);

        return {
            similarityScore: Math.min(Math.max(result.score, 0), 100), // constrain 0-100
            similarityReasoning: result.explanation
        };
    } catch (error) {
        console.error("Failed to calculate similarity score via LLM:", error);
        return {
            similarityScore: 0,
            similarityReasoning: "Error calculating semantic similarity."
        };
    }
}

// 3. Achievement Score: Evaluate metrics in action_bullets
function calculateAchievementScore(experiences: ParsedResume['experiences']) {
    let totalBullets = 0;
    let bulletsWithMetrics = 0;

    // Simple regex to look for numbers, percentages, or dollar signs representing metrics
    const metricRegex = /\d+%|\$\d+|\d+[kKmMbB]?\b/g;

    for (const exp of experiences) {
        for (const bullet of exp.action_bullets) {
            totalBullets++;
            if (metricRegex.test(bullet)) {
                bulletsWithMetrics++;
            }
        }
    }

    if (totalBullets === 0) {
        return { achievementScore: 0, achievementReasoning: "No action bullets provided." };
    }

    const achievementScore = (bulletsWithMetrics / totalBullets) * 100;
    return {
        achievementScore,
        achievementReasoning: `${bulletsWithMetrics} out of ${totalBullets} bullets contained quantifiable metrics.`
    };
}

// 4. Ownership Score: Deterministic logic
function calculateOwnershipScore(experiences: ParsedResume['experiences']) {
    let score = 50; // Base score

    const positiveWords = ["led", "architected", "built", "spearheaded", "directed", "managed", "designed", "created"];
    const negativeWords = ["assisted", "participated", "helped", "contributed", "supported"];

    for (const exp of experiences) {
        for (const bullet of exp.action_bullets) {
            const lowerBullet = bullet.toLowerCase();

            const hasPositive = positiveWords.some(word => lowerBullet.includes(word));
            if (hasPositive) {
                score += 15;
            }

            const hasNegative = negativeWords.some(word => lowerBullet.includes(word));
            if (hasNegative) {
                score -= 10;
            }
        }
    }

    // Constrain to 0-100 range
    score = Math.min(Math.max(score, 0), 100);

    let reasoning = "Average ownership demonstrated.";
    if (score >= 80) reasoning = "Strong indicators of technical leadership and ownership.";
    else if (score < 40) reasoning = "Experience heavily indexed on support or assistance rather than ownership.";

    return { ownershipScore: score, ownershipReasoning: reasoning };
}
