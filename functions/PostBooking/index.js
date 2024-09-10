const { sendResponse, sendError } = require('../../responses/index');
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

    // Kontrollera att nödvändiga fält är med
    if (!booking.NrGuests || !booking.NrNights) {
        console.error('Missing required fields:', booking);
        return sendError(400, { message: 'Missing required fields' });
    }

    const bookingID = uuid().substring(0, 6);

    try {
        // Hämta tillgängliga rum från DynamoDB
        const { Items } = await db.scan({
            TableName: 'rooms-db',
        });

        // Group rooms by type and filter out unavailable ones
        const roomsByType = {
            Suite: Items.find((room) => room.RoomID === 'Suite' && room.AvailableRooms > 0),
            Double: Items.find((room) => room.RoomID === 'Double' && room.AvailableRooms > 0),
            Single: Items.find((room) => room.RoomID === 'Single' && room.AvailableRooms > 0)
        };

        let remainingGuests = booking.NrGuests;
        let totalPrice = 0;
        let roomsToBook = [];

        // Book Suites first
        while (remainingGuests > 0 && remainingGuests >= 3 && roomsByType.Suite) {
            let room = roomsByType.Suite;
            if (room && room.AvailableRooms > 0) {
                roomsToBook.push(room.RoomID);
                totalPrice += room.Price * booking.NrNights;
                remainingGuests -= 3;
                await updateRoomAvailability(room.RoomID, 1);
                // Re-fetch the available rooms to check for changes
                const { Items } = await db.scan({ TableName: 'rooms-db' });
                roomsByType.Suite = Items.find((room) => room.RoomID === 'Suite' && room.AvailableRooms > 0);
                continue;
            }
        }

        // Book Doubles next
        while (remainingGuests > 0 && remainingGuests >= 2 && roomsByType.Double) {
            let room = roomsByType.Double;
            if (room && room.AvailableRooms > 0) {
                roomsToBook.push(room.RoomID);
                totalPrice += room.Price * booking.NrNights;
                remainingGuests -= 2;
                await updateRoomAvailability(room.RoomID, 1);
                // Re-fetch the available rooms to check for changes
                const { Items } = await db.scan({ TableName: 'rooms-db' });
                roomsByType.Double = Items.find((room) => room.RoomID === 'Double' && room.AvailableRooms > 0);
                continue;
            }
        }

        // Book Singles last
        while (remainingGuests > 0 && roomsByType.Single) {
            let room = roomsByType.Single;
            if (room && room.AvailableRooms > 0) {
                roomsToBook.push(room.RoomID);
                totalPrice += room.Price * booking.NrNights;
                remainingGuests -= 1;
                await updateRoomAvailability(room.RoomID, 1);
                // Re-fetch the available rooms to check for changes
                const { Items } = await db.scan({ TableName: 'rooms-db' });
                roomsByType.Single = Items.find((room) => room.RoomID === 'Single' && room.AvailableRooms > 0);
                continue;
            }
        }

        // Check if all guests have been accommodated
        if (remainingGuests > 0) {
            return sendError(404, { message: 'Not enough rooms available to accommodate all guests' });
        }

        // När alla gäster är fördelade i rum, spara bokningen
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

        return sendResponse(200, { success: true, message: 'Booking added successfully!' });

    } catch (error) {
        console.error('Error in handler:', error);
        return sendError(500, { message: 'An internal server error occurred' });
    }
};

// Funktion för att uppdatera tillgängliga rum i DynamoDB
const updateRoomAvailability = async (roomID, decrement) => {
    try {
        await db.update({
            TableName: 'rooms-db',
            Key: { RoomID: roomID },
            UpdateExpression: 'SET AvailableRooms = AvailableRooms - :decrement',
            ExpressionAttributeValues: { ':decrement': decrement },
            ConditionExpression: 'AvailableRooms >= :decrement',
            ReturnValues: 'UPDATED_NEW'
        });
    } catch (error) {
        if (error.code === 'ConditionalCheckFailedException') {
            throw new Error('Room is no longer available');
        } else {
            throw error;
        }
    }
};
