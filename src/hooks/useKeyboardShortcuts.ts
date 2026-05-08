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
          toast.success("已保存");
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
        // Toggle AI panel is handled by the consumer
        window.dispatchEvent(new CustomEvent("toggle-ai-panel"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentChapterId, projectId, saveChapter, addChapter, loadChapter]);
}
