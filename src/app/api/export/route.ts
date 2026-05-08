import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function htmlToText(html: string): string {
  if (!html) return "";
  let t = html;
  // 解码 HTML 实体
  t = t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  // 块级元素 → 换行
  t = t.replace(/<\/?(div|section|article)[^>]*>/gi, "\n");
  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<\/p>/gi, "\n\n");
  t = t.replace(/<\/h[1-6]>/gi, "\n\n");
  t = t.replace(/<\/li>/gi, "\n");
  t = t.replace(/<\/(ul|ol|blockquote|hr|table)>/gi, "\n\n");
  // 标题 → markdown 标记
  t = t.replace(/<h1[^>]*>/gi, "\n# ");
  t = t.replace(/<h2[^>]*>/gi, "\n## ");
  t = t.replace(/<h3[^>]*>/gi, "\n### ");
  // 列表项
  t = t.replace(/<li[^>]*>/gi, "\n- ");
  // blockquote
  t = t.replace(/<blockquote[^>]*>/gi, "\n> ");
  // 粗体/斜体
  t = t.replace(/<\/?(strong|b)>/gi, "**");
  t = t.replace(/<\/?(em|i)>/gi, "*");
  // 删除所有剩余标签
  t = t.replace(/<[^>]*>/g, "");
  // 清理多余空行
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/^[ \t]+/gm, "");
  return t.trim();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const format = searchParams.get("format") || "md";
    if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { chapters: { orderBy: { order: "asc" } } },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // JSON 完整导出
    if (format === "json") {
      const full = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          chapters: { orderBy: { order: "asc" } },
          characters: true, worldBuildings: true, locations: true,
          organizations: true, items: true, foreshadowings: true, timelines: true,
          aiSettings: true, aiGenerations: { orderBy: { createdAt: "desc" }, take: 50 },
        },
      });
      return new NextResponse(JSON.stringify(full, null, 2), {
        headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${project.title}.json"` },
      });
    }

    // TXT / MD → 都转纯文本（MD 加标题格式）
    const chapters = project.chapters.filter((c) => c.content).map((c, i) => {
      const body = htmlToText(c.content);
      return format === "md" ? `## 第${i + 1}章 ${c.title}\n\n${body}` : `第${i + 1}章 ${c.title}\n${"=".repeat(20)}\n${body}`;
    });

    const header = format === "md"
      ? [`# ${project.title}`, "", `> 类型: ${project.type} | 题材: ${project.genre} | 风格: ${project.style}`, "", project.description || "", project.worldView ? `## 世界观\n${project.worldView}` : "", "---", ""].join("\n")
      : [project.title, "=".repeat(project.title.length), "", `类型: ${project.type}  题材: ${project.genre}  风格: ${project.style}`, "", project.description || "", "---", ""].join("\n");

    const content = [header, ...chapters].join("\n\n");
    const contentType = format === "md" ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8";

    return new NextResponse(content, {
      headers: { "Content-Type": contentType, "Content-Disposition": `attachment; filename="${project.title}.${format}"` },
    });
  } catch (error) {
    console.error("GET /api/export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
