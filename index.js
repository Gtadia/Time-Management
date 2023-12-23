import {authorize, createSpreadsheet, createFolder, moveFileToFolder, getSheets, readData, appendData, updateValues, moveCompletedTasks, markAsComplete, initialSetup} from './google-sheets.js';

// const dataKeys = [['Date Created', 'Date Due', 'Time Duration Goal', 'Time Remaining', 'Completed', 'Currently Active']];
const dataKeys = ['Date Created', 'Date Due', 'Time Duration Goal', 'Time Remaining', 'Completed', 'Currently Active'];
const testData = [['Hi', 'Bye', 'Dude', '=DATE(2023, 12, 22)', '=FALSE()', 'Nothing']];
// =DATE(year, month, day)

const auth = await authorize();

const [spreadsheetId, folderId, sheetList, response] = await initialSetup(auth, dataKeys);
console.log("Spreadsheet ID: " + spreadsheetId);
console.log("Folder ID: " + folderId);
console.log("Sheet List: " + sheetList);

for (let i = 0; i < 4; i++) {
  testData[0][0] = i;
  await appendData(auth, spreadsheetId, sheetList[1][0], testData); // Don't run append one after another too fast!!
  console.log(await readData(auth, spreadsheetId, sheetList[1][0]));
}


// await moveCompletedTasks(auth, spreadsheetId, sheetList[1][1], sheetList[1][0], sheetList[2][1], sheetList[2][0]);
await markAsComplete(auth, spreadsheetId, 1, sheetList[1][1], sheetList[1][0], sheetList[2][1], sheetList[2][0], true);