import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSample, generateQuestion } from '../api';

const Workspace = ({ onQuestionGenerated }) => {
    const [article, setArticle] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [verifier, setVerifier] = useState('Neural (BERT)');

    const handleLoadSample = async () => {
        setIsLoading(true);
        setIsFocused(true);
        try {
            const data = await getSample();
            setArticle(data.article);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!article) return;
        setIsLoading(true);
        const start = Date.now();
        try {
            const data = await generateQuestion(article);
            const genTime = (Date.now() - start) / 1000;
            onQuestionGenerated({
                article,
                question: data.question,
                correct_answer: data.answer,
                model_a: verifier,
                gen_time: genTime
            });
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-12 gap-12 items-start">
            {/* Left: Input */}
            <motion.div 
                className={isFocused ? "col-span-12 lg:col-span-7" : "col-span-12 lg:col-span-6"}
                layout
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
                <h2 className="text-3xl font-light mb-8 tracking-tight">Enter your context.</h2>
                
                <div className="space-y-6">
                    <textarea 
                        className="w-full h-80 bg-wisp-grey/30 border border-wisp-white/5 rounded-2xl p-8 focus:outline-none focus:border-wisp-white/20 transition-colors text-lg leading-relaxed placeholder:text-wisp-white/10 resize-none"
                        placeholder="Paste an article or passage here..."
                        value={article}
                        onChange={(e) => setArticle(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                    />
                    
                    <div className="flex items-center justify-between">
                        <div className="flex space-x-4">
                            <button 
                                onClick={handleLoadSample}
                                className="px-6 py-3 rounded-full border border-wisp-white/10 text-xs uppercase tracking-widest hover:bg-wisp-white hover:text-wisp-black transition-all disabled:opacity-50"
                                disabled={isLoading}
                            >
                                <span className="flex items-center space-x-2">
                                    <span className="material-symbols-rounded text-sm">casino</span>
                                    <span>Random Sample</span>
                                </span>
                            </button>

                            <select 
                                className="bg-wisp-black border border-wisp-white/10 rounded-full px-6 py-3 text-xs uppercase tracking-widest focus:outline-none appearance-none cursor-pointer hover:border-wisp-white/20 transition-colors"
                                value={verifier}
                                onChange={(e) => setVerifier(e.target.value)}
                            >
                                <option>Neural (BERT)</option>
                                <option>Logistic Regression</option>
                                <option>SVM</option>
                                <option>XGBoost</option>
                                <option>Ensemble</option>
                            </select>
                        </div>

                        <button 
                            onClick={handleGenerate}
                            className="bg-wisp-white text-wisp-black px-10 py-4 rounded-full text-xs uppercase font-bold tracking-[0.2em] hover:bg-wisp-white/90 transition-all disabled:opacity-50 shadow-2xl shadow-white/5"
                            disabled={!article || isLoading}
                        >
                            {isLoading ? 'Processing...' : 'Generate Quiz'}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Right: Ad Video */}
            <AnimatePresence>
                {!isFocused && (
                    <motion.div 
                        className="col-span-12 lg:col-span-5 relative group"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="aspect-video bg-wisp-grey/20 rounded-3xl overflow-hidden border border-wisp-white/5 shadow-2xl">
                            <video 
                                autoPlay 
                                loop 
                                muted 
                                playsInline 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                            >
                                <source src="/ad.mp4" type="video/mp4" />
                            </video>
                            <div className="absolute inset-0 bg-gradient-to-t from-wisp-black via-transparent to-transparent pointer-events-none" />
                            <div className="absolute bottom-8 left-8 right-8">
                                <p className="text-xs uppercase tracking-[0.3em] text-wisp-white/40 mb-2">Powered by</p>
                                <h3 className="text-xl font-light tracking-tight">Wisp Neural Engine</h3>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Workspace;
