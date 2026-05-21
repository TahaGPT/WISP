import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const SplashScreen = ({ onFinish }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onFinish();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <motion.div 
            className="fixed inset-0 bg-wisp-black flex flex-col items-center justify-center z-50"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
            >
                <img src="/logo.png" alt="Wisp Logo" className="w-32 h-32 invert grayscale" />
            </motion.div>
            <motion.h1 
                className="mt-6 text-4xl font-light tracking-widest text-wisp-white uppercase"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
            >
                Wisp
            </motion.h1>
            <motion.div 
                className="mt-4 w-12 h-[1px] bg-wisp-white/20"
                initial={{ width: 0 }}
                animate={{ width: 48 }}
                transition={{ delay: 1, duration: 1 }}
            />
        </motion.div>
    );
};

export default SplashScreen;
