// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ActivityHandler, MessageFactory } from "botbuilder";
import { DiscourseApi } from "./discourseApi/discourseApi";
import { ResponseBuilder } from "./responseBuilder";
import { discourseApiKey, discourseApiUser, openApiKey, openApiEndpoint } from "./userInfo";
import { OpenApi } from "./openApi/openApi";

const discourseApi = new DiscourseApi(discourseApiKey, discourseApiUser);
discourseApi.buildModsList().then(() => {});
const openApi = new OpenApi(openApiKey, openApiEndpoint);

const memory = {
    lastAnswer: "",
    lastTopicId: "",
};

let isEditing = false;

export class EchoBot extends ActivityHandler {
    constructor() {
        super();
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            let replyText = `Echo: ${context.activity.text}`;

            const text = context.activity.text.trim().toLowerCase();
            try {
                if (text === "latest questions") {
                    const allTopics = await discourseApi.listLatestQuestions();
                    const unmodedTopics =
                        discourseApi.filterForUnmodedTopics(allTopics);
                    const textList =
                        ResponseBuilder.buildTopicListResponse(unmodedTopics);
                    replyText = "The latest asked questions were:\n" + textList;
                } else if (text.startsWith("codex answer")) {
                    const topicUrl = text.replace("codex answer", "").trim();
                    memory.lastTopicId = await discourseApi.getTopicId(topicUrl);
                    const postText = await discourseApi.getFirstPostText(
                        topicUrl
                    );
                    // Generate answer
                    // replyText = `This is a auto generated answer for the text "${postText}"`;
                    replyText = await openApi.getResponse(postText);
                    memory.lastAnswer = replyText;
                } else if (text === "edit answer") {
                    if (!memory.lastAnswer) {
                        replyText = "No answer to edit";
                    } else {
                        replyText = "Please post the edited answer.";
                        isEditing = true;
                    }
                } else if (isEditing) {
                    memory.lastAnswer = text;
                    replyText = "Answer edited.";
                    isEditing = false;
                } else if (text === "post answer") {
                    if (memory.lastAnswer === "") {
                        replyText = "No answer to post";
                    } else {
                        const answerUrl = await discourseApi.post(
                            memory.lastTopicId,
                            memory.lastAnswer
                        );
                        replyText = "Answer posted to " + answerUrl;
                    }
                }
            } catch (error) {
                replyText = "Error: " + error;
            }
            await context.sendActivity(
                MessageFactory.text(replyText, replyText)
            );
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = "Hello and welcome!";
            for (const member of membersAdded) {
                if (member.id !== context.activity.recipient.id) {
                    await context.sendActivity(
                        MessageFactory.text(welcomeText, welcomeText)
                    );
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}
