/**
 * Returning 'commonjs''s require function in the 'module' type
 * @ese https://stackoverflow.com/questions/69099763/referenceerror-require-is-not-defined-in-es-module-scope-you-can-use-import-in
 * @see https://dev.to/caspergeek/how-to-use-require-in-ecmascript-modules-1l42
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');
const { write } = require('fs');
const { create } = require('domain');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/drive.appdata'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

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
 * Create a google spreadsheet
 * @param {string} title Spreadsheets title
 * @return {string} Created spreadsheets ID
 */
async function createSpreadsheet(auth, title = 'Time Management App', sheetNames = ['Upcoming', 'Current', 'Completed']) { // So things google says is async NEEDS to be async (good to know I guess)
    const service = google.sheets({version: 'v4', auth});
    const resource = {
        properties: {
            title,
        },
        sheets: [
            {
                properties: {
                    "title": sheetNames[0],
                    "tabColor": {
                            "red": 0.2,
                            "green": 0.2,
                            "blue": 1,
                            "alpha": 1
                        }
                }
            },
            {
                properties: {
                    "title": sheetNames[1],
                    "tabColor": {
                            "red": 0.2,
                            "green": 1,
                            "blue": 0.2,
                            "alpha": 1
                        }
                }
            },
            {
                properties: {
                    "title": sheetNames[2],
                    "tabColor": {
                            "red": 1,
                            "green": 0.2,
                            "blue": 0.2,
                            "alpha": 1
                        }
                }
            }
        ]
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
 * Create a folder and prints the folder ID
 * @return{obj} folder Id
 * */
async function createFolder(auth, filename = 'Time Management App') {
    const service = google.drive({version: 'v3', auth});

    const fileMetadata = {
        name: filename,
        mimeType: 'application/vnd.google-apps.folder',
        folderColorRgb: "#42d692",
    };
    try {
        const file = await service.files.create({
        resource: fileMetadata,
        fields: 'id',
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
        const previousParents = file.data.parents.join(',');
        const files = await service.files.update({
            fileId: fileId,
            addParents: folderId,
            removeParents: previousParents,
            fields: 'id, parents'
        });
        // console.log(files.status);
        return files.status;
    } catch (err) {
        // TODO(developer) - Handle error
        throw err;
    }
}

async function createNewSheetTab(auth, ssID) { // TODO - Add title param and color obj
    const service = google.sheets({ version: 'v4', auth });
    const requests = [];

    const title = 'current';
    const title1 = 'time management';
    const spreadsheetId = ssID;

    // Change the spreadsheet's title.
    // TODO - We Don't really need this, we just need to figure out how to rename the sheet when we create the sheet (OR the start could just be a batchUpdate)
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

// Assuming auth has already been generated
const getSheets = async (auth, spreadsheetId) => {
    const { google } = require("googleapis");

    const sheets = google.sheets({version: "v4", auth});
    const result = (await sheets.spreadsheets.get({
        spreadsheetId
    })).data.sheets.map((sheet) => {
        return [sheet.properties.title, sheet.properties.sheetId]
    })
    return result;
}

async function deleteSheetTab(auth, ssID, sheetTabID) {
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

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function readData(auth, spreadsheetId, sheetName = 'Current', range = 'A2:H') {
  const sheets = google.sheets({version: 'v4', auth});
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!${range}`,
    valueRenderOption: "FORMULA"
  });
  const rows = res.data.values;
  return rows;
}

async function appendData(auth, spreadsheetId, sheetName, values) {
  const sheets = google.sheets({ version: 'v4', auth });

  const resource = {
    values,
  };
  sheets.spreadsheets.values.append(
    {
      spreadsheetId,
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

async function deleteRow(auth, ssID, sheetTabID, rowNum) {
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

/**
 * Updates values in a Spreadsheet.
 * @param {string} spreadsheetId The spreadsheet ID.
 * @param {string} range The range of values to update.
 * @param {object} valueInputOption Value update options.
 * @param {(string[])[]} values A 2d array of values to update.
 * @return {obj} spreadsheet information
 */
async function updateValues(auth, spreadsheetId, sheetName, range, valueInputOption, values) {
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



/*
Google Drive Functions
*/
/**
 * Retrieve page token for the current state of the account.
 **/

/**
 * @param {*} auth
 * @param { string } spreadsheetId
 * @returns
 */
async function fetchStartPageToken(auth, spreadsheetId) {
  const service = google.drive({version: 'v3', auth});        // TODO — I think I can just use one of these (instead of constantly recreating this service). Should be passed in as a parameter (create service for googleDrive and googleSheets in `initialize`)
  try {
    const res = await service.changes.getStartPageToken({});
    const token = res.data.startPageToken;
    console.log('start token: ', token);
    return token;
  } catch (err) {
    // TODO(developer) - Handle error
    throw err;
  }
}

export {authorize, createSpreadsheet, createFolder, moveFileToFolder, getSheets, readData, appendData, updateValues, deleteRow, deleteSheetTab, createNewSheetTab, fetchStartPageToken};