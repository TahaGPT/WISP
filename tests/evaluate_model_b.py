import pandas as pd
import numpy as np
import os, joblib, json, re, warnings
from collections import Counter
try:
    from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction
    from rouge_score import rouge_scorer
except ImportError:
    print("Please install nltk and rouge-score: pip install nltk rouge-score")
    exit(1)

warnings.filterwarnings('ignore')

# ── PATHS ──
DATA_PATH = 'data/processed/test_clean.csv'
MODEL_DIR = 'models/model_b/traditional'

def load_all_models():
    models = {}
    models['hint_regressor'] = joblib.load(os.path.join(MODEL_DIR, 'hint_regressor_rf.pkl'))
    models['option_pool'] = joblib.load(os.path.join(MODEL_DIR, 'option_pool.pkl'))
    return models

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
    return [s.strip() for s in sents if len(s.strip()) > 10]

# ── INFERENCE ──
def generate_distractors_v2(article, question, correct_answer, models, n_distractors=3):
    correct_clean_t = clean_text(correct_answer)
    correct_wc = len(tokenize(correct_answer))
    q_ct = content_tokens(question)
    sents = sentence_split(article)
    option_pool = models['option_pool']
    all_candidates = []

    q_keywords = content_tokens(question)
    relevant_sents = [s for s in sents if len(content_tokens(s) & q_keywords) > 0]
    if not relevant_sents: relevant_sents = sents[:5]

    for sent in relevant_sents:
        words = tokenize(sent)
        for n in range(max(1, correct_wc), correct_wc + 2):
            for i in range(len(words) - n + 1):
                phrase = ' '.join(words[i:i+n])
                if phrase != correct_clean_t and len(phrase) > 2: all_candidates.append(('extraction', phrase))

    art_tokens_list = tokenize(article)
    freq = Counter(art_tokens_list)
    frequent_words = [w for w, c in freq.most_common(40) if w not in STOPWORDS]
    for cw in list(content_tokens(correct_answer)):
        for fw in frequent_words:
            if fw != cw and fw not in content_tokens(correct_answer):
                new_phrase = clean_text(correct_answer).replace(cw, fw)
                if new_phrase != correct_clean_t: all_candidates.append(('substitution', new_phrase))

    for wc_offset in [0, -1, 1]:
        target_wc = correct_wc + wc_offset
        if target_wc in option_pool:
            for opt_text in option_pool[target_wc][:20]:
                if clean_text(opt_text) != correct_clean_t: all_candidates.append(('pool', opt_text.strip()))

    seen = set()
    scored = []
    for source, cand in all_candidates:
        cand_clean = clean_text(cand)
        if cand_clean in seen or cand_clean == correct_clean_t: continue
        seen.add(cand_clean)
        cand_wc = len(tokenize(cand))
        j = jaccard(cand, correct_answer)
        len_sim = max(1.0 - abs(cand_wc - correct_wc) / max(correct_wc, 1), 0.0)
        art_rel = overlap_ratio(cand, article)
        q_rel = len(content_tokens(cand) & q_ct) / max(len(content_tokens(cand) | q_ct), 1)
        exact_penalty = 0.1 if (correct_clean_t in cand_clean or cand_clean in correct_clean_t) else 1.0
        source_bonus = 1.2 if source == 'substitution' else (1.1 if source == 'pool' else 1.0)
        score = source_bonus * (0.10*min(j,0.5)*2 + 0.20*art_rel + 0.15*q_rel + 0.40*len_sim + 0.15*exact_penalty)
        scored.append((cand, score))

    scored.sort(key=lambda x: -x[1])
    selected = []
    for cand, sc in scored:
        if len(selected) >= n_distractors: break
        if any(jaccard(cand, s) > 0.6 for s in selected): continue
        selected.append(cand)
    return selected

# ── EVALUATION ──
def evaluate_model_b(n_samples=100):
    print(f"Loading test data from {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH)
    models = load_all_models()
    
    scorer = rouge_scorer.RougeScorer(['rouge1', 'rougeL'], use_stemmer=True)
    chencherry = SmoothingFunction()
    
    bleu_scores = []
    rouge1_scores = []
    rougeL_scores = []
    
    print(f"Evaluating on {n_samples} samples...")
    for i in range(min(n_samples, len(df))):
        row = df.iloc[i]
        art, q, ans_label = str(row['article']), str(row['question']), row['answer']
        correct = str(row[ans_label])
        
        # Ground truth distractors
        gt_distractors = [str(row[o]) for o in 'ABCD' if o != ans_label]
        
        # Generated distractors
        gen_distractors = generate_distractors_v2(art, q, correct, models, 3)
        
        # Compare each generated distractor with the best matching GT distractor
        for gen in gen_distractors:
            # BLEU
            gen_tokens = tokenize(gen)
            gt_tokens_list = [tokenize(gt) for gt in gt_distractors]
            b = sentence_bleu(gt_tokens_list, gen_tokens, smoothing_function=chencherry.method1)
            bleu_scores.append(b)
            
            # ROUGE
            best_r1 = 0
            best_rl = 0
            for gt in gt_distractors:
                scores = scorer.score(gt, gen)
                best_r1 = max(best_r1, scores['rouge1'].fmeasure)
                best_rl = max(best_rl, scores['rougeL'].fmeasure)
            rouge1_scores.append(best_r1)
            rougeL_scores.append(best_rl)
            
    print("\n" + "="*40)
    print("MODEL B EVALUATION RESULTS (Distractors)")
    print("="*40)
    print(f"Average BLEU Score:   {np.mean(bleu_scores):.4f}")
    print(f"Average ROUGE-1 F1:   {np.mean(rouge1_scores):.4f}")
    print(f"Average ROUGE-L F1:   {np.mean(rougeL_scores):.4f}")
    print("="*40)

if __name__ == "__main__":
    evaluate_model_b(n_samples=200)
