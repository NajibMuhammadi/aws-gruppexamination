# **AWS Gruppexamination - Error 404**
Välkommen till BonzAi's superavancerade bokningsverktyg! Nedan finner du instructioner så du själv kan använda funktionerna på rätt sätt:

## Backgrund
För att detta ska fungera behövs en Rooms-db som du skapar i dynamoDB. bookings-db genereras automatiskt genom koden.

## Strukturen för **rooms-db** ser ut så här:

**Single rum:** 
```json {
  "RoomID": {
    "S": "Single"
  },
  "AvailableRooms": {
    "N": "7"
  },
  "NrGuests": {
    "N": "1"
  },
  "Price": {
    "N": "500"
  },
  "TotalRooms": {
    "N": "8"
  }
}```

**Double rum:**
```json {
  "RoomID": {
    "S": "Double"
  },
  "AvailableRooms": {
    "N": "8"
  },
  "NrGuests": {
    "N": "2"
  },
  "Price": {
    "N": "1000"
  },
  "TotalRooms": {
    "N": "8"
  }
}```

Suite:
```json {
  "RoomID": {
    "S": "Suite"
  },
  "AvailableRooms": {
    "N": "3"
  },
  "NrGuests": {
    "N": "3"
  },
  "Price": {
    "N": "1500"
  },
  "TotalRooms": {
    "N": "4"
  }
}```

Strukturen för **bookings-db** kommer att se ut så här när en order skapas. Se exempel nedan:

```json {
  "BookingID": {
    "S": "3abbc0"
  },
  "NrGuests": {
    "S": "1"
  },
  "NrNights": {
    "S": "1"
  },
  "RoomID": {
    "S": "Single"
  },
  "TotalPrice": {
    "N": "500"
  }
}```

# Endpoints

## **POST** Ny Bokning
Endpoint: /api/bookings

## **UPDATE** Bokning
Endpoint: /api/bookings/{id}

## **GET** Alla Bokningar
Endpoint: /api/bookings

## **DELETE** En Bokning
Endpoint: /api/bookings/{id}

Där det står {id} ska det ersättas med den riktiga BookingID som hittas i dynamoDB databasen Bookings-db. Finns inte bokningskoden eller koden är fel format så genereras fel.