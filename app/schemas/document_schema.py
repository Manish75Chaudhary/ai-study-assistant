from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: int
    title: str
    file_path: str

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    question: str


class DocumentListItem(BaseModel):
    id: int
    title: str
    upload_date: str
    file_size: int
    extracted_text_length: int
    summary_exists: bool


class DocumentDetailResponse(BaseModel):
    id: int
    title: str
    file_path: str
    upload_date: str
    summary: str | None
    text_length: int
    number_of_chunks: int | None = None


class DocumentDeleteResponse(BaseModel):
    message: str


class DashboardLatestUpload(BaseModel):
    id: int
    title: str
    upload_date: str


class DashboardResponse(BaseModel):
    total_documents: int
    total_chats: int
    total_summaries: int
    latest_uploads: list[DashboardLatestUpload]
