const axios = require("axios").default;

/**
 * This class is responsible for communicating with the Discourse API.
 */
export class DiscourseApi {
    private _apiKey: string;
    private _apiUsername: string;
    private _modIds: string[] = [];

    constructor(apiKey: string, apiUsername: string) {
        this._apiKey = apiKey;
        this._apiUsername = apiUsername;
    }

    public async buildModsList() {
        const options = {
            method: "GET",
            url: "https://forum.babylonjs.com/groups/staff/members.json",
            headers: {
                "Api-Key": this._apiKey,
                "Api-Username": this._apiUsername,
            },
        };

        const result = await axios(options);
        this._modIds = result.data.members.map((member) => member.id);
    }

    public async getTopicId(topicUrl: string) {
        const options = {
            method: "GET",
            url: topicUrl + ".json",
            headers: {
                "Api-Key": this._apiKey,
                "Api-Username": this._apiUsername,
            },
        };

        const result = await axios(options);
        return result.data.id;
    }

    private _modHasSeenTopic(topic: any) {
        const topicModIds = topic.posters.map((poster: any) => poster.user_id);
        const modIds = this._modIds;
        return topicModIds.some((topicModId) => modIds.includes(topicModId));
    }

    /**
     * List latest question topics
     */
    public async listLatestQuestions() {
        const options = {
            method: "GET",
            url: "https://forum.babylonjs.com/c/questions/5.json",
            // url: "https://forum.babylonjs.com/c/staff/4.json",
            headers: {
                "Api-Key": this._apiKey,
                "Api-Username": this._apiUsername,
            },
        };

        const result = await axios(options);
        console.log('result', result.data.topic_list.topics);
        const allTopics = result.data.topic_list.topics;
        return allTopics;
    }

    public async getFirstPostText(topicUrl: string) {
        const options = {
            method: "GET",
            url: topicUrl + ".json",
            headers: {
                "Api-Key": this._apiKey,
                "Api-Username": this._apiUsername,
            },
        };

        const result = await axios(options);
        console.log('result', result.data.post_stream.posts);
        const firstPost = result.data.post_stream.posts[0];

        const topicOptions = {
            method: "GET",
            url: "https://forum.babylonjs.com/posts/" + firstPost.id + ".json",
            headers: {
                "Api-Key": this._apiKey,
                "Api-Username": this._apiUsername,
            },
        };

        const post = await axios(topicOptions);
        console.log('post data', post.data);
        return post.data.raw;
    }

    public async getAllPostsText(topicUrl: string) {
        const options = {
            method: "GET",
            url: topicUrl + ".json",
            headers: {
                "Api-Key": this._apiKey,
                "Api-Username": this._apiUsername,
            },
        };

        const result = await axios(options);
        const posts = result.data.post_stream.posts;
        
        const postTexts = await Promise.all(posts.map(async (post: any) => {
            const topicOptions = {
                method: "GET",
                url: "https://forum.babylonjs.com/posts/" + post.id + ".json",
                headers: {
                    "Api-Key": this._apiKey,
                    "Api-Username": this._apiUsername,
                },
            };

            const postResult = await axios(topicOptions);
            // console.log('got postresult', postResult.data);
            return {text: postResult.data.raw, userId: postResult.data.user_id, username: postResult.data.username};
        }));

        return postTexts;
    }

    public async post(topicId: string, text: string) {
        const options = {
            method: "POST",
            url: "https://forum.babylonjs.com/posts.json",
            headers: {
                "Api-Key": this._apiKey,
                "Api-Username": this._apiUsername,
            },
            data: {
                raw: text,
                ["topic_id"]: topicId,
            }
        }

        const post = await axios(options);
        return `https://forum.babylonjs.com/t/${topicId}/${post.data.id}`;
    }

    private _customTopicFilter(topic: any, onlyQuestionsUnseenByMods: boolean) {
        return topic.title !== "About the Questions category" && (!onlyQuestionsUnseenByMods || !this._modHasSeenTopic(topic));
    }

    public filterTopics(topics: any[], onlyQuestionsUnseenByMods: boolean) {
        const filteredTopics = topics.filter(
            (topic) => this._customTopicFilter(topic, onlyQuestionsUnseenByMods)
        );
        return filteredTopics;
    }
}
