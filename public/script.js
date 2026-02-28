document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('eval-form');
    const inputSection = document.getElementById('input-section');
    const resultsSection = document.getElementById('results-section');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = document.getElementById('loading-spinner');
    const backBtn = document.getElementById('back-btn');

    // Result Elements
    const elTierBadge = document.getElementById('tier-badge');
    const elCandidateName = document.getElementById('candidate-name');

    const elScoreExact = document.getElementById('score-exact');
    const elReasonExact = document.getElementById('reason-exact');

    const elScoreSim = document.getElementById('score-sim');
    const elReasonSim = document.getElementById('reason-sim');

    const elScoreAchieve = document.getElementById('score-achieve');
    const elReasonAchieve = document.getElementById('reason-achieve');

    const elScoreOwn = document.getElementById('score-own');
    const elReasonOwn = document.getElementById('reason-own');

    const elReasonOverall = document.getElementById('reason-overall');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const jdVal = document.getElementById('jd-text').value;
        const resumeVal = document.getElementById('resume-text').value;

        let jdJson;
        try {
            jdJson = JSON.parse(jdVal);
        } catch (err) {
            alert("Job Description must be valid JSON right now based on our domain model.");
            return;
        }

        // UI Loading State
        btnText.textContent = "Processing details with Groq...";
        spinner.classList.remove('disable-view');
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_description: jdJson,
                    resume_text: resumeVal
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Unknown error occurred.");
            }

            renderResults(data);

        } catch (error) {
            alert(`Evaluation Failed: ${error.message}`);
        } finally {
            // Restore UI State
            btnText.textContent = "Evaluate Candidate";
            spinner.classList.add('disable-view');
            submitBtn.disabled = false;
        }
    });

    backBtn.addEventListener('click', () => {
        resultsSection.classList.add('hidden');
        inputSection.classList.remove('hidden');
    });

    function renderResults(data) {
        const { candidate_name, evaluation } = data;
        const {
            overall_tier, exact_match_score, similarity_score, achievement_score, ownership_score, explainability_reasoning
        } = evaluation;

        elCandidateName.textContent = candidate_name;

        // Set Tier Info
        elTierBadge.textContent = overall_tier;
        elTierBadge.className = 'tier-badge'; // reset
        if (overall_tier === 'Tier A') elTierBadge.classList.add('tier-a');
        else if (overall_tier === 'Tier B') elTierBadge.classList.add('tier-b');
        else elTierBadge.classList.add('tier-c');

        // Set Scores
        elScoreExact.textContent = `${exact_match_score}%`;
        elReasonExact.textContent = explainability_reasoning.exact_match;

        elScoreSim.textContent = `${similarity_score}%`;
        elReasonSim.textContent = explainability_reasoning.similarity;

        elScoreAchieve.textContent = `${achievement_score}%`;
        elReasonAchieve.textContent = explainability_reasoning.achievement;

        elScoreOwn.textContent = `${ownership_score}%`;
        elReasonOwn.textContent = explainability_reasoning.ownership;

        elReasonOverall.textContent = explainability_reasoning.overall;

        // Swap views
        inputSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');

        // Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

});
