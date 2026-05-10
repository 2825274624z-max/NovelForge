import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { loadConfig, clearConfigCache, type AppConfig } from "@/lib/config";

const CONFIG_PATH = path.resolve(process.cwd(), "novelforge.config.json");

export async function GET() {
  try {
    return NextResponse.json(loadConfig());
  } catch {
    return NextResponse.json({ error: "读取配置失败" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    // 重新读取最新文件（不依赖缓存）
    const fresh: AppConfig = (() => {
      if (fs.existsSync(CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      }
      return loadConfig();
    })();

    // 深度合并 AI 配置
    if (!fresh.ai) fresh.ai = { defaultProvider: "deepseek", providers: {} } as AppConfig["ai"];
    fresh.ai = { ...fresh.ai, ...body };

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(fresh, null, 2), "utf-8");
    clearConfigCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: `保存配置失败：${error instanceof Error ? error.message : "未知错误"}` },
      { status: 500 }
    );
  }
}
