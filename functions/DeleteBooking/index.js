const { sendResponse, sendError } = require('../../responses/index')
const { db } = require('../../services/index');

exports.handler = async (event) => {
    //Ta värdet av id från pathParameters och tilldela det till en ny variabel som heter BookingID
    const { id: BookingID } = event.pathParameters;

    if(!BookingID) {
        return sendError(404, { success: false, message: 'Wrong booking code!' })
    }

    try {

        const result = await db.get({
            TableName: 'test-bookings-db',
            Key: { BookingID }
        })

        if(!result.Item) {
            return sendError(404, { success: false, message: `No booking found with booking ID ${BookingID}` });
        }
        
        await db.delete({
            TableName: 'test-bookings-db',
            Key: { BookingID: BookingID }
        });

        return sendResponse(200, { success: true, message: `Your booking with booking number ${BookingID} has been cancelled.` })

    } catch (error) {
        return sendError(404, { success: false, message: error.message });
    }
}
