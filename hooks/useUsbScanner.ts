import { useEffect, useRef } from 'react';

export const useUsbScanner = (onScan: (code: string) => void, enabled: boolean = true) => {
  const buffer = useRef<string[]>([]);
  const timeoutId = useRef<any>(null);
  
  // Increased from 100ms to 200ms to handle slower computer processing
  const SCAN_TIMEOUT_MS = 200; 

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore key combos (Ctrl, Alt, etc)
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      // Reset buffer if typing is too slow (manual entry vs scanner)
      if (timeoutId.current) clearTimeout(timeoutId.current);

      if (event.key === 'Enter') {
        // If buffer has content, treat as scan completion
        if (buffer.current.length > 0) { 
          // CRITICAL FIX: Prevent the Enter key from submitting any open forms (like the PIN modal)
          event.preventDefault();
          event.stopPropagation();
          
          const code = buffer.current.join('');
          // Clear buffer immediately before processing to prevent double scans
          buffer.current = [];
          onScan(code);
        }
        return;
      }

      // Only accept printable characters (length 1) to build the string
      if (event.key.length === 1) {
        buffer.current.push(event.key);
      }

      // Set timeout to clear buffer if next char doesn't come fast enough
      timeoutId.current = setTimeout(() => {
        buffer.current = [];
      }, SCAN_TIMEOUT_MS);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutId.current) clearTimeout(timeoutId.current);
    };
  }, [onScan, enabled]);
};