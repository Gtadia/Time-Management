/**
 * Returning 'commonjs''s require function in the 'module' type
 * @ese https://stackoverflow.com/questions/69099763/referenceerror-require-is-not-defined-in-es-module-scope-you-can-use-import-in
 * @see https://dev.to/caspergeek/how-to-use-require-in-ecmascript-modules-1l42
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import {createSpreadsheet, createFolder, moveFileToFolder, getSheets, readData, updateValues} from './google-basic.js';

const {google} = require('googleapis');


async function initialSetup(auth, dataKeys) {
    const service = google.sheets({ version: 'v4', auth });
    const requests = [];

    const spreadsheetId = await createSpreadsheet(auth);
    const folderId = await createFolder(auth);
    await moveFileToFolder(auth, spreadsheetId, folderId);

    const sheetList = await getSheets(auth, spreadsheetId);

    for (let i = 0; i < dataKeys.length; i++) {
        dataKeys[i] = {
            userEnteredValue: {
                stringValue: dataKeys[i]
            }
        }
    }
    sheetList.forEach(
        (i) => {
            requests.push({
                appendCells: {
                    rows: [
                      {
                        values: dataKeys
                      }
                    ],
                    fields: "userEnteredValue",
                    sheetId: i[1]
                  }
            });
        }
    )

    const batchUpdateRequest = {requests};
    try {
        const response = await service.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: batchUpdateRequest,
        });

        return [spreadsheetId, folderId, sheetList, response];
        // return response;
    } catch (err) {
        // TODO (developer) - Handle exception
        throw err;
    }
}

/**
 * Moves cells from one sheet tab to another sheet tab (sheetFrom - today or upcoming) (sheetTo)
 * @param {string} auth
 * @param {string} spreadsheetId
 * @param {int} sheetFrom
 * @param {string} sheetFromName
 * @param {int} sheetTo
 */
async function moveCompletedTasks(auth, spreadsheetId, sheetFrom, sheetFromName, sheetTo, sheetToName, startIndex = 2) {
    const service = google.sheets({ version: 'v4', auth });
    const requests = [];
    let batchUpdateRequest;

    await readData(auth, spreadsheetId, sheetFromName, `A${startIndex}:H`).then(
        (value) => {
                let completedDataList = [];
                console.log(value);
                for (let i = 0; i < value.length; i++) {
                    if (value[i][6] == '=TRUE()') {
                        completedDataList.push([value[i], i + startIndex]);
                        // console.log(completedDataList + "\t --- \t" + i);
                    }
                }
                return completedDataList;
            }
        ).then(
            (dataList) => {
                // console.log(dataList);
                let rowNum;
                const appendList = [];
                for (let j = dataList.length - 1; j >=0; j--) {
                    rowNum = dataList[j];
                    for (let i = 0; i < rowNum[0].length; i++) {
                        rowNum[0][i] = {
                            userEnteredValue: {
                                // stringValue: rowNum[0][i]
                                formulaValue: rowNum[0][i]
                            }
                        }
                    }

                    appendList.push({values: rowNum[0]});

                    requests.push({
                        deleteDimension: {
                            range: {
                                sheetId: sheetFrom,
                                dimension: "ROWS",
                                startIndex: rowNum[1] - 1,
                                endIndex: rowNum[1]
                            }
                        }
                    });
                }
                requests.push({
                    appendCells: {
                            rows: appendList,
                            fields: "userEnteredValue",
                            sheetId: sheetTo
                        }
                });

                console.log(requests);
                batchUpdateRequest = {requests};
            }
        ).catch(
            (e) => {
                if (e instanceof TypeError) {
                    console.log("The spreadsheet doesn't have any data yet/it's empty");
                    return; // Return the error message or something (or a specific code (ex: 200)) so that the react app can do something with it
                } else {
                    console.error;
                }
            }
        );

    // const batchUpdateRequest = {requests};
    console.log(batchUpdateRequest);
    try {
        const response = await service.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: batchUpdateRequest,
        });
        return response;
    } catch (err) {
        // TODO (developer) - Handle exception
        throw err;
    }
}

/**
 *
 * @param {string} auth
 * @param {int} taskNum
 * @param {int} sheetId
 * @param {string} sheetName
 * @param {boolean} moveToCompletedTabOrNot
 */
