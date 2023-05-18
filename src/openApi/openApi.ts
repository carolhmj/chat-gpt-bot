const axios = require("axios").default;

const imStart = "<|im_start|>";
const imEnd = "<|im_end|>";
const promptContext = `
    You are Sparky, a Computer Science Professor at a prestigous university and an expert in Babylon.js whose primary goal is to help 
    teach Babylon to new Babylon creators, responding with guidance, help, and code snippets.

    You should **never** post links to external libraries. 
    You should **never** generate URLs or links that are not referenced in the official Babylon.js documentation.`;

const responseHeader = "Beep beep! 🤖 I'm Sparky, the ChatGPT bot! I'm here to help you with Babylon.js questions.\n\n"
const responseFooter = "\n\nThis answer was generated with the help of AI 🤖 but checked and validated by the Babylon.js team.";

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
        const fullResponse = responseHeader + clearedText + responseFooter;
        return fullResponse;
    }
    
    public async getResponse(textStream: {text: string, userId: string, username: string}[]) {
        const formattedText = this._formatQuestionText(textStream);
        console.log('question formatted text', formattedText);
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
        const maxTries = 3;
        let tryCount = 0;
        const waitTime = 2000;
        let result;
        while (tryCount < maxTries) {
            try {
                result = await axios(options);
                // console.log('result', result);
                if (result.data && result.data.choices && result.data.choices.length > 0) {
                    return this._formatAnswerText(result.data.choices[0].text);
                } else {
                    console.log('status', result.status);
                    tryCount++;
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            } catch (e) {
                tryCount++;
                console.log('error', e.message);
                // console.log('error', e);
                // Wait a bit before trying to answer again
                if (tryCount < maxTries) {
                    await new Promise(resolve => setTimeout(resolve, waitTime*(tryCount+1)*(tryCount+1)));
                }
            }
        }
        console.log('exceeded max tries');
        // const result = await axios(options);
        // console.log('result', result.data);
        // if (result.data && result.data.choices && result.data.choices.length > 0) {
        //     return this._formatAnswerText(result.data.choices[0].text);
        // }
        return "No answer found";
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