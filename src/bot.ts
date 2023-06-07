// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ActivityHandler, MessageFactory } from "botbuilder";
import { DiscourseApi } from "./discourseApi/discourseApi";
import { ResponseBuilder } from "./responseBuilder";
import {
    discourseApiKey,
    discourseApiUser,
    openApiKey,
    openApiEndpoint,
} from "./userInfo";
import { OpenApi } from "./openApi/openApi";
import { AnswerRecorder } from "./answerRecorder";

const discourseApi = new DiscourseApi(discourseApiKey, discourseApiUser);
discourseApi.buildModsList().then(() => {});
const openApi = new OpenApi(openApiKey, openApiEndpoint);

enum BotStates {
    Idling,
    WaitingToPostAnswer,
    WaitingForEdit,
    WaitingForRating,
    WaitingForReprompt,
    WaitingForUsernameToPostAnswer,
}

const TOKEN_LIBRARY = {
    list: "latest",
    unmoderated: "unmoderated",
    answer: "answer url",
    cancel: "cancel",
    edit: "edit",
    reprompt: "reprompt",
    post: "post",
    help: "help"
}
export class EchoBot extends ActivityHandler {
    private currentState = BotStates.Idling;
    private lastAnswer = "";
    private lastTopicId = "";
    private lastRating = 0;
    private answerRecorder;

    constructor() {
        super();
        console.log('EchoBot constructor');
        this.answerRecorder = new AnswerRecorder("ratings");
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(this.messageListener.bind(this));
        this.onMembersAdded(this.membersAddedListener.bind(this));
    }

    public clearLastInfos() {
        this.lastAnswer = "";
        this.lastTopicId = "";
        this.lastRating = 0;
    }

    public onWaitingForEdit(text: string) {
        this.lastAnswer = text;
        this.currentState = BotStates.WaitingToPostAnswer;
        return "Answer edited.";
    }

    public async delay(time: number) {
        return new Promise(resolve => setTimeout(resolve, time));
    }

    public async onWaitingForReprompt(text: string) {
        await this.delay(1000); 
        const answer = await this.getAnswer([{text: text, userId: "9999", username: "testforumuser"}]);
        // console.log('answer from reprompt', answer);
        this.currentState = BotStates.WaitingToPostAnswer;
        if (answer) {
            this.lastAnswer = answer;
            // console.log('update last answer to', this.lastAnswer);
            return this._generateAutoGeneratedAnswerReply(answer);
        } else {
            return "There was an error generating your answer. The current answer is " + this.lastAnswer;
        }
    }

    public async onWaitingForRating(text: string) {
        this.lastRating = parseInt(text);
        this.currentState = BotStates.Idling;
        this.answerRecorder.recordAnswer({answer: this.lastAnswer, rating: this.lastRating, topicId: this.lastTopicId, modelParameters: openApi.getModelParameters()});
        return "Thank you for your rating.";
    }

    public async onWaitingToPostAnswer(text: string) {
        if (text.startsWith(TOKEN_LIBRARY.edit)) {
            this.currentState = BotStates.WaitingForEdit;
            return "Please post the edited answer.";
        } else if (text.startsWith(TOKEN_LIBRARY.reprompt)) {
            this.currentState = BotStates.WaitingForReprompt;
            return "Please post the updated prompt.";
        } else if (text.startsWith(TOKEN_LIBRARY.post)) {
            if (this.lastAnswer === "") {
                this.currentState = BotStates.Idling;
                return "No answer to post";
            } else {
                this.currentState = BotStates.WaitingForUsernameToPostAnswer;
                return "Please inform your forum username.";
            }
        } else if (text.startsWith(TOKEN_LIBRARY.cancel)) {
            this.currentState = BotStates.WaitingForRating;
            return "Answer canceled. Please rate this answer from 1 to 4.";
        } else {
            return "Unknown command.";
        }
    }

    public async getAnswer(postText: any[]) {
        const answer = await openApi.getResponse(postText);
        return answer;
    }

    private _getAvailableCommandsForAnsweringState() {
        return `The available commands are: \n\n 
        - ${TOKEN_LIBRARY.edit} \n\n 
        - ${TOKEN_LIBRARY.reprompt} \n\n 
        - ${TOKEN_LIBRARY.post} \n\n 
        - ${TOKEN_LIBRARY.cancel} \n\n`;
    }

