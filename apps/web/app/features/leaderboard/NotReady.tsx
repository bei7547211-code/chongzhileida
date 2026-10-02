import { Link } from "react-router";
import { IconChart } from "../../components/icons";
export function LeaderboardNotReady() {
  return <section className="card my-6 p-8">
    <IconChart size={32} className="text-accent" />
    <h2 className="mt-5 text-xl font-semibold">评测数据尚未接入</h2>
    <p className="mt-3 max-w-xl text-sm leading-7 text-ink-3">榜单页面与评测展示能力已恢复。本站尚未发布第一批评测结果，所以暂不显示模型名次、价格和分数。完成来源核对与数据导入后，这里会展示真实排名。</p>
    <Link to="/history" className="mt-5 inline-flex text-sm font-semibold text-accent">先查看已有的重置记录 →</Link>
  </section>;
}
