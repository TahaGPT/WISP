import React from 'react';
import { motion } from 'framer-motion';

const Dashboard = ({ history }) => {
    const avgLatency = history.length > 0 
        ? history.reduce((acc, curr) => acc + curr.gen_time, 0) / history.length 
        : 0;

    const correctCount = history.filter(h => h.is_correct).length;
    const accuracy = history.length > 0 ? (correctCount / history.length) * 100 : 0;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
        >
            <h2 className="text-4xl font-light tracking-tight">System Performance.</h2>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { label: 'Inferences', value: history.length, unit: 'Runs' },
                    { label: 'Avg Latency', value: avgLatency.toFixed(2), unit: 'Seconds' },
                    { label: 'Session Accuracy', value: Math.round(accuracy), unit: '%' }
                ].map((m, i) => (
                    <div key={i} className="bg-wisp-grey/10 border border-wisp-white/5 p-8 rounded-3xl">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-wisp-white/30 mb-2 font-medium">{m.label}</p>
                        <div className="flex items-baseline space-x-2">
                            <span className="text-5xl font-light">{m.value}</span>
                            <span className="text-xs uppercase tracking-widest text-wisp-white/20">{m.unit}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* History Table */}
            <div className="bg-wisp-grey/5 border border-wisp-white/5 rounded-3xl overflow-hidden">
                <div className="p-8 border-b border-wisp-white/5 flex justify-between items-center">
                    <h3 className="text-lg font-light tracking-tight text-wisp-white/60">Session Logs</h3>
                    <button 
                        onClick={() => {
                            const csv = "Timestamp,ModelA,Latency,Correct\n" + 
                                history.map(h => `${new Date(h.timestamp).toLocaleTimeString()},${h.model_a},${h.gen_time},${h.is_correct}`).join("\n");
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'wisp_analytics.csv';
                            a.click();
                        }}
                        className="text-[10px] uppercase tracking-widest border border-wisp-white/10 px-4 py-2 rounded-full hover:bg-wisp-white hover:text-wisp-black transition-all"
                    >
                        Export CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="text-[10px] uppercase tracking-widest text-wisp-white/20 border-b border-wisp-white/5">
                                <th className="px-8 py-4 font-medium">Model A Verifier</th>
                                <th className="px-8 py-4 font-medium">Latency</th>
                                <th className="px-8 py-4 font-medium">Result</th>
                                <th className="px-8 py-4 font-medium">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-wisp-white/5">
                            {history.map((h, i) => (
                                <tr key={i} className="hover:bg-wisp-white/5 transition-colors">
                                    <td className="px-8 py-6 text-sm font-light uppercase tracking-tighter">{h.model_a}</td>
                                    <td className="px-8 py-6 text-sm font-light">{h.gen_time.toFixed(2)}s</td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest ${h.is_correct ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                            {h.is_correct ? 'Correct' : 'Incorrect'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-sm font-light text-wisp-white/40">{new Date(h.timestamp).toLocaleTimeString()}</td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-8 py-12 text-center text-xs uppercase tracking-[0.3em] text-wisp-white/10 italic">
                                        No session data available yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
};

export default Dashboard;
