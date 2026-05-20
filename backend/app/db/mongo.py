from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING

from app.config import get_settings


class MongoState:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


state = MongoState()


async def connect_to_mongo() -> None:
    settings = get_settings()
    state.client = AsyncIOMotorClient(settings.MONGODB_URI)
    state.db = state.client[settings.MONGODB_DB]
    await state.db.users.create_index([("email", ASCENDING)], unique=True)
    await state.db.todos.create_index([("user_id", ASCENDING)])
    await state.db.todos.create_index([("user_id", ASCENDING), ("due_date", ASCENDING)])


async def close_mongo_connection() -> None:
    if state.client is not None:
        state.client.close()
        state.client = None
        state.db = None


def get_db() -> AsyncIOMotorDatabase:
    if state.db is None:
        raise RuntimeError("MongoDB connection has not been initialized")
    return state.db
