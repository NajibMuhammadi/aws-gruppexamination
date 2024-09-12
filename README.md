# **AWS Gruppexamination - Error 404**
Välkommen till BonzAi's superavancerade bokningsverktyg! Nedan finner du instruktioner så du själv kan använda funktionerna på rätt sätt:

## Backgrund
För att detta ska fungera behövs detta:

- Rooms-db som du skapar i AWS dynamoDB.

- bookings-db genereras automatiskt genom koden. Dock så behöver du lägga till lite extra kod i din .yml fil. På samma nivå som provider och functions ska du lägga till resources:
```yaml
resources:
  Resources:
    EventsTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: 'bookings-db'
        AttributeDefinitions:
          - AttributeName: 'BookingID'
            AttributeType: 'S'
        KeySchema:
          - AttributeName: 'BookingID'  
            KeyType: HASH
        BillingMode: PAY_PER_REQUEST
```

- Vidare behöver YAML-filen (.yml) tillägg i provider- och functionsdelarna.

Provider section ska uppdateras så här för oss i norden och en IAM role som ger full access till DynamoDB och Lambda behövs:
```yaml
provider:
  name: aws
  runtime: nodejs20.x
  region: eu-north-1
  deploymentMethod: direct
  iam:
    role: Här klistrar du i arn-länken till din roll
```

För att verktyget ska fungera som väntat behöver du också redigera functions som ska se ut så här:
```yaml
functions:
  GetBookings:
    handler: functions/GetBookings/index.handler
    events:
      - httpApi:
          path: /api/bookings
          method: get
  PostBooking:
    handler: functions/PostBooking/index.handler
    events:
      - httpApi:
          path: /api/bookings
          method: post
  UpdateBooking:
    handler: functions/UpdateBooking/index.handler
    events:
      - httpApi:
          path: /api/bookings/{id}
          method: put
  DeleteBooking:
    handler: functions/DeleteBooking/index.handler
    events:
      - httpApi:
          path: /api/bookings/{id}
          method: delete
```

- Du behöver också installera **UUID** genom att, i projektet skriva *npm i uuid* i terminalen. Uuid används när en bokning genereras i bookings-db.

## Strukturen för **rooms-db** ser ut så här:
*Detta skapar du i DynamoDB på AWS*

**Single rum:** 
```json
 {
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
}
```

**Double rum:**
 ```json
 {
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
}
```

Suite:
 ```json
 {
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
}
```

Strukturen för **bookings-db** kommer att se ut så här när en order skapas. Se exempel nedan:

```json
{
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
}
```

# Endpoints

## **POST** Ny Bokning
Endpoint: /api/bookings
JSON body exempel: 
  ```json
{
    "NrGuests": 12,
    "NrNights": 1
  }
```
  eller
  ```json
  {
  "booking": {
    "NrGuests": 12,
    "NrNights": 1
  }
  }
```
  Response true exempel:
  ```json
  {
	"success": true,
	"message": "Booking added successfully",
	"bookingDetails": {
		"BookingID": "d788fe",
		"NrGuests": 12,
		"NrNights": 1,
		"TotalPrice": 6000,
		"RoomID": [
			"Suite",
			"Suite",
			"Suite",
			"Suite"
		]
	}
```
Response false exempel:
```json
{
	"success": false,
	"data": {
		"message": "Not enough rooms available."
	}
}
```
  
## **UPDATE** Bokning
Endpoint: /api/bookings/{id}
*{id} ersätts med bokningens faktiska id från bookings-db*

JSOn body exempel:
 ```json
{
    "NrGuests": 6,
    "NrNights": 1
 }
```
 eller
 ```json
{
  "booking": {
    "NrGuests": 6,
    "NrNights": 1
 }
 }
```
Response true exempel: 
```json
{
	"success": true,
	"message": "Din bokning har uppdaterats!"
}
```
Response false exempel:
```json
{
	"success": false,
	"data": {
		"message": "Bokningen kunde ej hittas, kontrollera din ID och försök igen."
	}
}
```

## **GET** Alla Bokningar
Endpoint: /api/bookings

Response exempel:
```json
{
	"message": "Following rooms are booked in BonzAi hotel: ",
	"data": [
		{
			"NrNights": 1,
			"TotalPrice": 3000,
			"RoomID": [
				"Suite",
				"Suite"
			],
			"BookingID": "d788fe",
			"NrGuests": 6
		}
	]
}
```

## **DELETE** En Bokning
Endpoint: /api/bookings/{id}
*{id} ersätts med den faktiska id'n från bookings-db*

Response true exempel:
```json
{
	"success": true,
	"message": "Your booking with booking number d788fe has been cancelled."
}
```

Response false exempel:
```json
{
	"success": false,
	"data": {
		"success": false,
		"message": "No booking found with booking ID d788fe"
	}
}
```
