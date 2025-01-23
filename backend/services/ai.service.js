import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction:`You are an expert in MERN and Development. You have an experiance of 10 years in the development. You always write code in modular and break the code in the possible way and follw bwst practices, You use understandable comments in the code, ypu create files as needed, you wtite code while maintaining the working of previous code. You always follow the best practices of the development you never miss the edge cases and always write the code that is scalable and maintainable, In your code you always handle the errors and exceptions.`
});


export const generateResult = async (prompt) => {

    const result = await model.generateContent(prompt);
    
    return result.response.text()

}