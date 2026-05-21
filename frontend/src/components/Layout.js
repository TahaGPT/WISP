import React from 'react';
import { motion } from 'framer-motion';

const Layout = ({ children, activeScreen, onNavigate }) => {
    return (
        <div className="min-h-screen bg-wisp-black text-wisp-white font-light selection:bg-wisp-white selection:text-wisp-black">
            {/* Header */}
            <nav className="flex items-center justify-between px-8 py-6 border-b border-wisp-white/5">
                <div 
                    className="flex items-center space-x-4 cursor-pointer"
                    onClick={() => onNavigate('workspace')}
                >
                    <img src="/logo.png" alt="Wisp" className="w-8 h-8 invert grayscale" />
                    <span className="text-xl tracking-tighter uppercase font-medium">Wisp</span>
                </div>
                <div className="flex space-x-8 text-xs uppercase tracking-widest text-wisp-white/40">
                    <button 
                        onClick={() => onNavigate('workspace')}
                        className={`hover:text-wisp-white transition-colors ${activeScreen === 'workspace' ? 'text-wisp-white' : ''}`}
                    >
                        Workspace
                    </button>
                    <button 
                        onClick={() => onNavigate('dashboard')}
                        className={`hover:text-wisp-white transition-colors ${activeScreen === 'dashboard' ? 'text-wisp-white' : ''}`}
                    >
                        Analytics
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-8 py-12">
                {children}
            </main>
        </div>
    );
};

export default Layout;
