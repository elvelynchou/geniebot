import os
import json
import asyncio
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import ApplicationBuilder, ContextTypes, MessageHandler, filters
import redis.asyncio as redis

# Load environment variables
load_dotenv()

# Configuration
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
# Default to DB 1 as per new standard
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/1")
REDIS_RESPONSE_KEY = "genie:response:outbox"
REDIS_USER_INBOX = "genie:user:inbox"

# Setup Logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

async def push_to_redis_inbox(data: dict):
    """Pushes the message payload directly to Redis."""
    try:
        r = redis.from_url(REDIS_URL, decode_responses=True)
        await r.rpush(REDIS_USER_INBOX, json.dumps(data))
        logging.info(f"Pushed message from {data.get('username', 'unknown')} to Redis")
    except Exception as e:
        logging.error(f"Failed to push to Redis: {e}")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handles incoming Telegram messages."""
    if not update.message or not update.message.text:
        return

    user = update.message.from_user
    payload = {
        "platform": "telegram",
        "chat_id": update.message.chat_id,
        "username": user.username or user.first_name,
        "text": update.message.text,
        "timestamp": update.message.date.timestamp()
    }
    
    await push_to_redis_inbox(payload)

async def poll_redis_responses(app):
    """Polls Redis for outgoing messages from Master."""
    try:
        # Connect to DB 1
        r = redis.from_url(REDIS_URL, decode_responses=True)
        logging.info(f"Connected to Redis at {REDIS_URL} for responses.")
        
        while True:
            try:
                # Wait for a message in the 'genie:response:outbox' list
                result = await r.blpop(REDIS_RESPONSE_KEY, timeout=1)
                
                if result:
                    _, data_str = result
                    try:
                        data = json.loads(data_str)
                        chat_id = data.get("chat_id")
                        msg_type = data.get("type", "text")
                        
                        if chat_id:
                            if msg_type == "photo":
                                photo_path = data.get("path")
                                caption = data.get("caption", "")
                                if os.path.exists(photo_path):
                                    with open(photo_path, 'rb') as photo:
                                        await app.bot.send_photo(chat_id=chat_id, photo=photo, caption=caption)
                                    logging.info(f"Successfully sent photo to chat_id: {chat_id}")
                                else:
                                    await app.bot.send_message(chat_id=chat_id, text=f"Error: Image file not found at {photo_path}")
                            else:
                                text = data.get("text")
                                if text:
                                    await app.bot.send_message(chat_id=chat_id, text=text)
                                    logging.info(f"Successfully sent text response to chat_id: {chat_id}")
                    except json.JSONDecodeError:
                        logging.error(f"Invalid JSON in response queue: {data_str}")
                    except Exception as e:
                        logging.error(f"Failed to send Telegram message: {e}")
                        
            except redis.ConnectionError:
                logging.error("Redis connection lost. Retrying in 5s...")
                await asyncio.sleep(5)
            except Exception as e:
                logging.error(f"Error in Redis poller: {e}")
                await asyncio.sleep(1)

            # Ensure non-blocking loop with 1s sleep as requested
            await asyncio.sleep(1)

    except Exception as e:
        logging.critical(f"Fatal Redis Error: {e}")

async def post_init(application):
    """Starts background tasks and keeps a reference to avoid GC."""
    task = asyncio.create_task(poll_redis_responses(application))
    # Keep a reference to the task as recommended by python-telegram-bot docs
    # to prevent it from being garbage collected
    application.bot_data['redis_task'] = task

async def get_actual_token():
    """Fetches the real Telegram token from Redis."""
    if TOKEN == "SECRET_MANAGED_BY_BROKER":
        try:
            import redis.asyncio as redis
            r = redis.from_url(REDIS_URL, decode_responses=True)
            real_token = await r.hget("genie:sys:secrets", "TELEGRAM_BOT_TOKEN")
            await r.aclose()
            return real_token
        except Exception as e:
            logging.error(f"Failed to fetch token from Redis: {e}")
            return None
    return TOKEN

def main():
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    actual_token = loop.run_until_complete(get_actual_token())
    
    if not actual_token:
        print("Error: Could not retrieve TELEGRAM_BOT_TOKEN")
        return

    app = ApplicationBuilder().token(actual_token).post_init(post_init).build()
    
    app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handle_message))
    
    print("Telegram Bridge Active. Listening...")
    app.run_polling()

if __name__ == "__main__":
    main()
