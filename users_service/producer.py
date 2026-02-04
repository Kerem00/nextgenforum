import aio_pika
import json

RABBITMQ_URL = "amqp://guest:guest@localhost:5672/"

async def publish_event(event_type: str, data: dict):
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    async with connection:
        channel = await connection.channel()
        
        # Declare exchange
        exchange = await channel.declare_exchange(
            "user_events", aio_pika.ExchangeType.FANOUT
        )

        message = aio_pika.Message(
            body=json.dumps({"event": event_type, "data": data}).encode(),
            content_type="application/json"
        )

        await exchange.publish(message, routing_key="")
