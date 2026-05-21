<video src="public/ad.mp4" controls width="100%"></video>

# Wisp: Intelligent Reading Comprehension & Quiz System

Wisp is a professional-grade AI system for generating comprehension questions, distractors, and graduated hints. It features a modern, monochromatic design powered by React + FastAPI.

## Demo

<video src="demo/Screencast from 11-05-2026 11:13:52.webm" controls width="100%"></video>

## Tech Stack
- **Frontend:** React, Tailwind CSS, Framer Motion, Material Symbols.
- **Backend:** FastAPI, scikit-learn, XGBoost, Transformers (BERT).
- **Architecture:** Modular ML logic with high-performance REST API.

## Data & Research Pipeline

The system is built upon an extensive research phase documented in the `notebooks/` directory:

### 1. Exploratory Data Analysis ([`notebooks/EDA.ipynb`](notebooks/EDA.ipynb))
*   **Dataset:** Analysis of the RACE (ReAding Comprehension Dataset from Examinations) dataset.
*   **Insights:** Visualized question type distributions, passage length statistics, and class balance across labels A, B, C, and D.
*   **Cleaning:** Identified and handled duplicates and null values to ensure high-quality training data.

### 2. Model A: Preprocessing & Question Verification ([`notebooks/preprocessing_ModelA.ipynb`](notebooks/preprocessing_ModelA.ipynb))
*   **Preprocessing:** Implemented a robust cleaning pipeline (ASCII normalization, punctuation removal) and text-weight boosting (repeating the article context).
*   **Feature Engineering:** 
    *   **Lexical:** Token overlap ratios and word/char counts.
    *   **Vectorization:** 10,000-feature OHE and TF-IDF representations.
    *   **Similarity:** Cosine similarity and Jaccard overlap between passage, question, and candidate options.
*   **Model A Training:** Fine-tuned **BERT (bert-base-uncased)** for neural verification and trained a **Stacking Ensemble** of classical models (LR, SVM, XGBoost) using a 4-option comparative feature format (40k total features).

### 3. Model B: Distractor & Hint Training ([`notebooks/modelB_training.ipynb`](notebooks/modelB_training.ipynb))
*   **Distractor Ranking:** Developed features based on length ratios, position in article, and unique-to-option content tokens.
*   **Model Training:** Evaluated a variety of supervised rankers (LR, SVM, Random Forest, XGBoost) and finalized a **Soft Voting Ensemble** for distractor selection.
*   **Hint Scorer:** Built a **Random Forest Regressor** to identify and rank sentences within the passage that provide the most relevant context for the correct answer.
*   **Option Pool:** Generated a frequency-based candidate pool from training data to support the distractor extraction strategy.

## Project Structure
```text
/
├── backend/
│   ├── main.py             # FastAPI routes
│   ├── ml_logic.py         # Model A & B inference engine
│   ├── schemas.py          # Data validation
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # UI screens (Splash, Workspace, Quiz, Dashboard)
│   │   ├── api/            # Service layer
│   │   └── App.js          # Main entry & Motion logic
│   └── package.json        # Node dependencies
├── models/                 # Model checkpoints (Traditional & Neural)
├── data/                   # Processed and Raw datasets
└── notebooks/              # Research, EDA, and Training pipelines
```

## Setup and Usage

### 1. Backend (FastAPI)
Navigate to the root and install dependencies:
```bash
pip install -r backend/requirements.txt
```
Run the server:
```bash
python3 backend/main.py
```
The API will be available at `http://localhost:8000`.

### 2. Frontend (React)
Navigate to the `frontend` directory:
```bash
cd frontend
npm install
npm start
```
The app will launch at `http://localhost:3000`.

## Key Features
- **Splash Screen:** Minimalist logo animation on startup.
- **Adaptive UI:** Ad video (`ad.mp4`) automatically slides out when interaction begins.
- **Multi-Model Support:** Choose between BERT and various traditional verifiers (LR, SVM, XGBoost, Ensemble).
- **Quiz Flow:** Two-step generation (Question -> Options) with hidden answers and graduated hints.
- **Developer Dashboard:** Real-time analytics on inference latency, accuracy trends, and CSV session export.
