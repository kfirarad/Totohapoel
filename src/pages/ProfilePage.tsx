import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useUserStatsQuery } from "@/hooks/useQueries";

const chartConfig = {
  user: {
    label: "משתמש",
    color: "hsl(var(--chart-3))",
  },
  shared: {
    label: "משותף",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export const ProfilePage = () => {
  const { profile } = useAuth();
  const {
    data: stats,
    isLoading,
  } = useUserStatsQuery(profile?.id);
  if (isLoading) return <div>Loading...</div>


  console.log('stats', stats);
  const chartData = stats?.map((stat) => ({
    column: stat.columns.name,
    user: stat.correct_guesses || 0,
    shared: stat.columns.group_bet_correct_guesses || 0,
  })) || [];


  console.log('chartData', chartData);


  return (<div className="p-4">
    <h1 className="text-2xl font-bold">{profile?.name}</h1>
    <h2>{profile?.email}</h2>

    <Card>
      <CardHeader>
        <CardTitle>הטורים האחרונים</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="column"
              tickLine
              tickMargin={10}
              axisLine
            />
            <ChartTooltip
              cursor
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Bar dataKey="user" fill="var(--color-user)" radius={4} />
            <Bar dataKey="shared" fill="var(--color-shared)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  </div>
  );
};

