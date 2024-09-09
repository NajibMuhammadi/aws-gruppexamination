const { sendResponse, sendError } = require('../../responses/index')
const { db } = require('../../services/index');

exports.handler = async (event) => {
    try {
        const { Items } = await db.scan({
            TableName: 'rooms-db',
        })
        if (Items) {
            return sendResponse(200, Items)
        } else {
            return sendError(404, {succes : false, message : 'No items found'})
        }
    } catch (error) {
        return sendError(404, {succes : false, message: error.message})
    }
};