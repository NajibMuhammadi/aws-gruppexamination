const { sendResponse, sendError } = require('../../responses/index');
const { db } = require('../../services/index');
const { v4: uuid } = require('uuid');

exports.handler = async (event) => {
    if (!event.body) {
        return sendError(400, { message: 'No data sent' });
    }

    const body = JSON.parse(event.body);
    const booking = body.booking || body;

    if (!booking.NrGuests || !booking.NrNights) {
        return sendError(400, { message: 'Missing required fields' });
    }
    const allowedFields = ['NrGuests', 'NrNights'];
    const invalidFields = Object.keys(booking).filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
        return sendError(400, { message: `Ogiltiga fält: ${invalidFields.join(', ')}` });
    }
    const bookingID = uuid().substring(0, 6);

    try {
        const { Items } = await db.scan({ TableName: 'rooms-db' });
        const totalAvailableRooms = Items.reduce((total, room) => {
            return total + (room.AvailableRooms * room.NrGuests);
        }, 0);

        if (booking.NrGuests > totalAvailableRooms) {
            return sendError(404, { message: 'Not enough rooms available.' });
        }

        const roomsByType = {
            Suite: Items.find((room) => room.RoomID === 'Suite' && room.AvailableRooms > 0),
            Double: Items.find((room) => room.RoomID === 'Double' && room.AvailableRooms > 0),
            Single: Items.find((room) => room.RoomID === 'Single' && room.AvailableRooms > 0)
        };

        let remainingGuests = booking.NrGuests;
        let totalPrice = 0;
        let roomsToBook = [];

        ({ remainingGuests, totalPrice } = await bookRooms(remainingGuests, roomsByType.Suite, 3, booking.NrNights, roomsToBook, totalPrice));
        ({ remainingGuests, totalPrice } = await bookRooms(remainingGuests, roomsByType.Double, 2, booking.NrNights, roomsToBook, totalPrice));
        ({ remainingGuests, totalPrice } = await bookRooms(remainingGuests, roomsByType.Single, 1, booking.NrNights, roomsToBook, totalPrice));

        if (remainingGuests > 0) {
            return sendError(404, { message: 'Not enough rooms available.' });
        }

        await db.put({
            TableName: 'bookings-db',
            Item: {
                BookingID: bookingID,
                NrGuests: booking.NrGuests,
                NrNights: booking.NrNights,
                TotalPrice: totalPrice,
                RoomID: roomsToBook,
            }
        });

        return sendResponse(200, {
            success: true,
            message: 'Booking added successfully',
            bookingDetails: {
                BookingID: bookingID,
                NrGuests: booking.NrGuests,
                NrNights: booking.NrNights,
                TotalPrice: totalPrice,
                RoomID: roomsToBook
            }
        });
    } catch (error) {
        console.error('Error:', error);
        return sendError(500, { message: 'An internal server error occurred' });
    }
};

const bookRooms = async (remainingGuests, roomType, guestsPerRoom, NrNights, roomsToBook, totalPrice) => {
    while (remainingGuests >= guestsPerRoom && roomType) {
        roomsToBook.push(roomType.RoomID);
        totalPrice += roomType.Price * NrNights; 
        remainingGuests -= guestsPerRoom;
        await updateRoomAvailability(roomType.RoomID, 1);

        const { Items } = await db.scan({ TableName: 'rooms-db' });
        roomType = Items.find((room) => room.RoomID === roomType.RoomID && room.AvailableRooms > 0);
    }
    return { remainingGuests, totalPrice };
};

const updateRoomAvailability = async (roomID, decrement) => {
    await db.update({
        TableName: 'rooms-db',
        Key: { RoomID: roomID },
        UpdateExpression: 'SET AvailableRooms = AvailableRooms - :decrement',
        ExpressionAttributeValues: { ':decrement': decrement },
        ConditionExpression: 'AvailableRooms >= :decrement'
    });
};
