from fastapi import FastAPI, APIRouter, HTTPException, Header, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

API_KEY = os.environ.get('TASKPILOT_API_KEY', 'taskpilot-dev-key-change-me')

app = FastAPI()
api_router = APIRouter(prefix="/api")


def require_key(x_api_key: Optional[str] = Header(None)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True


# ------ Models ------
class Task(BaseModel):
    id: str
    title: str
    dueAt: Optional[str] = None  # ISO string in local time
    reminderAt: Optional[str] = None
    done: bool = False
    list: Literal['job', 'studies', 'personal'] = 'personal'
    notes: Optional[str] = None
    createdAt: str
    completedAt: Optional[str] = None
    # Application (extends job-list task)
    company: Optional[str] = None
    role: Optional[str] = None
    link: Optional[str] = None
    stage: Optional[Literal['to_apply', 'applied', 'interviewing', 'offer', 'rejected']] = None
    nextActionAt: Optional[str] = None
    deviceId: Optional[str] = None
    updatedAt: Optional[str] = None


# ------ Routes ------
@api_router.get("/")
async def root():
    return {"message": "TaskPilot API"}


@api_router.get("/health")
async def health():
    return {"ok": True, "ts": datetime.utcnow().isoformat()}


@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(deviceId: Optional[str] = None, _=Depends(require_key)):
    q = {}
    if deviceId:
        q["deviceId"] = deviceId
    cursor = db.tasks.find(q, {"_id": 0})
    docs = await cursor.to_list(2000)
    return docs


@api_router.put("/tasks/{task_id}", response_model=Task)
async def upsert_task(task_id: str, task: Task, _=Depends(require_key)):
    task.id = task_id
    task.updatedAt = datetime.utcnow().isoformat()
    doc = task.model_dump()
    await db.tasks.update_one({"id": task_id}, {"$set": doc}, upsert=True)
    return task


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, _=Depends(require_key)):
    await db.tasks.delete_one({"id": task_id})
    return {"deleted": task_id}


@api_router.post("/sync", response_model=List[Task])
async def bulk_sync(tasks: List[Task], _=Depends(require_key)):
    """Bulk upsert - last-write-wins by updatedAt."""
    now = datetime.utcnow().isoformat()
    for t in tasks:
        if not t.updatedAt:
            t.updatedAt = now
        await db.tasks.update_one({"id": t.id}, {"$set": t.model_dump()}, upsert=True)
    return tasks


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
