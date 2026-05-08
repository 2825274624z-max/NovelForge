import { useRef, useEffect, useCallback } from "react";
import { useEditorStore } from "@/store/useStore";

export function useAutoSave() {
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const { currentChapterId, chapterContent, saving, saveChapter } =
    useEditorStore();

  // Auto-save on content change (2s debounce)
  useEffect(() => {
    if (currentChapterId && chapterContent) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(
        () => saveChapter(currentChapterId),
        2000
      );
    }
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [chapterContent, currentChapterId, saveChapter]);

  const manualSave = useCallback(() => {
    const { currentChapterId, saveChapter } = useEditorStore.getState();
    if (currentChapterId) {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      saveChapter(currentChapterId);
      return true;
    }
    return false;
  }, []);

  return { saving, manualSave };
}
