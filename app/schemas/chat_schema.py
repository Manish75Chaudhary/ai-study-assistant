from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)


class ChatHistoryItem(BaseModel):
    id: int
    question: str
    answer: str
    created_at: str


class ChatHistoryResponse(ChatHistoryItem):
    document_id: int
