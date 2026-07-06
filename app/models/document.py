from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.db import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    cloudinary_url = Column(String)
    cloudinary_public_id = Column(String)
    file_size = Column(Integer)
    extracted_text = Column(Text)
    summary = Column(Text)
    uploaded_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id")
    )

    user = relationship(
        "User",
        back_populates="documents"
    )

    chat_history = relationship(
        "ChatHistory",
        back_populates="document",
        cascade="all, delete-orphan"
    )
