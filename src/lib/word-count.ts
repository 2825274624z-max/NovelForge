export function countWords(text: string): number {
  const cleaned = text
    .replace(/[#*_~`>\[\]()|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return 0;
  // Count Chinese characters and English words
  const chineseChars = (cleaned.match(/[一-鿿㐀-䶿豈-﫿]/g) || []).length;
  const englishText = cleaned.replace(/[一-鿿㐀-䶿豈-﫿]/g, " ");
  const englishWords = englishText
    .split(/\s+/)
    .filter(Boolean)
    .length;
  return chineseChars + englishWords;
}
