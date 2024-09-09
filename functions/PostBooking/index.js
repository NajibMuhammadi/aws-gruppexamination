const { sendResponse, sendError } = require('../../responses/index')
const { db } = require('../../services/index');
const { v4: uuid } = require('uuid');

exports.handler = async (event) => {


    if (!event.body) {
        console.error('No data sent');
        return sendError(400, { message: 'No data sent' });
    }

    const body = JSON.parse(event.body);
    const booking = body.booking || body;
    console.log('Booking:', booking);

    if (!booking.RoomID || !booking.NrGuests || !booking.NrNights) {
        console.error('Missing required fields:', booking);
        return sendError(400, { message: 'Missing required fields' });
    }

    const bookingID = uuid().substring(0, 6);

    try {
        const { Items } = await db.scan({
            TableName: 'rooms-db',
        });

        const room = Items.find((room) => room.RoomID === booking.RoomID);
        
        if (!room) {
            console.error('Room not found:', booking.RoomID);
            return sendError(404, { message: 'Room not found' });
        }

        booking.TotalPrice = room.Price * booking.NrNights;

        await db.put({
            TableName: 'bookings-db',
            Item: {
                BookingID: bookingID,
                RoomID: booking.RoomID,
                NrGuests: booking.NrGuests,
                NrNights: booking.NrNights,
                TotalPrice: booking.TotalPrice,
            }
        });
        return sendResponse(200, { success: true, message: 'Booking added successfully!' });
    } catch (error) {
        console.error('Error in handler:', error);
        return sendError(500, { message: 'An internal server error occurred' });
    }
}