import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import TurndownService from "turndown";

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function htmlToMd(html: string): string {
  if (!html) return "";
  try {
    const td = new TurndownService({ headingStyle: "atx" });
    return td.turndown(html);
  } catch {
    return stripHtml(html);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const format = searchParams.get("format") || "md";

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        chapters: { orderBy: { order: "asc" } },
        characters: { orderBy: { order: "asc" } },
        worldBuildings: { orderBy: { order: "asc" } },
        foreshadowings: { orderBy: { order: "asc" } },
        aiGenerations: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (format === "json") {
      const json = JSON.stringify(project, null, 2);
      return new NextResponse(json, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${project.title}.json"`,
        },
      });
    }

    if (format === "txt") {
      const chapterTexts = project.chapters.map(
        (ch, i) =>
          `第${i + 1}章 ${ch.title}\n${"-".repeat(10)}\n${stripHtml(ch.content)}\n`
      );
      const txt = [
        project.title,
        "=".repeat(project.title.length),
        "",
        `类型: ${project.type}  题材: ${project.genre}  风格: ${project.style}`,
        "",
        project.description ? `简介: ${project.description}\n` : "",
        "---",
        "",
        ...chapterTexts,
      ].join("\n");

      return new NextResponse(txt, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${project.title}.txt"`,
        },
      });
    }

    // Default: Markdown
    const chapterMds = project.chapters
      .filter((ch) => ch.content)
      .map((ch, i) => `## 第${i + 1}章 ${ch.title}\n\n${htmlToMd(ch.content)}\n`);
    const md = [
      `# ${project.title}`,
      "",
      `> **类型**: ${project.type} | **题材**: ${project.genre} | **风格**: ${project.style}`,
      "",
      project.description ? `> ${project.description}\n` : "",
      project.worldView ? `## 世界观\n${project.worldView}\n` : "",
      "---",
      "",
      ...chapterMds,
    ].join("\n");

    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${project.title}.md"`,
      },
    });
  } catch (error) {
    console.error("GET /api/export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
