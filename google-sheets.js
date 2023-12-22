const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const { write } = require('fs');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
// const GOOGLE_APPLICATION_CREDENTIALS = path.join(process.cwd(), 'service.json');
let isPromisePending = [];

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function readData(auth, ssID, sheetName = 'current', range = 'A2:E') {
  isPromisePending.push(true);
  const sheets = google.sheets({version: 'v4', auth});
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: ssID,
    range: `${sheetName}!${range}`,
  });
  const rows = res.data.values;
  return rows;
  // if (!rows || rows.length === 0) {
  //   console.log('No data found.');
  //   return;
  // }
  // // console.log('Name, Major:');
  // rows.forEach((row) => {
  //   // Print columns A and E, which correspond to indices 0 and 4.
  //   // console.log(`${row[0]}, ${row[4]}`);
  //   row.forEach(
  //     (element) => {
  //       process.stdout.write(element + "\t");
  //     }
  //   );
  //   console.log();
  // });
}

async function appendData(auth, ssID, sheetName, values) {
  const sheets = google.sheets({ version: 'v4', auth });

  const resource = {
    values,
  };
  sheets.spreadsheets.values.append(
    {
      spreadsheetId: ssID,
      range: `${sheetName}!A2`,
      valueInputOption: 'USER_ENTERED',
      resource: resource,
    },
    (err, result) => {
      if (err) {
        // Handle error
        console.log(err);
      } else {
        console.log(
          '%d cells updated on range: %s',
          result.data.updates.updatedCells,
          result.data.updates.updatedRange
        );
      }
    }
  );
}

