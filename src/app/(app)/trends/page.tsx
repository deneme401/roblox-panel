import { Suspense } from "react";
import { Topbar } from "@/components/layout/topbar";
import { getDiscoverGames } from "@/lib/roblox/queries";
import { TrendsTable } from "./trends-table";

export default async function TrendsPage() {
  const { games } = await getDiscoverGames();
  return (
    <>
      <Topbar title="Trendler" />
      <Suspense>
        <TrendsTable games={games} />
      </Suspense>
    </>
  );
}
