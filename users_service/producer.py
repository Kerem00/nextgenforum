import aio_pika
import json
import asyncio

import os

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

_connection = None
_channel = None

async def get_channel():
    global _connection, _channel
    if _connection is None or _connection.is_closed:
        _connection = await aio_pika.connect_robust(RABBITMQ_URL)
        _channel = await _connection.channel()
        # Declare exchange once
        await _channel.declare_exchange(
            "user_events", aio_pika.ExchangeType.FANOUT
        )
    return _channel

async def publish_event(event_type: str, data: dict):
    try:
        # Use a timeout to prevent hanging the whole request if RabbitMQ is down
        async with asyncio.timeout(3.0):
            channel = await get_channel()
            # Redeclaring is idempotent and safer than get_exchange in some pika versions
            exchange = await channel.declare_exchange(
                "user_events", aio_pika.ExchangeType.FANOUT
            )

            message = aio_pika.Message(
                body=json.dumps({"event": event_type, "data": data}).encode(),
                content_type="application/json"
            )

            await exchange.publish(message, routing_key="")
    except Exception as e:
        print(f"Failed to publish event {event_type}: {e}")
        # We don't raise here to prevent the main user action from failing 
        # just because the event bus is slow/down (eventual consistency)
