/**
 * This class builds formatted text responses
 */
export class ResponseBuilder {
    public static buildTopicListResponse(topics: any[]) {
        let resultString = "";
        for (let topic of topics) {
            resultString += `- ${topic.title} - https://forum.babylonjs.com/t/${topic.slug}`;
            resultString += "\n";
        }
        return resultString;
    }
}
