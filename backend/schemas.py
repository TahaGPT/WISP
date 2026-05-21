from pydantic import BaseModel
from typing import List, Optional

class ArticleRequest(BaseModel):
    article: str

class QuestionResponse(BaseModel):
    question: str
    answer: str

class OptionsRequest(BaseModel):
    article: str
    question: str
    correct_answer: str

class OptionsResponse(BaseModel):
    options: List[str]
    hints: List[str]

class VerifyRequest(BaseModel):
    article: str
    question: str
    selected_option: str
    correct_answer: str
    model_type: str

class VerifyResponse(BaseModel):
    is_correct: bool
    confidence: float
    correct_answer: str

class SampleResponse(BaseModel):
    article: str
    question: str
    answer: str
