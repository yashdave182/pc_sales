
import { Box, Card, CardContent, Grid, Skeleton, Stack, TableCell, TableRow } from "@mui/material";

export function MetricCardSkeleton() {
    return (
        <Card sx={{ height: "100%" }}>
            <CardContent>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                    <Skeleton variant="rounded" width={40} height={40} />
                    <Box sx={{ width: "100%" }}>
                        <Skeleton variant="text" width="60%" />
                        <Skeleton variant="text" width="40%" height={30} />
                    </Box>
                </Stack>
                <Skeleton variant="text" width="30%" />
            </CardContent>
        </Card>
    );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
    return (
        <Box sx={{ width: "100%", overflow: "hidden" }}>
            {/* Header Mock */}
            <Stack direction="row" spacing={1} sx={{ mb: 1, px: 1 }}>
                {Array.from(new Array(columns)).map((_, i) => (
                    <Skeleton key={i} variant="rectangular" height={40} sx={{ flex: 1, borderRadius: 1 }} />
                ))}
            </Stack>

            {/* Rows */}
            <Stack spacing={1}>
                {Array.from(new Array(rows)).map((_, i) => (
                    <Skeleton key={i} variant="rectangular" height={50} sx={{ borderRadius: 1 }} />
                ))}
            </Stack>
        </Box>
    );
}

export function ListSkeleton({ count = 3, itemHeight = 100 }: { count?: number, itemHeight?: number }) {
    return (
        <Stack spacing={2}>
            {Array.from(new Array(count)).map((_, i) => (
                <Card key={i} variant="outlined" sx={{ height: itemHeight }}>
                    <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                        <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                            <Skeleton variant="circular" width={40} height={40} />
                            <Box sx={{ flex: 1 }}>
                                <Skeleton variant="text" width="40%" />
                                <Skeleton variant="text" width="80%" />
                            </Box>
                            <Skeleton variant="rectangular" width={60} height={20} />
                        </Stack>
                    </CardContent>
                </Card>
            ))}
        </Stack>
    );
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
    return (
        <Card>
            <CardContent>
                <Skeleton variant="text" width={150} height={30} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 1 }} />
            </CardContent>
        </Card>
    )
}

export function DashboardSkeleton() {
    return (
        <Box>
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {[1, 2, 3, 4].map(i => (
                    <Grid item xs={12} sm={6} md={3} key={i}>
                        <MetricCardSkeleton />
                    </Grid>
                ))}
            </Grid>
            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <ChartSkeleton />
                </Grid>
                <Grid item xs={12} md={4}>
                    <Stack spacing={2}>
                        <Skeleton variant="text" width={100} height={30} />
                        <ListSkeleton count={5} />
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    )
}
