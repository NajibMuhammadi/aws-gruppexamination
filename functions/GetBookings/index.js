const { sendResponse, sendError } = require('../../responses/index')
const { db } = require('../../services/index');

exports.handler = async (event) => {
    return sendResponse(200, { message: 'funkar jätte bra' });
};