/* Global dashboard controller for loading API data and updating the UI */
(function () {
    const form = document.getElementById("filtersForm");
    const statusEl = document.getElementById("statusMessage");
    const tableBody = document.getElementById("tripTableBody");
    const tableSummary = document.getElementById("tableSummary");
    const currentPageEl = document.getElementById("currentPage");
    const prevPageBtn = document.getElementById("prevPage");
    const nextPageBtn = document.getElementById("nextPage");
    const pageSizeSelect = document.getElementById("pageSize");

    const state = {
        filters: {},
        charts: {
            distance: null
        },
        totalTrips: 0,
        page: 1,
        pageSize: parseInt(pageSizeSelect.value, 10) || 10
    };

    const kmToMiles = (km) => (km ?? 0) * 0.621371;

    const isChartAvailable = () => typeof window.Chart !== "undefined";

    const toNumber = (value) => {
        if (value === null || value === undefined) {
            return null;
        }
        const num = Number(value);
        return Number.isNaN(num) ? null : num;
    };

    const toTitleCase = (value) => {
        if (!value) {
            return "N/A";
        }
        return value
            .toString()
            .split("_")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
    };

    const setStatus = (message, kind = "info") => {
        if (!statusEl) {
            return;
        }
        statusEl.textContent = message;
        statusEl.dataset.kind = kind;
    };

    const collectFilters = () => {
        const filters = {};
        const formData = new FormData(form);

        for (const [key, raw] of formData.entries()) {
            if (key === "page_size") {
                continue;
            }
            if (!raw) {
                continue;
            }
            if (key === "hour_of_day" || key === "day_of_week" || key === "passenger_count") {
                filters[key] = parseInt(raw, 10);
                continue;
            }
            if (key === "min_speed" || key === "max_speed") {
                filters[key] = parseFloat(raw);
                continue;
            }
            filters[key] = raw;
        }

        if (form.elements["is_weekend"].checked) {
            filters.is_weekend = "true";
        }

        return filters;
    };

    const buildQuery = (params) => {
        const search = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null || value === "" || Number.isNaN(value)) {
                return;
            }
            search.append(key, value);
        });
        return search.toString();
    };

    const fetchStatistics = async (groupBy, metrics, filters) => {
        const search = new URLSearchParams();
        search.append("group_by", groupBy);
        metrics.forEach((metric) => search.append("metrics", metric));
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                search.append(key, value);
            }
        });

        const response = await fetch(`/api/trips/statistics?${search.toString()}`);
        if (!response.ok) {
            throw new Error(`Failed to load statistics (${response.status})`);
        }
        return response.json();
    };

    const fetchTrips = async (params) => {
        const search = buildQuery(params);
        const response = await fetch(`/api/trips?${search}`);
        if (!response.ok) {
            throw new Error(`Failed to load trips (${response.status})`);
        }
        return response.json();
    };

    const formatDateTime = (value) => {
        if (!value) {
            return "--";
        }
        const normalised = value.replace(" ", "T");
        const date = new Date(normalised);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return date.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const formatDuration = (seconds) => {
        if (seconds === null || seconds === undefined) {
            return "--";
        }
        const minutes = seconds / 60;
        return `${minutes.toFixed(1)} min`;
    };

    const formatDistance = (km) => {
        if (km === null || km === undefined) {
            return "--";
        }
        return `${kmToMiles(km).toFixed(2)} mi`;
    };

    const formatSpeed = (kmh) => {
        if (kmh === null || kmh === undefined) {
            return "--";
        }
        return `${kmh.toFixed(1)} km/h`;
    };

    const updateMetrics = (hourStats) => {
        const totals = {
            trips: 0,
            duration: 0,
            speed: 0,
            distance: 0
        };

        (hourStats.data || []).forEach((row) => {
            const count = toNumber(row.trip_count) ?? 0;
            totals.trips += count;
            const avgDuration = toNumber(row.avg_duration);
            if (avgDuration !== null) {
                totals.duration += avgDuration * count;
            }
            const avgSpeed = toNumber(row.avg_speed);
            if (avgSpeed !== null) {
                totals.speed += avgSpeed * count;
            }
            const avgDistance = toNumber(row.avg_distance);
            if (avgDistance !== null) {
                totals.distance += avgDistance * count;
            }
        });

        state.totalTrips = totals.trips;

        const avgDuration = totals.trips ? (totals.duration / totals.trips) / 60 : null;
        const avgSpeed = totals.trips ? (totals.speed / totals.trips) : null;
        const avgDistance = totals.trips ? kmToMiles(totals.distance / totals.trips) : null;

        document.getElementById("metric-total-trips").textContent = totals.trips ? totals.trips.toLocaleString() : "0";
        document.getElementById("metric-avg-duration").textContent = avgDuration !== null ? `${avgDuration.toFixed(1)} min` : "--";
        document.getElementById("metric-avg-speed").textContent = avgSpeed !== null ? `${avgSpeed.toFixed(1)} km/h` : "--";
        document.getElementById("metric-avg-distance").textContent = avgDistance !== null ? `${avgDistance.toFixed(2)} mi` : "--";
    };

    const updateInsights = (hourStats, dayStats, distanceStats) => {
        const peakRow = (hourStats.data || []).reduce((best, row) => {
            const current = toNumber(row.trip_count) ?? 0;
            if (!best || current > (toNumber(best.trip_count) ?? 0)) {
                return row;
            }
            return best;
        }, null);

        if (peakRow) {
            const hour = toNumber(peakRow.hour_of_day);
            const tripCount = toNumber(peakRow.trip_count) ?? 0;
            if (hour !== null) {
                document.getElementById("insight-peak-hour").textContent = `Most trips occur around ${hour.toString().padStart(2, "0")}:00 with ${tripCount.toLocaleString()} rides.`;
            } else {
                document.getElementById("insight-peak-hour").textContent = `Most trips occur during peak periods with ${tripCount.toLocaleString()} rides.`;
            }
        } else {
            document.getElementById("insight-peak-hour").textContent = "No hour-of-day data available.";
        }

        const weekendTrips = (dayStats.data || []).reduce((acc, row) => {
            const count = toNumber(row.trip_count) ?? 0;
            const dayValue = toNumber(row.day_of_week);
            if (dayValue === 5 || dayValue === 6) {
                return acc + count;
            }
            return acc;
        }, 0);
        if (state.totalTrips) {
            const ratio = (weekendTrips / state.totalTrips) * 100;
            document.getElementById("insight-weekend").textContent = `${ratio.toFixed(1)}% of trips happen on weekends.`;
        } else {
            document.getElementById("insight-weekend").textContent = "No weekend data available.";
        }

        const speedRows = (hourStats.data || []).map((row) => ({
            ...row,
            avg_speed: toNumber(row.avg_speed),
            hour_of_day: toNumber(row.hour_of_day)
        })).filter((row) => row.avg_speed !== null);
        if (speedRows.length) {
            let fastest = speedRows[0];
            let slowest = speedRows[0];
            speedRows.forEach((row) => {
                if ((row.avg_speed || 0) > (fastest.avg_speed || 0)) {
                    fastest = row;
                }
                if ((row.avg_speed || 0) < (slowest.avg_speed || 0)) {
                    slowest = row;
                }
            });
            if (fastest.hour_of_day !== null && slowest.hour_of_day !== null) {
                document.getElementById("insight-speed").textContent = `Average speed peaks at ${fastest.avg_speed.toFixed(1)} km/h around ${fastest.hour_of_day.toString().padStart(2, "0")}:00 and dips to ${slowest.avg_speed.toFixed(1)} km/h.`;
            } else {
                document.getElementById("insight-speed").textContent = `Average speed ranges between ${slowest.avg_speed.toFixed(1)} km/h and ${fastest.avg_speed.toFixed(1)} km/h.`;
            }
        } else {
            document.getElementById("insight-speed").textContent = "Speed statistics will appear once data is available.";
        }

        const dominantDistance = (distanceStats.data || []).reduce((best, row) => {
            const count = toNumber(row.trip_count) ?? 0;
            if (!best || count > (toNumber(best.trip_count) ?? 0)) {
                return row;
            }
            return best;
        }, null);
        if (dominantDistance) {
            const label = toTitleCase(dominantDistance.distance_category);
            const count = toNumber(dominantDistance.trip_count) ?? 0;
            document.getElementById("insight-distance").textContent = `${label} trips lead with ${count.toLocaleString()} rides.`;
        } else {
            document.getElementById("insight-distance").textContent = "Distance category insight unavailable.";
        }
    };

    const renderDistanceChart = (distanceStats) => {
        if (!isChartAvailable()) {
            console.warn("Chart.js is not available. Skipping distance chart rendering.");
            return;
        }
        const ctx = document.getElementById("distanceChart");
        if (!ctx) {
            return;
        }
        if (state.charts.distance) {
            state.charts.distance.destroy();
            state.charts.distance = null;
        }

        const labels = (distanceStats.data || []).map((row) => toTitleCase(row.distance_category));
        const values = (distanceStats.data || []).map((row) => toNumber(row.trip_count) ?? 0);
        const palette = ["#4e67ff", "#7a5cff", "#1fbf75", "#f08443"];

        if (!labels.length) {
            return;
        }

        state.charts.distance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: palette,
                    borderWidth: 0
                }]
            },
            options: {
                cutout: "65%",
                plugins: {
                    legend: {
                        position: "bottom"
                    }
                }
            }
        });
    };

    const renderTable = (rows) => {
        tableBody.innerHTML = "";
        if (!rows.length) {
            const emptyRow = document.createElement("tr");
            const emptyCell = document.createElement("td");
            emptyCell.colSpan = 8;
            emptyCell.className = "muted";
            emptyCell.textContent = "No trips found for the current filters.";
            emptyRow.appendChild(emptyCell);
            tableBody.appendChild(emptyRow);
            return;
        }

        rows.forEach((trip) => {
            const tr = document.createElement("tr");
            const passengerCount = toNumber(trip.passenger_count);
            tr.innerHTML = `
                <td>${trip.id || "--"}</td>
                <td>${formatDateTime(trip.pickup_datetime)}</td>
                <td>${formatDateTime(trip.dropoff_datetime)}</td>
                <td>${formatDistance(trip.trip_distance_km)}</td>
                <td>${formatDuration(trip.trip_duration)}</td>
                <td>${formatSpeed(toNumber(trip.trip_speed_kmh))}</td>
                <td>${passengerCount !== null ? passengerCount : "--"}</td>
                <td>${toTitleCase(trip.distance_category)}</td>
            `;
            tableBody.appendChild(tr);
        });
    };

    const updatePagination = () => {
        const total = state.totalTrips || 0;
        const limit = state.pageSize;
        const totalPages = total ? Math.ceil(total / limit) : 1;
        const clampedPage = Math.min(state.page, totalPages || 1);
        state.page = clampedPage;

        prevPageBtn.disabled = clampedPage <= 1;
        nextPageBtn.disabled = clampedPage >= totalPages;
        currentPageEl.textContent = `Page ${clampedPage} of ${totalPages || 1}`;

        const start = total ? ((clampedPage - 1) * limit) + 1 : 0;
        const end = total ? Math.min(clampedPage * limit, total) : 0;
        tableSummary.textContent = total ? `Showing ${start} to ${end} of ${total.toLocaleString()} trips` : "No trips for current filters";
    };

    const loadTable = async (page, filters) => {
        state.page = page;
        const params = { ...filters };
        params.limit = state.pageSize;
        params.offset = (page - 1) * state.pageSize;
        try {
            const trips = await fetchTrips(params);
            renderTable(trips);
        } catch (error) {
            console.error(error);
            renderTable([]);
            setStatus("Failed to load trip records", "error");
            state.totalTrips = 0;
        }
        updatePagination();
    };

    const loadDashboard = async () => {
        const filters = collectFilters();
        state.filters = filters;
        setStatus("Loading data...");

        try {
            const [hourStats, dayStats, distanceStats] = await Promise.all([
                fetchStatistics("hour_of_day", ["trip_count", "avg_distance", "avg_duration", "avg_speed"], filters),
                fetchStatistics("day_of_week", ["trip_count"], filters),
                fetchStatistics("distance_category", ["trip_count"], filters)
            ]);

            updateMetrics(hourStats);
            updateInsights(hourStats, dayStats, distanceStats);
            renderDistanceChart(distanceStats);
            await loadTable(1, filters);
            const notices = [];
            if (!isChartAvailable()) {
                notices.push("charts unavailable: library not loaded");
            }
            const noticeSuffix = notices.length ? ` (${notices.join("; ")})` : "";
            setStatus(`Updated ${new Date().toLocaleTimeString()}${noticeSuffix}`);
        } catch (error) {
            console.error(error);
            setStatus("Failed to load data", "error");
            state.totalTrips = 0;
            renderTable([]);
            updatePagination();
        }
    };

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        loadDashboard();
    });

    document.getElementById("resetFilters").addEventListener("click", () => {
        form.reset();
        pageSizeSelect.value = "10";
        state.pageSize = 10;
        loadDashboard();
    });

    prevPageBtn.addEventListener("click", () => {
        if (state.page > 1) {
            loadTable(state.page - 1, state.filters);
        }
    });

    nextPageBtn.addEventListener("click", () => {
        const totalPages = state.totalTrips ? Math.ceil(state.totalTrips / state.pageSize) : 1;
        if (state.page < totalPages) {
            loadTable(state.page + 1, state.filters);
        }
    });

    pageSizeSelect.addEventListener("change", () => {
        state.pageSize = parseInt(pageSizeSelect.value, 10) || 10;
        loadDashboard();
    });

    loadDashboard();
})();
