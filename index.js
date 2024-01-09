import {moveCompletedTasks, markAsComplete, initialSetup, moveTaskOutOfCompleted} from './google-sheets.js';
import {authorize, fetchStartPageToken} from './google-basic.js'
import { yearMonthDay } from './helper-functions.js';

// const dataKeys = [['Date Created', 'Date Due', 'Time Duration Goal', 'Time Remaining', 'Completed', 'Currently Active']];
const dataKeys = ['Date Created', 'Date Due', 'Time Duration Goal', 'Time Remaining', 'Title', 'Description', 'Completed', 'Currently Active'];
const testData = [['=DATE(2023, 12, 22)', '=DATE(2023, 12, 22)', '=TIME(2, 36, 12)', '=TIME(1, 2, 0)', '=ASC("Hi")', '=ASC("Description")', '=FALSE()', '']];
// =DATE(year, month, day)
// =TIME(hour, minute, second)

const auth = await authorize();

// const [spreadsheetId, folderId, sheetList, response] = await initialSetup(auth, dataKeys);
const [spreadsheetId, folderId, sheetList] = ["1OjFCrP8p6L4mTg_heUT8IsbPr52sNLt2ADA67awXmPI", "1P1qjG4hyMEeTMiii7D7FjOtQVLGH2--0", [['Upcoming',503146031],['Current',865506259],['Completed',1525419396]]]
console.log("Sheet List: " + sheetList);

// for (let i = 0; i < 10; i++) {
//   testData[0][1] = `=DATE(2023, 12, ${22 + i})`;
//   if (i % 2 == 0) {
//     testData[0][6] = '=TRUE()'
//   } else{
//     testData[0][6] = '=FALSE()'
//   }
//   const a = await appendData(auth, spreadsheetId, sheetList[1][0], testData); // Don't run append one after another too fast!!
//   console.log(await readData(auth, spreadsheetId, sheetList[1][0]));
//   console.log("------");
// }

// await moveCompletedTasks(auth, spreadsheetId, sheetList[1][1], sheetList[1][0], sheetList[2][1], sheetList[2][0]);
// await markAsComplete(auth, spreadsheetId, 1, sheetList[1][1], sheetList[1][0], sheetList[2][1], sheetList[2][0], true);
const driveToken = await (fetchStartPageToken(auth, spreadsheetId));

// let date = new Date();  // TODO — Make sure to have the system be notified when it's a new day and update today's date
// let formattedDate = yearMonthDay(date);
// await moveTaskOutOfCompleted(auth, spreadsheetId, 0, sheetList, `=DATE(${formattedDate})`, true);

// TODO — Logout function (probably in google-sheets.js)
// TODO — Create a file in google drive that checks for the correct folder (when they login from a new device) and checks if it was created by us (checks for .txt/.json file)
  // TODO - Actually, do both (txt file (or .md file) to explain the app to user and txt for validation code (ex: 200 (This is a security risk but in a later update, we can try something like a public and private key thing with the user's login value and whatnot))
  // TODO - Figured it out, just save the fileID of the folder that we created