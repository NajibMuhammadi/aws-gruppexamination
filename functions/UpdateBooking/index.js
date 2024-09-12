const { sendResponse, sendError } = require('../../responses/index');
const { db } = require('../../services/index');

exports.handler = async (event) => {
    const { body, pathParameters } = event;

    if (!body) {
        return sendError(400, { message: 'No data sent' });
    }

    let booking;
    try {
        booking = JSON.parse(body).booking || JSON.parse(body);
    } catch (error) {
        return sendError(400, { message: 'Invalid JSON format' });
    }

    const { NrGuests, NrNights } = booking;
    const bookingID = pathParameters.id;

    if (!NrGuests || !NrNights) {
        return sendError(400, { message: 'Information saknas i fälten. Kolla gitrepot och gör om :)' });
    }

    try {
        const bookingResult = await db.get({
            TableName: 'bookings-db',
            Key: { BookingID: bookingID },
        });
        const existingBooking = bookingResult.Item;

        if (!existingBooking) {
            return sendError(404, { message: 'Bokningen kunde ej hittas, kontrollera din ID och försök igen.' });
        }

        const roomsResult = await db.scan({ TableName: 'rooms-db' });
        const rooms = roomsResult.Items;

        for (const roomID of existingBooking.RoomID) {
            const roomToRestore = rooms.find(r => r.RoomID === roomID);
            if (roomToRestore) {
                roomToRestore.AvailableRooms += 1;
                await db.put({ TableName: 'rooms-db', Item: roomToRestore });
            }
        }

        await db.delete({
            TableName: 'bookings-db',
            Key: { BookingID: bookingID },
        });

        let selectedRooms = [];
        let remainingGuests = NrGuests;

        const sortedRooms = rooms.sort((a, b) => b.NrGuests - a.NrGuests);

        for (const room of sortedRooms) {
            while (room.AvailableRooms > 0 && remainingGuests > 0) {
                if (remainingGuests >= room.NrGuests) {
                    selectedRooms.push(room);
                    remainingGuests -= room.NrGuests;
                    room.AvailableRooms -= 1;
                    await db.put({ TableName: 'rooms-db', Item: room });
                } else {
                    break;
                }
            }
        }

        if (remainingGuests > 0) {
            return sendError(400, { message: 'Det finns inte tillräckligt med rum för antalet gäster du försöker boka.' });
        }

        const totalPrice = selectedRooms.reduce((sum, room) => sum + room.Price * NrNights, 0);

        const newBooking = {
            BookingID: bookingID,
            NrGuests,
            NrNights,
            RoomID: selectedRooms.map(room => room.RoomID),
            TotalPrice: totalPrice,
        };

        await db.put({ TableName: 'bookings-db', Item: newBooking });

        const roomDetails = selectedRooms.map(room => `${room.NrGuests}-säng ${room.RoomType}`).join(', ');
        const message = `Din bokning har uppdaterats!`;

        return sendResponse(200, { success: true, message: message });

    } catch (error) {
        return sendError(500, { message: 'Internal server error' });
    }
};
