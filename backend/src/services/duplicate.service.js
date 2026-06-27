export const isSimilarComplaint = (text1, text2) => {

    const words1 = text1.toLowerCase().split(" ");
    const words2 = text2.toLowerCase().split(" ");

    const common = words1.filter(word => words2.includes(word));

    return common.length >= 3;
};