    private _generateAutoGeneratedAnswerReply(answer: string) {
        return `The autogenerated answer for the question was: \n\n ${answer}. \n\n 
        Available commands: \n\n ${this._getAvailableCommandsForAnsweringState()}`;
    }

    public async onIdling(text: string) {
        if (text.startsWith(TOKEN_LIBRARY.list)) {
            const allTopics = await discourseApi.listLatestQuestions();
            const needsToBeModerated = text.indexOf(TOKEN_LIBRARY.unmoderated) > -1;
            const unmodedTopics =
                discourseApi.filterTopics(allTopics, needsToBeModerated);
            const textList =
                ResponseBuilder.buildTopicListResponse(unmodedTopics);
            return "The latest asked questions were: \n" + textList;
        } else if (text.startsWith(TOKEN_LIBRARY.answer)) {
            const cleanString = text.replace(TOKEN_LIBRARY.answer, "").trim();
            const regex = new RegExp('([-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&=]*[\\w/-]*))', 'gm');

            const topicUrl = "https://" + regex.exec(cleanString)[0].trim();
            this.lastTopicId = await discourseApi.getTopicId(topicUrl);
            const postText = await discourseApi.getAllPostsText(topicUrl);
            
            // Generate answer
            const answer = await this.getAnswer(postText);
            // console.log('got answer', answer);
            this.lastAnswer = answer;
            this.currentState = BotStates.WaitingToPostAnswer;
            return this._generateAutoGeneratedAnswerReply(answer);
        } else if (text.startsWith(TOKEN_LIBRARY.help)) {
            return `The available commands are:\n
            - '${TOKEN_LIBRARY.list}' to get the latest questions.\n
            - '${TOKEN_LIBRARY.list} ${TOKEN_LIBRARY.unmoderated}' to get the latest questions that need to be moderated.\n
            - '${TOKEN_LIBRARY.answer} <question url>' to get an autogenerated answer for the question.\n
            - '${TOKEN_LIBRARY.help}' to get this help.
            \n\nIf you are in the middle of a question answering process you can use the following commands: \n\n
            ${this._getAvailableCommandsForAnsweringState()}`
        } else {
            return `Echo: ${text}\n\n Type ${TOKEN_LIBRARY.list} to get the latest questions. Or ${TOKEN_LIBRARY.help} to get more information about the commands.`;
        }
    }

    public async onWaitingForUsernameToPostAnswer(text: string) {
        const username = text.trim();
        const answerUrl = await discourseApi.post(
            this.lastTopicId,
            this.lastAnswer,
            username
        );
        this.currentState = BotStates.WaitingForRating;
        return `Answer posted to ${answerUrl}. Please rate this answer from 1 to 4.`;
    };

    public async messageListener(context, next) {
        let replyText = `Echo: ${context.activity.text}`;

        const text = context.activity.text.trim().toLowerCase();
        console.log('Received text:', text, 'currentState:', this.currentState);
        try {
            switch (this.currentState) {
                case BotStates.WaitingForEdit:
                    replyText = this.onWaitingForEdit(text);
                    break;
                case BotStates.WaitingForReprompt:
                    replyText = await this.onWaitingForReprompt(text);
                    break;
                case BotStates.WaitingForRating:
                    replyText = await this.onWaitingForRating(text);
                    break;
                case BotStates.WaitingForUsernameToPostAnswer:
                    replyText = await this.onWaitingForUsernameToPostAnswer(text);
                    break;
                case BotStates.WaitingToPostAnswer:
                    replyText = await this.onWaitingToPostAnswer(text);
                    break;
                case BotStates.Idling:
                    replyText = await this.onIdling(text);
                    break;
                default:
                    replyText = "Error: Unknown state";
                    break;
            }
        } catch (error) {
            replyText = "Error: " + error;
        }
        await context.sendActivity(MessageFactory.text(replyText));
        // By calling next() you ensure that the next BotHandler is run.
        await next();
    }

    public async membersAddedListener(context, next) {
        const membersAdded = context.activity.membersAdded;
        const welcomeText = "Hello and welcome to the ChatGPT Answer Bot!";
        for (const member of membersAdded) {
            if (member.id !== context.activity.recipient.id) {
                await context.sendActivity(
                    MessageFactory.text(welcomeText, welcomeText)
                );
            }
        }
        // By calling next() you ensure that the next BotHandler is run.
        await next();
    }
}
