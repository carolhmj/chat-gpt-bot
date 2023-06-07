const axios = require("axios").default;

const DEFAULT_TIMEOUT = 2 * 60 * 1000 // 2 min timeout?;
const imStart = "<|im_start|>";
const imEnd = "<|im_end|>";
const promptContext = `
    You are a bot on the Babylon.js forum which objective is to answer user questions. You are kind and helpful. 

    When you are not certain of an answer, you can ask follow-up questions to the user.
    You should **never** post links to external libraries. 
    You should **never** generate URLs or links that are not referenced in the official Babylon.js documentation.`;

export class OpenApi {
    private _apiKey: string;
    private _apiEndpoint: string;
    private _modelTemperature = 0.0;
    private _modelTopP = 0.1;
    private _modelMaxTokens = 512;

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
        return clearedText;
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
            },
            timeout: DEFAULT_TIMEOUT
        };
        const maxTries = 3;
        let tryCount = 0;
        const waitTime = 2000;
        let result;
        while (tryCount < maxTries) {
            try {
                console.log('try to call endpoint');
                result = await axios(options);
                // console.log('result', result.data);
                if (result.data && result.data.choices && result.data.choices.length > 0) {
                    console.log('success');
                    return this._formatAnswerText(result.data.choices[0].text);
                } else {
                    console.log('status', result.status);
                    tryCount++;
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            } catch (e) {
                tryCount++;
                console.log('error', e.message);
                // Wait a bit before trying to answer again
                if (tryCount < maxTries) {
                    await new Promise(resolve => setTimeout(resolve, waitTime*(tryCount+1)*(tryCount+1)));
                }
            }
        }
        console.error('exceeded max tries');
        return "";
    }

    public getModelParameters() {
        return {
            temperature: this._modelTemperature,
            topP: this._modelTopP,
            maxTokens: this._modelMaxTokens,
            promptContext
        }
    }
}