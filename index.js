import {authorize, createSpreadsheet, createFolder, moveFileToFolder} from './google-sheets.js';

const dataKeys = [['Date Created', 'Date Due', 'Time Duration Goal', 'Time Remaining', 'Completed', 'Currently Active']];

const auth = await authorize();
const spreadsheetId = await createSpreadsheet(auth);
const folderId = await createFolder(auth);
await moveFileToFolder(auth, spreadsheetId, folderId);