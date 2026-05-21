import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import SplashScreen from './components/SplashScreen';
import Layout from './components/Layout';
import Workspace from './components/Workspace';
import Quiz from './components/Quiz';
import Dashboard from './components/Dashboard';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeScreen, setActiveScreen] = useState('workspace');
  const [quizData, setQuizData] = useState(null);
  const [history, setHistory] = useState([]);

  const handleQuestionGenerated = (data) => {
    setQuizData(data);
    setActiveScreen('quiz');
  };

  const handleQuizFinished = (result) => {
    // Add to analytics history
    const entry = {
        timestamp: new Date(),
        model_a: quizData.model_a,
        gen_time: result.total_time, // This is now the Step 1 + Step 2 time
        is_correct: result.is_correct,
        confidence: result.confidence
    };
    setHistory([entry, ...history]);
  };

  const handleReset = () => {
    setQuizData(null);
    setActiveScreen('workspace');
  };

  const handleNavigate = (screen) => {
    setActiveScreen(screen);
  };

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen key="splash" onFinish={() => setShowSplash(false)} />
      ) : (
        <Layout 
            key="main" 
            activeScreen={activeScreen} 
            onNavigate={handleNavigate}
        >
          <AnimatePresence mode="wait">
            {activeScreen === 'workspace' && (
              <Workspace key="workspace" onQuestionGenerated={handleQuestionGenerated} />
            )}
            {activeScreen === 'quiz' && (
              <Quiz 
                key="quiz" 
                quizData={quizData} 
                onReset={handleReset} 
                onFinish={handleQuizFinished}
              />
            )}
            {activeScreen === 'dashboard' && (
              <Dashboard key="dashboard" history={history} />
            )}
          </AnimatePresence>
        </Layout>
      )}
    </AnimatePresence>
  );
}

export default App;
