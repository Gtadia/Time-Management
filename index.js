import {moveCompletedTasks, markAsComplete, initialSetup, moveTaskOutOfCompleted} from './google-sheets.js';
import {authorize} from './google-sheets-basic.js'
// const dataKeys = [['Date Created', 'Date Due', 'Time Duration Goal', 'Time Remaining', 'Completed', 'Currently Active']];
const dataKeys = ['Date Created', 'Date Due', 'Time Duration Goal', 'Time Remaining', 'Title', 'Description', 'Completed', 'Currently Active'];
const testData = [['=DATE(2023, 12, 22)', '=DATE(2023, 12, 22)', '=TIME(2, 36, 12)', '=TIME(1, 2, 0)', '=ASC("Hi")', '=ASC("Description")', '=FALSE()', '']];
// =DATE(year, month, day)
// =TIME(hour, minute, second)

const auth = await authorize();

// const [spreadsheetId, folderId, sheetList, response] = await initialSetup(auth, dataKeys);
const [spreadsheetId, folderId, sheetList] = ["1OjFCrP8p6L4mTg_heUT8IsbPr52sNLt2ADA67awXmPI", "1P1qjG4hyMEeTMiii7D7FjOtQVLGH2--0", [['Upcoming',503146031],['Current',865506259],['Completed',1525419396]]]
console.log("Spreadsheet ID: " + spreadsheetId);
console.log("Folder ID: " + folderId);
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
// console.log(await readData(auth, spreadsheetId, sheetList[1][0]));
// // const s = await markAsComplete(auth, spreadsheetId, 1, sheetList[1][1], sheetList[1][0], sheetList[2][1], sheetList[2][0], true);
// const d = await moveCompletedTasks(auth, spreadsheetId, sheetList[1][1], sheetList[1][0], sheetList[2][1], sheetList[2][0]);
// console.log(d);
// // TODO - Make sure to also remove the task from the local list so that the row numbers match
// console.log(await readData(auth, spreadsheetId, sheetList[1][0]));
// setTimeout(
//   () => {
let date = new Date();
function yearMonthDay(date) {
  let mm = date.getMonth() + 1;  // getMonth() starts at 0
  let dd = date.getDate();
  let yyyy = date.getFullYear();

  return `${yyyy}, ${(mm>9 ? '' : '0') + mm},
  ${(dd>9 ? '' : '0') + dd}`;
}
date = yearMonthDay(date);

    await moveTaskOutOfCompleted(auth, spreadsheetId, 0, sheetList, `=DATE(${date})`, true);
//   }, 3000
// );
