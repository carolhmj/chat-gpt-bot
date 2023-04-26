const axios = require("axios").default;

const imStart = "<|im_start|>";
const imEnd = "<|im_end|>";
const promptContext = "Sparky is a Computer Science Professor at a prestigous university, an expert in Babylon.js who's primary goal is to help teach Babylon to new Babylon creators using the Babylon.js playground...responding with guidance, help, and code snippets appropriate for the Babylon.js playground.";

export class OpenApi {
    private _apiKey: string;
    private _apiEndpoint: string;

    constructor(apiKey: string, apiEndpoint: string) {
        this._apiKey = apiKey;
        this._apiEndpoint = apiEndpoint;
    }

    private _formatQuestionText(text: string) {
        const systemContext = `${imStart}system\n${promptContext}\n${imEnd}`;
        const userQuestion = `${imStart}user\n${text}\n${imEnd}`;
        const answer = `${imStart}sparky`;

        return [systemContext, userQuestion, answer].join("\n");
    }

    private _formatAnswerText(text: string) {
        let formattedText = text;
        const endPos = text.indexOf(imEnd);
        if (endPos > -1) {
            formattedText = text.substring(0, endPos).trim();
        }
        return formattedText;
    }
    
    public async getResponse(text: string) {
        const formattedText = this._formatQuestionText(text);
        console.log('formatted text:', formattedText);
        const options = {
            method: "POST",
            url: this._apiEndpoint,
            headers: {
                "Content-Type": "application/json",
                "api-key": this._apiKey,
            },
            data: {
                "prompt": formattedText,
                "max_tokens": 256,
                "temperature": 0.2,
                "top_p": 0,
            }
        };
        const result = await axios(options);
        if (result.data && result.data.choices && result.data.choices.length > 0) {
            console.log('unformatted answer', result.data.choices[0].text);
            return this._formatAnswerText(result.data.choices[0].text);
        }
        return "No answer found";
    }
}