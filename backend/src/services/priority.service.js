export const calculatePriority = (text) => {

    const t = text.toLowerCase();

    let score = 0.3;

    if (t.includes("fight") || t.includes("knife")) {
        score = 0.9;
    }

    if (t.includes("hospital") || t.includes("school")) {
        score += 0.1;
    }

    if (t.includes("accident")) {
        score = 0.95;
    }

    return Math.min(score, 1);
};