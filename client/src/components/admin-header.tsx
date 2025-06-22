import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function AdminHeader() {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent mb-2">
          后台管理
        </h1>
        <p className="text-gray-400">管理 Reddit 数据抓取和想法数据库</p>
      </div>
      <Link href="/">
        <Button
          variant="outline"
          className="border-neon-blue/50 text-neon-blue hover:bg-neon-blue/20"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回首页
        </Button>
      </Link>
    </div>
  );
}