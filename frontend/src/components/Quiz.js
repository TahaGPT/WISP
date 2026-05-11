import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateOptions, verifyAnswer } from '../api';

const Quiz = ({ quizData, onReset, onFinish }) => {
    const [options, setOptions] = useState([]);
    const [hints, setHints] = useState([]);
    const [hintIdx, setHintIdx] = useState(0);
    const [selected, setSelected] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [genTime, setGenTime] = useState(0);

    useEffect(() => {
        const fetchOptions = async () => {
            const start = Date.now();
            try {
                const data = await generateOptions(quizData.article, quizData.question, quizData.correct_answer);
                setOptions(data.options);
                setHints(data.hints);
                setGenTime((Date.now() - start) / 1000);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOptions();
    }, [quizData]);

    const handleVerify = async () => {
        if (!selected) return;
        setIsVerifying(true);
        try {
            const data = await verifyAnswer(
                quizData.article, 
                quizData.question, 
                selected, 
                quizData.correct_answer, 
                quizData.model_a
            );
            const res = {
                is_correct: data.is_correct,
                confidence: data.confidence,
                total_time: quizData.gen_time + genTime // Sum of Step 1 + Step 2
            };
            setResult(res);
            onFinish(res); // Push to history
        } catch (error) {
            console.error(error);
        } finally {
            setIsVerifying(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-2 border-wisp-white/10 border-t-wisp-white rounded-full"
                />
                <p className="mt-6 text-xs uppercase tracking-[0.3em] text-wisp-white/40">Generating Options...</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12"
            >
                <p className="text-xs uppercase tracking-[0.4em] text-wisp-white/40 mb-4 font-medium">Question</p>
                <h2 className="text-2xl font-light leading-relaxed">{quizData.question}</h2>
            </motion.div>

            <div className="space-y-4 mb-12">
                {options.map((opt, idx) => (
                    <motion.button
                        key={idx}
                        whileHover={{ x: 10 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => !result && setSelected(opt)}
                        className={`w-full text-left p-6 rounded-2xl border transition-all ${
                            selected === opt 
                            ? "bg-wisp-white text-wisp-black border-wisp-white" 
                            : "bg-wisp-grey/20 border-wisp-white/5 hover:border-wisp-white/20"
                        } ${result && opt === quizData.correct_answer ? "border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]" : ""}`}
                        disabled={!!result}
                    >
                        <div className="flex items-center space-x-4">
                            <span className="text-[10px] opacity-40 font-bold uppercase tracking-widest">{String.fromCharCode(65 + idx)}</span>
                            <span className="text-lg font-light">{opt}</span>
                        </div>
                    </motion.button>
                ))}
            </div>

            <div className="flex items-center justify-between">
                <div className="flex space-x-4">
                    <button 
                        onClick={onReset}
                        className="text-xs uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity flex items-center space-x-2"
                    >
                        <span className="material-symbols-rounded text-sm">arrow_back</span>
                        <span>New Passage</span>
                    </button>
                </div>

                <div className="flex items-center space-x-6">
                    <AnimatePresence>
                        {hints.length > 0 && hintIdx < hints.length && !result && (
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setHintIdx(hintIdx + 1)}
                                className="text-xs uppercase tracking-widest text-wisp-white/60 hover:text-wisp-white flex items-center space-x-2"
                            >
                                <span className="material-symbols-rounded text-sm">lightbulb</span>
                                <span>Get Hint ({hintIdx + 1}/{hints.length})</span>
                            </motion.button>
                        )}
                    </AnimatePresence>

                    <button 
                        onClick={handleVerify}
                        disabled={!selected || result || isVerifying}
                        className="bg-wisp-white text-wisp-black px-12 py-4 rounded-full text-xs uppercase font-bold tracking-[0.2em] disabled:opacity-20 transition-all shadow-xl"
                    >
                        {isVerifying ? 'Verifying...' : 'Verify Answer'}
                    </button>
                </div>
            </div>

            {/* Results Overlay */}
            <AnimatePresence>
                {result && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-12 p-8 rounded-3xl bg-wisp-grey/10 border border-wisp-white/5 relative overflow-hidden"
                    >
                        <div className="relative z-10">
                            <div className="flex items-center space-x-4 mb-4">
                                <span className={`material-symbols-rounded text-3xl ${result.is_correct ? "text-green-500" : "text-red-500"}`}>
                                    {result.is_correct ? "check_circle" : "cancel"}
                                </span>
                                <h3 className="text-2xl font-light">
                                    {result.is_correct ? "Absolutely Correct" : "Not Quite Right"}
                                </h3>
                            </div>
                            <p className="text-wisp-white/60 font-light leading-relaxed mb-6">
                                {result.is_correct 
                                    ? `Great job! You identified the correct answer. The verifier (${quizData.model_a}) confirms this with ${Math.round(result.confidence * 100)}% confidence.`
                                    : `The verifier (${quizData.model_a}) assigned ${Math.round(result.confidence * 100)}% confidence to this option, but it doesn't match the ground truth.`
                                }
                            </p>
                            {!result.is_correct && (
                                <div className="p-4 bg-wisp-white/5 rounded-xl border border-wisp-white/5">
                                    <p className="text-[10px] uppercase tracking-widest text-wisp-white/30 mb-1">Correct Answer</p>
                                    <p className="font-light italic">{quizData.correct_answer}</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Display revealed hints */}
            <div className="mt-8 space-y-3">
                {hints.slice(0, hintIdx).map((h, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-sm font-light text-wisp-white/40 italic flex items-start space-x-3"
                    >
                        <span className="material-symbols-rounded text-xs mt-1">info</span>
                        <span>{h}</span>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default Quiz;
