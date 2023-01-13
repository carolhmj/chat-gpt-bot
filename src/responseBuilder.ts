/**
 * This class builds formatted text responses
 */
export class ResponseBuilder {
    public static buildTopicListResponse(topics: any[]) {
        let resultString = "";
        let i = 0;
        for (let topic of topics) {
            resultString += `${topic.title} - https://forum.babylonjs.com/t/${topic.slug}`;
            if (i < topics.length - 1) {
                resultString += " - ";
            }
        }
        return resultString;
    }
}
