// Rough token estimation for Chinese + English mixed text
// Chinese: ~1 char ≈ 1.5 tokens; English: ~1 word ≈ 1.3 tokens; punctuation ≈ 1 token

export function estimateTokens(text: string): number {
  if (!text) return 0;
  let tokens = 0;
  // Count Chinese characters (CJK Unified Ideographs range)
  const cjk = text.match(/[一-鿿㐀-䶿]/g);
  tokens += (cjk?.length ?? 0) * 1.5;
  // Count English words
  const english = text.match(/[a-zA-Z]+/g);
  tokens += (english?.length ?? 0) * 1.3;
  // Count numbers, punctuation, whitespace ≈ 1 token each
  const other = text.match(/[^a-zA-Z一-鿿㐀-䶿]/g);
  tokens += (other?.length ?? 0) * 0.8;
  return Math.ceil(tokens);
}

export function truncateByTokens(text: string, maxTokens: number): string {
  if (!text) return "";
  if (estimateTokens(text) <= maxTokens) return text;
  // Truncate roughly: each char/word proportionally
  let result = "";
  let current = 0;
  const chars = [...text];
  for (const char of chars) {
    const t = /[一-鿿㐀-䶿]/.test(char) ? 1.5 : /[a-zA-Z]/.test(char) ? 0.3 : 0.8;
    if (current + t > maxTokens) break;
    current += t;
    result += char;
  }
  return result + "\n\n[上下文已截断...]";
}

export function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
