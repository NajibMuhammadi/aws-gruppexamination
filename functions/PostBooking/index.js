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

        let room = Items.find((room) => room.RoomID === booking.RoomID && room.AvailableRooms > 0);
        
        if (room && room.NrGuests < booking.NrGuests) {
            if (booking.NrGuests === 1) {
                room = Items.find((room) => room.RoomID === 'Single' && room.AvailableRooms > 0);
            } else if (booking.NrGuests === 2) {
                room = Items.find((room) => room.RoomID === 'Double' && room.AvailableRooms > 0);
            } else if (booking.NrGuests === 3) {
                room = Items.find((room) => room.RoomID === 'Suite' && room.AvailableRooms > 0);
            } else {
                return sendError(404, { message: 'No available rooms' });
            }
        }

        if (room.AvailableRooms > 0) {
            await db.update({
                TableName: 'rooms-db',
                Key: { RoomID: room.RoomID },
                UpdateExpression: 'SET AvailableRooms = AvailableRooms - :decrement',
                ExpressionAttributeValues: { ':decrement': 1 },
                ReturnValues: 'UPDATED_NEW'
            });
        } else {
            return sendError(404, { message: 'No available rooms' });
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