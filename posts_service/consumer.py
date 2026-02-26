import aio_pika
import asyncio
import json
from sqlalchemy.future import select
from sqlalchemy.dialects.postgresql import insert
from . import database, models

RABBITMQ_URL = "amqp://guest:guest@localhost:5672/"

async def process_message(message: aio_pika.IncomingMessage):
    async with message.process():
        body = message.body.decode()
        data = json.loads(body)
        
        event = data.get("event")
        user_data = data.get("data")
        
        if event in ["user_created", "user_updated"]:
            print(f"Received event: {event} with data: {user_data}")
            async with database.AsyncSessionLocal() as session:
                async with session.begin():
                    # Upsert logic (Insert or Update)
                    # For PostgreSQL we can use on_conflict_do_update usually, 
                    # but here straightforward logic works too since we mirror.
                    # Or better: standard merge/upsert.
                    
                    # Using PostgreSQL specific upsert
                    stmt = insert(models.User).values(
                        id=user_data["id"],
                        email=user_data["email"],
                        username=user_data["username"]
                    )
                    
                    # If conflict on primary key (id), update the columns
                    stmt = stmt.on_conflict_do_update(
                        index_elements=['id'],
                        set_=dict(
                            email=user_data["email"],
                            username=user_data["username"]
                        )
                    )
                    
                    await session.execute(stmt)
                    await session.commit()
                    print(f"Processed user {user_data['id']}")

async def consume_events():
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    queue_name = "posts_service_users_queue"
    
    async with connection:
        channel = await connection.channel()
        
        # Declare exchange (must match producer)
        exchange = await channel.declare_exchange(
            "user_events", aio_pika.ExchangeType.FANOUT
        )
        
        # Declare queue
        queue = await channel.declare_queue(queue_name, durable=True)
        
        # Bind queue to exchange
        await queue.bind(exchange, routing_key="")
        
        # Start consuming
        await queue.consume(process_message)
        
        print("Waiting for messages...")
        await asyncio.Future() # Run forever
