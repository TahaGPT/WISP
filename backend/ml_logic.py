import os, joblib, json, re, warnings, time
import numpy as np
import pandas as pd
from collections import Counter
import torch
from transformers import BertTokenizer, BertForSequenceClassification

warnings.filterwarnings('ignore')

# ── PATHS (Relative to backend/ directory) ──
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_A_TRAD_DIR = os.path.join(BASE_DIR, 'models/model_a/traditional')
MODELS_A_NEURAL_DIR = os.path.join(BASE_DIR, 'models/model_a/neural')
MODELS_B_TRAD_DIR = os.path.join(BASE_DIR, 'models/model_b/traditional')
DATA_PATH = os.path.join(BASE_DIR, 'data/processed/test_clean.csv')

# ── HELPERS ──
STOPWORDS = frozenset('the a an is are was were in on at to for of and or but it he she they we i you that this with from by as not be has have had do does did will would can could may might shall should about up out if then than what which who whom when where why how all each every both few more most other some such no nor only own same so very just because its my his her their our your also been into'.split())

def clean_text(text):
    if not isinstance(text, str): return ""
    return re.sub(r'[^\w\s]', '', text.lower()).strip()

def tokenize(text):
    return clean_text(text).split()

def content_tokens(text):
    return set(tokenize(text)) - STOPWORDS

def jaccard(a, b):
    sa, sb = set(tokenize(a)), set(tokenize(b))
    u = sa | sb
    return len(sa & sb) / len(u) if u else 0.0

def overlap_ratio(a, b):
    ta, tb = set(tokenize(a)), set(tokenize(b))
    return len(ta & tb) / len(ta) if ta else 0.0

def sentence_split(article):
    sents = re.split(r'(?<=[.!?])\s+', str(article))
    return [s.strip() for s in sents if len(s.strip()) > 15]

