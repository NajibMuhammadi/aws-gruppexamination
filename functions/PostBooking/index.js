const { sendResponse, sendError } = require('../../responses/index');
const { db } = require('../../services/index');  // Import the DynamoDB client
const { v4: uuid } = require('uuid');

exports.handler = async (event) => {
    if (!event.body) {
        console.error('No data sent');
        return sendError(400, { message: 'No data sent' });
    }

    const body = JSON.parse(event.body);
    const booking = body.booking || body;
    console.log('Booking:', booking);

    const { RoomID, NrGuests, NrNights } = booking;
    if (!RoomID || !NrGuests || !NrNights) {
        console.error('Missing required fields:', booking);
        return sendError(400, { message: 'Missing required fields' });
    }

    const bookingID = uuid().substring(0, 6);

    try {
        // Fetch all room details
        const { Items: rooms } = await db.scan({
            TableName: 'rooms-db',
        });

        // Parse DynamoDB data types
        const parsedRooms = rooms.map(room => ({
            RoomID: room.RoomID.S,
            AvailableRooms: Number(room.AvailableRooms.N),
            NrGuests: Number(room.NrGuests.N),
            Price: Number(room.Price.N),
            TotalRooms: Number(room.TotalRooms.N)
        }));

        // Sort rooms by capacity (largest first)
        const sortedRooms = parsedRooms.sort((a, b) => b.NrGuests - a.NrGuests);

        let remainingGuests = NrGuests;
        const allocatedRooms = [];

        // Allocate rooms
        for (const room of sortedRooms) {
            if (remainingGuests <= 0) break;

            // Determine how many rooms of this type are needed
            const roomsNeeded = Math.ceil(remainingGuests / room.NrGuests);

            // Check available rooms
            const availableRooms = Math.min(roomsNeeded, room.AvailableRooms);

            if (availableRooms > 0) {
                // Allocate the rooms
                allocatedRooms.push({
                    RoomID: room.RoomID,
                    NumberOfRooms: availableRooms,
                    GuestsPerRoom: room.NrGuests,
                    TotalGuests: availableRooms * room.NrGuests
                });

                // Update remaining guests
                remainingGuests -= availableRooms * room.NrGuests;

                // Update room availability
                await db.update({
                    TableName: 'rooms-db',
                    Key: { RoomID: room.RoomID },
                    UpdateExpression: 'SET AvailableRooms = AvailableRooms - :decrement',
                    ExpressionAttributeValues: { ':decrement': availableRooms }
                });
            }
        }

        if (remainingGuests > 0) {
            console.error('Unable to accommodate all guests');
            return sendError(400, { message: 'Unable to accommodate all guests' });
        }

        const totalPrice = allocatedRooms.reduce((total, { RoomID, NumberOfRooms }) => {
            const room = parsedRooms.find(r => r.RoomID === RoomID);
            return total + (room.Price * NrNights * NumberOfRooms);
        }, 0);

        // Save booking details
        await db.put({
            TableName: 'bookings-db',
            Item: {
                BookingID,
                RoomID,
                NrGuests: String(NrGuests),
                NrNights: String(NrNights),
                TotalPrice: String(totalPrice),
            }
        });

        return sendResponse(200, { success: true, message: 'Booking added successfully!' });
    } catch (error) {
        console.error('Error in handler:', error);
        return sendError(500, { message: 'An internal server error occurred' });
    }
};