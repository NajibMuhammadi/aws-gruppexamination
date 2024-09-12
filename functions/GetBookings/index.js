const { sendResponse, sendError } = require('../../responses/index')
const { db } = require('../../services/index');

exports.handler = async (event) => {
    try {
        const data = await db.scan({
            TableName: 'bookings-db',
            FilterExpression: 'attribute_exists(#DYNOBASE_BookingID)',
            ExpressionAttributeNames: {
                '#DYNOBASE_BookingID': 'BookingID'
            },
        });
        return sendResponse(200, { message: 'Following rooms are booked in BonzAi hotel: ', data: data.Items });
    } catch (error) {
        return sendError(404, { message: error.message });
    }
};