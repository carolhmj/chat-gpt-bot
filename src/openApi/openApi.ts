const axios = require("axios").default;

const imStart = "<|im_start|>";
const imEnd = "<|im_end|>";
const promptContext = `
    You are Sparky, a Computer Science Professor at a prestigous university and an expert in Babylon.js whose primary goal is to help 
    teach Babylon to new Babylon creators, responding with guidance, help, and code snippets. 
    You don't post links to external libraries. 
    You don't post links starting with https://www.babylonjs-playground.com/
    You don't post links starting with https://playground.babylonjs.com/. 
    You post only valid links to the Babylon.js documentation.`;

const responseHeader = "Bleep bloop! 🤖 I'm Sparky, the ChatGPT bot! I'm here to help you with Babylon.js questions.\n\n"
export class OpenApi {
    private _apiKey: string;
    private _apiEndpoint: string;
    private _modelTemperature = 0.2;
    private _modelTopP = 0.1;
    private _modelMaxTokens = 256;

    constructor(apiKey: string, apiEndpoint: string) {
        this._apiKey = apiKey;
        this._apiEndpoint = apiEndpoint;
    }

    private _formatQuestionText(postList: {text: string, userId: string, username: string}[]) {
        const systemContext = `${imStart}system\n${promptContext}\n${imEnd}`;
        const userQuestions = [];
        for (const post of postList) {
            const user = post.username === "system" ? "sparky": post.username;
            userQuestions.push(`${imStart}${user}\n${post.text}\n${imEnd}`);
        }
        const userQuestion = userQuestions.join("\n");
        const answer = `${imStart}sparky`;

        return [systemContext, userQuestion, answer].join("\n");
    }

    private _formatAnswerText(text: string) {
        let clearedText = text;
        const endPos = text.indexOf(imEnd);
        if (endPos > -1) {
            clearedText = text.substring(0, endPos).trim();
        }
        // console.log('formatted text', clearedText);
        const fullResponse = responseHeader + clearedText;
        return fullResponse;
    }
    
    public async getResponse(textStream: {text: string, userId: string, username: string}[]) {
        const formattedText = this._formatQuestionText(textStream);
        const options = {
            method: "POST",
            url: this._apiEndpoint,
            headers: {
                "Content-Type": "application/json",
                "api-key": this._apiKey,
            },
            data: {
                "prompt": formattedText,
                "max_tokens": this._modelMaxTokens,
                "temperature": this._modelTemperature,
                "top_p": this._modelTopP,
            }
        };
        const result = await axios(options);
        if (result.data && result.data.choices && result.data.choices.length > 0) {
            return this._formatAnswerText(result.data.choices[0].text);
        }
        return "No answer found";
    }

    public getModelParameters() {
        return {
            temperature: this._modelTemperature,
            topP: this._modelTopP,
            maxTokens: this._modelMaxTokens,
        }
    }
}