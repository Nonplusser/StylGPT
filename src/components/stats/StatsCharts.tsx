
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ChartData = {
    name: string;
    total: number;
}[];

type RadarData = {
    color: string;
    count: number;
}[];

const isValidColor = (strColor: string) => {
    if (strColor.toLowerCase() === 'other') return false;
    const s = new Option().style;
    s.color = strColor;
    return s.color !== '';
};

export default function StatsCharts({ typeData, colorData, radarData }: { typeData: ChartData, colorData: ChartData, radarData: RadarData }) {
    return (
        <div className="space-y-8">
            <div className="grid gap-8 md:grid-cols-2">
                <Card>
                    <CardHeader>
                    <CardTitle>Item Distribution</CardTitle>
                    <CardDescription>A breakdown of your wardrobe by item type.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={typeData}>
                                <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                />
                                <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                                />
                                <Tooltip
                                    cursor={{fill: 'hsl(var(--muted))'}}
                                    contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}}
                                />
                                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="bg-muted/30">
                    <CardHeader>
                        <CardTitle>Color Distribution</CardTitle>
                        <CardDescription>A breakdown of your wardrobe by color.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                                <Pie
                                    data={colorData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    dataKey="total"
                                >
                                    {colorData.map((entry) => (
                                        <Cell 
                                            key={`cell-${entry.name}`} 
                                            fill={isValidColor(entry.name) ? entry.name.toLowerCase() : 'hsl(var(--muted-foreground))'} 
                                            stroke={isValidColor(entry.name) ? entry.name.toLowerCase() : 'hsl(var(--muted-foreground))'}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    cursor={{fill: 'hsl(var(--muted))'}}
                                    contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Color Palette Radar</CardTitle>
                    <CardDescription>A spider web view of your top clothing colors.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="color" tick={(props) => {
                                const { x, y, payload } = props;
                                const color = isValidColor(payload.value) ? payload.value.toLowerCase() : 'hsl(var(--foreground))';
                                return (
                                    <text
                                        x={x}
                                        y={y}
                                        dy={y < 200 ? -4 : 16}
                                        textAnchor="middle"
                                        fill={color}
                                        fontSize={12}
                                    >
                                        {payload.value}
                                    </text>
                                );
                            }}/>
                            <PolarRadiusAxis angle={30} domain={[0, 'dataMax + 2']} />
                            <Radar name="Colors" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                             <Tooltip
                                cursor={{stroke: 'hsl(var(--muted))', strokeWidth: 2, strokeDasharray: '3 3'}}
                                contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
