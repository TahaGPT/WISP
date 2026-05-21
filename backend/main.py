from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ml_logic import WispModels
from schemas import (
    ArticleRequest, QuestionResponse, 
    OptionsRequest, OptionsResponse,
    VerifyRequest, VerifyResponse,
    SampleResponse
)
import uvicorn

app = FastAPI(title="Wisp API", description="AI-powered Quiz Generation Engine")

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize models
wisp = WispModels()

@app.get("/api/v1/sample", response_model=SampleResponse)
async def get_sample():
    try:
        return wisp.get_sample()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/generate/question", response_model=QuestionResponse)
async def generate_question(req: ArticleRequest):
    try:
        q, a = wisp.generate_question(req.article)
        return {"question": q, "answer": a}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/generate/options", response_model=OptionsResponse)
async def generate_options(req: OptionsRequest):
    try:
        opts = wisp.generate_options(req.article, req.question, req.correct_answer)
        hints = wisp.generate_hints(req.article, req.question, req.correct_answer)
        # Combine and shuffle options
        full_opts = [req.correct_answer] + opts
        import numpy as np
        np.random.shuffle(full_opts)
        return {"options": full_opts, "hints": hints}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/verify", response_model=VerifyResponse)
async def verify(req: VerifyRequest):
    try:
        confidence = wisp.verify(req.article, req.question, req.selected_option, req.model_type)
        is_correct = req.selected_option == req.correct_answer
        return {
            "is_correct": is_correct,
            "confidence": confidence,
            "correct_answer": req.correct_answer
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
