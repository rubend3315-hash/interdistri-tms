import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DataRefreshIndicator({ lastRefresh }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastRefresh) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [lastRefresh]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg print:hidden"
        >
          <RefreshCw className="w-4 h-4 animate-spin" />
          Data bijgewerkt
        </motion.div>
      )}
    </AnimatePresence>
  );
}