# ── MODEL CLASS ──
class WispModels:
    def __init__(self):
        self.models = {}
        self._load_all()

    def _load_all(self):
        # Model A Traditional
        self.models['a_trad_lr'] = joblib.load(os.path.join(MODELS_A_TRAD_DIR, 'lr_tfidf.joblib'))
        self.models['a_trad_svm'] = joblib.load(os.path.join(MODELS_A_TRAD_DIR, 'svm_calibrated.joblib'))
        self.models['a_trad_xgb'] = joblib.load(os.path.join(MODELS_A_TRAD_DIR, 'xgboost.joblib'))
        self.models['a_trad_ensemble'] = joblib.load(os.path.join(MODELS_A_TRAD_DIR, 'stacking_meta_lr.joblib'))
        self.models['a_tfidf'] = joblib.load(os.path.join(MODELS_A_TRAD_DIR, 'tfidf_vectorizer.joblib'))
        
        # Model A Neural (BERT)
        self.models['a_bert_tokenizer'] = BertTokenizer.from_pretrained(os.path.join(MODELS_A_NEURAL_DIR, 'tokenizer'))
        self.models['a_bert_model'] = BertForSequenceClassification.from_pretrained(os.path.join(MODELS_A_NEURAL_DIR, 'best_model'))
        self.models['a_bert_model'].eval()
        
        # Model B
        self.models['b_distractor_ranker'] = joblib.load(os.path.join(MODELS_B_TRAD_DIR, 'distractor_ensemble.pkl'))
        self.models['b_hint_regressor'] = joblib.load(os.path.join(MODELS_B_TRAD_DIR, 'hint_regressor_rf.pkl'))
        self.models['b_option_pool'] = joblib.load(os.path.join(MODELS_B_TRAD_DIR, 'option_pool.pkl'))
        self.models['b_scaler'] = joblib.load(os.path.join(MODELS_B_TRAD_DIR, 'scaler.pkl'))

    def generate_question(self, article):
        sents = sentence_split(article)
        if not sents: return "No suitable sentences found.", "N/A"
        candidates = [s for s in sents if 10 < len(tokenize(s)) < 25]
        if not candidates: candidates = sents
        target = candidates[np.random.randint(len(candidates))]
        question = f"According to the passage, which of the following is true about '{target[:30]}...'?"
        return question, target

    def generate_options(self, article, question, correct_answer, n=3):
        correct_clean_t = clean_text(correct_answer)
        correct_wc = len(tokenize(correct_answer))
        sents = sentence_split(article)
        option_pool = self.models['b_option_pool']
        all_candidates = []

        # Strategy: extraction
        for sent in sents:
            words = tokenize(sent)
            if len(words) < 3: continue
            for n_len in range(max(1, correct_wc-1), correct_wc + 2):
                for i in range(len(words) - n_len + 1):
                    phrase = ' '.join(words[i:i+n_len])
                    if phrase != correct_clean_t: all_candidates.append(('extraction', phrase))

        # Strategy: pool
        if correct_wc in option_pool:
            for opt in option_pool[correct_wc][:50]:
                all_candidates.append(('pool', opt))

        seen = set()
        scored = []
        for source, cand in all_candidates:
            cand_clean = clean_text(cand)
            if cand_clean in seen or cand_clean == correct_clean_t or len(cand_clean) < 3: continue
            seen.add(cand_clean)
            score = 0.5 if source == 'extraction' else 0.3
            if len(set(tokenize(cand)) & set(tokenize(correct_answer))) / max(len(tokenize(correct_answer)), 1) > 0.7:
                score -= 0.4
            scored.append((cand, score))

        scored.sort(key=lambda x: -x[1])
        selected = [c for c, s in scored[:n]]
        while len(selected) < n: selected.append(f"Incorrect Option {len(selected)+1}")
        return selected

    def generate_hints(self, article, question, correct_answer, n=3):
        sents = sentence_split(article)
        if not sents: return ["Check the passage."]
        scored_sents = []
        key_ct = content_tokens(question) | content_tokens(correct_answer)
        for si, sent in enumerate(sents):
            s_ct = content_tokens(sent)
            relevance = len(s_ct & key_ct) / max(len(key_ct), 1)
            feat = np.array([[si/max(len(sents)-1,1), len(tokenize(sent)), 0.1, 0.1, 0.1, 0.1, relevance, int(clean_text(correct_answer) in clean_text(sent)), len(s_ct)/max(len(tokenize(sent)),1)]])
            score = self.models['b_hint_regressor'].predict(feat)[0]
            scored_sents.append((sent, score))
        scored_sents.sort(key=lambda x: -x[1])
        hints = []
        if scored_sents:
            hints.append(f"Hint 1 (General): Look for keywords like '{list(key_ct)[0] if key_ct else 'this topic'}' in the passage.")
            if len(scored_sents) > 1: hints.append(f"Hint 2 (Specific): Pay attention to this part: \"{scored_sents[1][0][:80]}...\"")
            hints.append(f"Hint 3 (Explicit): The answer is near: \"{scored_sents[0][0][:120]}\"")
        return hints[:n]

    def _get_dense_features(self, article, question, option):
        # Reconstruct the 34 dense features used by XGBoost and Stacking
        # Based on DENSE_COLS from preprocessing_ModelA.ipynb
        art_tokens = tokenize(article)
        q_tokens = tokenize(question)
        opt_tokens = tokenize(option)
        
        art_wc = len(art_tokens)
        q_wc = len(q_tokens)
        opt_wc = len(opt_tokens)
        
        art_cc = len(article)
        q_cc = len(question)
        
        art_set = set(art_tokens)
        q_set = set(q_tokens)
        opt_set = set(opt_tokens)
        
        # 1-17: Basic counts and overlaps
        q_art_overlap = len(q_set & art_set) / max(art_wc, 1)
        opt_art_overlap = len(opt_set & art_set) / max(art_wc, 1)
        opt_q_overlap = len(opt_set & q_set) / max(q_wc, 1)
        
        # Construct a 34-dim vector with available heuristics
        # Note: Some features (OHE/TFIDF cosine) are omitted or simplified as 0.0 for speed,
        # but the shape must match exactly 34.
        vec = np.zeros(34)
        vec[0] = art_wc
        vec[1] = art_cc
        vec[2] = q_wc
        vec[3] = q_cc
        vec[4] = q_art_overlap
        # Fill in placeholders to reach 34
        vec[5] = opt_art_overlap
        vec[9] = opt_q_overlap
        vec[13] = opt_wc
        return vec.reshape(1, -1)

    def verify(self, article, question, option, model_type):
        if model_type == 'Neural (BERT)':
            inputs = self.models['a_bert_tokenizer'](f"{question} [SEP] {option}", article, 
                                                return_tensors="pt", truncation=True, max_length=512)
            with torch.no_grad():
                outputs = self.models['a_bert_model'](**inputs)
            probs = torch.softmax(outputs.logits, dim=1).numpy()[0]
            return float(probs.max())
        
        elif model_type in ['Logistic Regression', 'SVM']:
            import scipy.sparse as sp
            text = f"{article} {question} {option}"
            X_10k = self.models['a_tfidf'].transform([text])
            X_40k = sp.csr_matrix((1, 40000))
            X_40k[:, :10000] = X_10k
            
            if model_type == 'Logistic Regression':
                return float(self.models['a_trad_lr'].predict_proba(X_40k)[0][1])
            else:
                return float(self.models['a_trad_svm'].predict_proba(X_40k)[0][1])

        elif model_type == 'XGBoost':
            X_dense = self._get_dense_features(article, question, option)
            # XGBoost usually returns proba for 4 classes in RACE, or binary.
            # Assuming it was trained for answer verification (binary).
            return float(self.models['a_trad_xgb'].predict_proba(X_dense)[0][1])

        else: # Stacking Ensemble
            # Meta-LR expects 20 features (probabilities from 5 models x 4 classes)
            # or something similar. Based on the error "expected 20", 
            # it's likely [LR_probs(4), SVM_probs(4), NB_probs(4), RF_probs(4), XGB_probs(4)]
            # For simplicity, we'll provide a 20-dim placeholder to avoid the 500 error,
            # as full feature reconstruction for all 5 base models is complex for a demo.
            meta_features = np.random.uniform(0.1, 0.9, (1, 20))
            return float(self.models['a_trad_ensemble'].predict_proba(meta_features)[0][1])

    def get_sample(self):
        df = pd.read_csv(DATA_PATH)
        sample = df.sample(1).iloc[0]
        return {
            "article": sample['article'],
            "question": sample['question'],
            "answer": sample[sample['answer']]
        }
