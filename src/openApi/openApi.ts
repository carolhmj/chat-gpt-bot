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

    private _formatText(text: string) {
        const systemContext = `${imStart}system\n${promptContext}\n${imEnd}`;
        const userQuestion = `${imStart}user\n${text}\n${imEnd}`;
        const answer = `${imStart}sparky`;

        return [systemContext, userQuestion, answer].join("\n");
    }
    
    public async getResponse(text: string) {
        const formattedText = this._formatText(text);
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
            const formattedAnswer = result.data.choices[0].text.replace(imStart, "").replace(imEnd, "").trim();
            return formattedAnswer;
        }
        return "No answer found";
    }
}