// TODO — See if I can merge append (Or read the task and save it to a variable) to reduce number of api calls to at most 2
    // TODO — First API call, read the cell
    // TODO — Second API call, updateValue and moveCompletedTasks (but coded out on its own)
async function markAsComplete(auth, spreadsheetId, taskNum, sheetFrom, sheetFromName, sheetTo, sheetToName, moveToCompletedTabOrNot = false) {
    taskNum = taskNum + 2;  // Array's first item is 0 but it's going to start reading from 'A2:E'
    updateValues(auth, spreadsheetId, sheetFromName, `G${taskNum}`, "USER_ENTERED", [["=TRUE()"]]).then(
        () => {
            if (moveToCompletedTabOrNot) {
                // TODO — This is moving ALL the completed tasks (not just the one that you selected) (honestly, this might be good for the user's sake but it also uses MORE Api calls)
                moveCompletedTasks(auth, spreadsheetId, sheetFrom, sheetFromName, sheetTo, sheetToName, taskNum);
            }
        }
    );

    // TODO — So in the countdown function, run this function once the timer reaches 0
    // TODO - The counting down functionality is handled by the device (and we are periodically going to update it on the spreadsheet (We have a limit of 10 per second))
    return 200;
}

async function moveTaskOutOfCompleted(auth, spreadsheetId, taskNum, sheetList, date_today, reset_timer = false) {
    // date_today = date_today.toString();
    taskNum = taskNum + 2;
    const service = google.sheets({version: 'v4', auth});
    const [upcoming, current, completed] = sheetList;
    const requests = [];

    // readCell
    await readData(auth, spreadsheetId, completed[0], `A${taskNum}:H${taskNum}`).then(
        (value) => {
            console.log(value)
            // change array to =FALSE()
            value[0][6] = '=FALSE()';

            // reset timer logic
            if (reset_timer && (value[0][3] == '=TIME(0,0,0)')) {
                // '=TIME(hour, minute, second)'
                // TODO - Make a function that notify the user for the input (do they want to reset the timer or set a custom time (change both the target and the remaining time))
                value[0][3] = value[0][2];
            } else if (reset_timer) {
                value[0][3] = value[0][2];
            }

            // TODO - reset due date if it happened in the past

            return value[0];
        }
    ).then(
        (taskValue) => {
            // If today or in the past
            let sheetDestinationId;
            console.log(taskValue[1] + "\n" + date_today);
            if (taskValue[1] > date_today) {
                sheetDestinationId = upcoming[1];
            } else {
                sheetDestinationId = current[1];
            }

            // Converting list ready for appendCells
            for (let i = 0; i < taskValue.length; i++) {
                taskValue[i] = {
                    userEnteredValue: {
                        formulaValue: taskValue[i]
                        // stringValue: taskValue[i]
                    }
                }
            }

            requests.push({
                appendCells: {
                        rows:[
                            {
                                values: taskValue
                            }
                        ],
                        fields: "userEnteredValue",
                        sheetId: sheetDestinationId
                    }
            });

            requests.push({
                deleteDimension: {
                    range: {
                        sheetId: completed[1],
                        dimension: "ROWS",
                        startIndex: taskNum - 1, // startIndex is one less than its row number
                        endIndex: taskNum
                    }
                }
            });
        }
    ).catch(
        (e) => {
            if (e instanceof TypeError) {
                console.log("The spreadsheet doesn't have any data yet/it's empty");
                 // Return the error message or something (or a specific code (ex: 200)) so that the react app can do something with it
            } else {
                console.error;
            }
        }
    );

    const batchUpdateRequest = {requests};
    try {
        const response = await service.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: batchUpdateRequest,
        });
        return response;
    } catch (err) {
        // TODO (developer) - Handle exception
        throw err;
    }
}

// TODO - logout function (delete token.json)

//TODO — Write Function that detects if changes have been made to the file (https://developers.google.com/drive/api/guides/manage-changes)


// TODO - When a different device sees "currently active" is true, then run that task (count down the timer)
// TODO — A batch update is considered 1 API call!!! Try to make everything as a batch update as much as possible!!

// TODO - Shorten the exports to just the functions that I need
export {moveCompletedTasks, markAsComplete, initialSetup, moveTaskOutOfCompleted};