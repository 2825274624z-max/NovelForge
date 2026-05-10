import { useEffect } from "react";
import { useEditorStore } from "@/store/useStore";
import { toast } from "sonner";

export function useKeyboardShortcuts(projectId: string) {
  const { currentChapterId, saveChapter, addChapter, loadChapter } =
    useEditorStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === "s") {
        e.preventDefault();
        if (currentChapterId) {
          saveChapter(currentChapterId);
          toast.success("已保存", { description: "Ctrl+Enter 可触发 AI 生成" });
        }
      }

      if (e.key === "n") {
        e.preventDefault();
        addChapter(projectId).then((ch) => {
          if (ch) loadChapter(ch.id);
        });
      }

      if (e.key === "a" && e.shiftKey) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("toggle-ai-panel"));
      }

      if (e.key === "Enter") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("trigger-ai-generation"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentChapterId, projectId, saveChapter, addChapter, loadChapter]);
}