async function createNewSheetTab(auth, ssID) { // TODO - Add title param and color obj
  const {google} = require('googleapis');

  const service = google.sheets({ version: 'v4', auth });
  const requests = [];

  const title = 'current';
  const title1 = 'time management';
  const spreadsheetId = ssID;

  // Change the spreadsheet's title.
  requests.push({
    updateSpreadsheetProperties: {
      properties: {
        "title": title1,
      },
      fields: 'title',
    },
  });

  // Add new sheet to spreadsheet .
  requests.push({
    addSheet: {     // NOT AddSheetRequest
      properties: {
          "title": title,
          "tabColor": {
            "red": 0.2,
            "green": 1,
            "blue": 0.2,
            "alpha": 1
          }
      },
    },
  });
  // Add additional requests (operations) ...
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

async function deleteSheetTab(auth, ssID, sheetTabID) {
  const {google} = require('googleapis');

  const service = google.sheets({ version: 'v4', auth });
  const requests = [];

  requests.push({
    deleteSheet: {
      sheetId: sheetTabID
    }
  });

  const batchUpdateRequest = {requests};
  try {
    const response = await service.spreadsheets.batchUpdate({
      spreadsheetId: ssID,
      resource: batchUpdateRequest,
    });
    return response;
  } catch (err) {
    throw err;
  }
}

async function deleteRow(auth, ssID, sheetTabID, rowNum) {
  const {google} = require('googleapis');

  const service = google.sheets({ version: 'v4', auth });
  const requests = [{
    deleteDimension: {
      range: {
        sheetId: sheetTabID,
        dimension: "ROWS",
        startIndex: rowNum - 1,
        endIndex: rowNum
      }
    }
  }];

  const batchUpdateRequest = {requests};
  try {
    const response = await service.spreadsheets.batchUpdate({
      spreadsheetId: ssID,
      resource: batchUpdateRequest,
    });
    return response;
  } catch (err) {
    throw err;
  }
}

// Assuming auth has already been generated
const getSheets = async (auth, spreadsheetId) => {
  const { google } = require("googleapis");

  const sheets = google.sheets({version: "v4", auth});
  const result = (await sheets.spreadsheets.get({
    spreadsheetId 
  })).data.sheets.map((sheet) => {
    return [sheet.properties.title, sheet.properties.sheetId]
  })
  return result
}

/**
 * Create a folder and prints the folder ID
 * @return{obj} folder Id
 * */
async function createFolder(auth, filename) {
  // Get credentials and build service
  // TODO (developer) - Use appropriate auth mechanism for your app
  const {google} = require('googleapis');

  const service = google.drive({version: 'v3', auth});

  const fileMetadata = {
    name: filename,
    mimeType: 'application/vnd.google-apps.folder',
  };
  try {
    const file = await service.files.create({
      resource: fileMetadata,
      fields: 'id',
      properties: {
        folderColorRgb: "330033"
      }
    });
    console.log('Folder Id:', file.data.id);
    return file.data.id;
  } catch (err) {
    // TODO(developer) - Handle error
    throw err;
  }
}

/**
 * Change the file's modification timestamp.
 * @param{string} fileId Id of the file to move
 * @param{string} folderId Id of the folder to move
 * @return{obj} file status
 * */
async function moveFileToFolder(auth, fileId, folderId) {
  const {google} = require('googleapis');

  const service = google.drive({version: 'v3', auth});

  try {
    // Retrieve the existing parents to remove
    const file = await service.files.get({
      fileId: fileId,
      fields: 'parents',
    });

    // Move the file to the new folder
    const previousParents = file.data.parents
        .join(',');
    const files = await service.files.update({
      fileId: fileId,
      addParents: folderId,
      removeParents: previousParents,
      fields: 'id, parents',
    });
    console.log(files.status);
    return files.status;
  } catch (err) {
    // TODO(developer) - Handle error
    throw err;
  }
}

/**
 * Create a google spreadsheet
 * @param {string} title Spreadsheets title
 * @return {string} Created spreadsheets ID
 */
async function create(auth, title) { // So things google says is async NEEDS to be async (good to know I guess)
    const {google} = require('googleapis');

    const service = google.sheets({version: 'v4', auth});
    const resource = {
      properties: {
        title,
      },
    };
    try {
      const spreadsheet = await service.spreadsheets.create({
        resource,
        fields: 'spreadsheetId',
      });
      console.log(`Spreadsheet ID: ${spreadsheet.data.spreadsheetId}`);
      return `${spreadsheet.data.spreadsheetId}`;
    } catch (err) {
      // TODO (developer) - Handle exception
      throw err;
    }
}

/**
 * Updates values in a Spreadsheet.
 * @param {string} spreadsheetId The spreadsheet ID.
 * @param {string} range The range of values to update.
 * @param {object} valueInputOption Value update options.
 * @param {(string[])[]} values A 2d array of values to update.
 * @return {obj} spreadsheet information
 */
async function updateValues(auth, spreadsheetId, sheetName, range, valueInputOption, values) {
  const {google} = require('googleapis');

  const service = google.sheets({version: 'v4', auth});
  const resource = {
    values,
  };
  try {
    const result = await service.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${range}`,
      valueInputOption,
      resource,
    });
    console.log('%d cells updated.', result.data.updatedCells);
    return result;
  } catch (err) {
    // TODO (Developer) - Handle exception
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
async function moveCompletedTasks(auth, spreadsheetId, sheetFrom, sheetFromName, sheetTo, sheetToName) {
  const {google} = require('googleapis');

  // Reading 'Completed' row of 'sheetFrom'
  let completedChecklist;
  let completedDataList = [];
//   const tryThis = () => {
    readData(auth, spreadsheetId, sheetFromName, 'A2:E').then(
            (value) => {
                completedChecklist = value;
                isPromisePending.pop();
                console.log(completedChecklist);
                for (let i = 0; i < completedChecklist.length; i++) {
                  if (completedChecklist[i][4] == 'TRUE') {
                      completedDataList.push(completedChecklist[i]);
                      // Delete each completed row
                      deleteRow(auth, spreadsheetId, sheetFrom, i+2);
                  }
                }
                console.log(completedDataList);

                // TODO - Saving data of each row of the tasks that have been completed
                // TODO - Once promise is completed, THEN complete message is sent, and then the next code can be completed
                appendData(auth, spreadsheetId, sheetToName, completedDataList);
            }
        )
    // .catch(tryThis());
//   }

  // TODO - TRY RUNNING ALL THE COMMANDS INSIDE OF THE readData .then() function!!!!!!
  // TODO - Implement something so that it waits for promise to stop pending... (if pending takes too long, then let the user know if they wanna wait longer or just stop)
//   setTimeout(() => {
//     console.log(completedChecklist);
//     for (let i = 0; i < completedChecklist.length; i++) {
//       if (completedChecklist[i][4] == 'TRUE') {
//         completedDataList.push(completedChecklist[i]);
//         // Delete each completed row
//         deleteRow(auth, spreadsheetId, sheetFrom, i+2);
//       }
//     }
//     console.log(completedDataList);

//     // TODO - Saving data of each row of the tasks that have been completed
//     // TODO - Once promise is completed, THEN complete message is sent, and then the next code can be completed
//     appendData(auth, spreadsheetId, sheetToName, completedDataList);
//   }, 1000);
  return 200; // Code 200 means successful
}

/**
 *
 * @param {string} auth
 * @param {int} taskNum
 * @param {int} sheetId
 * @param {string} sheetName
 * @param {boolean} moveToCompletedTabOrNot
 */
async function markedAsComplete(auth, spreadsheetId, taskNum, sheetFrom, sheetFromName, sheetTo, sheetToName, moveToCompletedTabOrNot = false) {
    // TODO — I have an IDEA, Don't even have a "completed" tab, just move the task immediately to the "completed" tab
    updateValues(auth, spreadsheetId, sheetFrom, `E${taskNum}:E${taskNum}`, "USER_ENTERED", "=TRUE()");

    if (moveToCompletedTabOrNot) {
      moveCompletedTasks(auth, spreadsheetId, sheetFrom, sheetFromName, sheetTo, sheetToName);
    }

  // TODO — So in the countdown function, run this function once the timer reaches 0
  // TODO - The counting down functionality is handled by the device (and we are periodically going to update it on the spreadsheet (We have a limit of 10 per second))
  return 200;
}

//TODO — Write Function that detects if changes have been made to the file (https://developers.google.com/drive/api/guides/manage-changes)

const authorization = authorize();
// let ssID;
let ssID = '1o9m8Lp6UnxyrzEYFIh0LYw4sXPKQv4k3bzFl5bOmHqk';
let dataKeys = [['Date Created', 'Date Due', 'Time Duration Goal', 'Time Remaining', 'Completed', 'Currently Active']]; // TODO - When a different device sees "currently active" is true, then run that task (count down the timer)
let sheetIDList;
let testDrive;
// authorization.then(
//   (auth) => {
//     return create(auth, "finally2");
//   }
// ).then((id) => {console.log(ssID= id);}).catch(console.error);

// setTimeout(() => {
//   // console.log(ssID);
//   authorization.then(
//     (auth) => {
//       return appendData(auth, ssID, dataKeys);
//     }
//   ).catch(console.error);
// }, 1000);

// setTimeout(() => {
//   authorization.then(
//     (auth) => {readData(auth, ssID);}
//     ).catch(console.error);
// }, 2000);

// setTimeout(() => {
//   authorization.then(
//     (auth) => {
//       // deleteSheetTab(auth, ssID, 2087531897);  // TODO - Figure out how to list all tabs and their corresponding sheetTabID
//       return getSheets(auth, ssID);
//     }
//   ).then((a) => {sheetIDList = a; console.log(sheetIDList)}).catch(console.error);
// }, 3000);

// setTimeout(() => {
//   console.log(sheetIDList);
//   authorization.then(
//     (auth) => {
//       return createFolder(auth, "Time Management");
//     }
//   ).then((fileID) => {testDrive = fileID}).catch(console.error);
// }, 4000);

// setTimeout(() => {
//   authorization.then(
//     (auth) => {
//       moveFileToFolder(auth, ssID, testDrive);
//     }
//   ).catch(console.error);
// }, 5000);

// setTimeout(() => {
//   authorization.then(
//     (auth) => {createNewSheetTab(auth, ssID);}
//   ).catch(console.error);
// }, 3000);

// setTimeout(() => {
//   authorization.then(
//     (auth) => {
//       // console.log(test[0][1])
//       deleteRow(auth, ssID, sheetIDList[0][1], 1);
//     }
//   ).catch(console.error);
// }, 5000);

// setTimeout(() => {
//   authorization.then(
//     (auth) => {
//       updateValues(auth, ssID, `${sheetIDList[0][0]}!A2:D`, 'USER_ENTERED', [['Hey', 'I', 'Did','It'], ['Did', 'This', 'Change', 'Too?']]);
//     }
//   ).catch(console.error);
// }, 5000);


authorization.then(
    (auth) => {
      // deleteSheetTab(auth, ssID, 2087531897);  // TODO - Figure out how to list all tabs and their corresponding sheetTabID
      return getSheets(auth, ssID);
    }
).then((a) => {sheetIDList = a; console.log(sheetIDList)}).catch(console.error);
setTimeout(() => {
  authorization.then(
    (auth) => {
      moveCompletedTasks(auth, ssID, sheetIDList[1][1], sheetIDList[1][0], sheetIDList[2][1], sheetIDList[2][0]);
    }
  ).catch(console.error);

  authorization.then(
    (auth) => {
      console.log(markedAsComplete(auth, ssID, 2, sheetIDList[1][1], sheetIDList[1][0], sheetIdList[2][1], sheetIdList[2][0], true));
    }
  )
}, 2000);

//TODO - In the catch condition, (so when an error is thrown), try to execute the command again for like 15 seconds (once 5 seconds from time of execution, and once again 10 seconds, and a last time 25 seconds later) or something just in case it's just a slow promise. If it still throws an error, then you can just stop then