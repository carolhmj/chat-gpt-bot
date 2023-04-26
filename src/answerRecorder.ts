import { constants, open } from 'fs/promises';
import { join } from 'path';

const LOG_DIRECTORY = join(__dirname, '../logging');
// TODO: create a directory if it doesn't exist
// TODO: save json instead of csv
// This class will record the answers and their ratings. 
export class AnswerRecorder {
    private filePath: string;
    private fileHandle;

    constructor(fileName: string) {
        this.filePath = join(LOG_DIRECTORY, fileName);
    }

    async checkFile() {
        if (!this.fileHandle) {
            this.fileHandle = await open(this.filePath, constants.O_CREAT | constants.O_APPEND);
        }
    }

    public async recordAnswer(topicId: string, questionText: string, answer: string, rating: number) {
        await this.checkFile();
        await this.fileHandle.write(`${Date.now()},${topicId},${questionText},${answer},${rating}\n`);
    }
}