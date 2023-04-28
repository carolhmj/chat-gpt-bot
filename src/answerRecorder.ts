import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'fs';
import { join } from 'path';

const LOG_DIRECTORY = join(__dirname, '../logging');
// This class will record the answers and their ratings. 
export class AnswerRecorder {
    private filePath: string;
    constructor(fileName: string) {
        this.filePath = join(LOG_DIRECTORY, fileName + '.json');
    }

    checkDir() {
        if (!existsSync(LOG_DIRECTORY)) {
            mkdirSync(LOG_DIRECTORY);
        }
        if (!existsSync(this.filePath)) {
            writeFileSync(this.filePath, '[]');
        }
    }

    public recordAnswer(answerRecord: Object) {
        this.checkDir();
        const currentData = readFileSync(this.filePath, {encoding: 'utf-8'});
        // console.log('currentData', currentData);
        let jsonCurrent;
        if (!currentData) {
            jsonCurrent = [];
        } else {
            jsonCurrent = JSON.parse(currentData);
        }
        jsonCurrent.push({
            timestamp: Date.now(),
            ...answerRecord
        });
        // console.log('jsonCurrent', jsonCurrent);
        writeFileSync(this.filePath, JSON.stringify(jsonCurrent));
    }
}