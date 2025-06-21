// dashboard.js
document.addEventListener("DOMContentLoaded", () => {
    const ApexCharts = window.ApexCharts;
    // axios가 전역에 import/로드되어 있다고 가정합니다.

    let radialChart = null;
    let lineChart = null;

    // ------------------------------
    // 공통: Axios 요청 시 사용하는 헤더
    // ------------------------------
    const JSON_HEADERS = {
        "Content-Type": "application/json"
    };

    // ------------------------------
    // 최대 칼로리 목표 (예: 2000kcal)
    // ------------------------------
    const maxCalories = 2000;
    function valueToPercent(value) {
        return (value * 100) / maxCalories;
    }

    // ------------------------------
    // 1) 오늘 날짜를 "YYYY-MM-DD" 형식으로 반환
    // ------------------------------
    function getTodayString() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    }

    // ------------------------------
    // 2) 오늘 BMR / 오늘 섭취 합계 / 오늘 운동 합계 조회 함수 (Axios 사용)
    // ------------------------------
    async function fetchTodayBmr() {
        try {
            const response = await axios.post(
                "/api/dashboard/bmr",
                {},
                { headers: JSON_HEADERS }
            );
            return response.data.bmr;
        } catch (err) {
            throw new Error("BMR 조회 실패");
        }
    }

    async function fetchIntakeForDate(dateStr) {
        try {
            const response = await axios.post(
                "/api/dashboard/food/kcal",
                { intakeDate: dateStr },
                { headers: JSON_HEADERS }
            );
            // 백엔드에서 { intakeSum: number } 형태로 응답한다고 가정
            return response.data.intakeSum ?? 0;
        } catch (err) {
            throw new Error("오늘 섭취 합계 조회 실패");
        }
    }

    async function fetchExerciseForDate(dateStr) {
        try {
            const response = await axios.post(
                "/api/dashboard/exercise/kcal",
                { exerciseDate: dateStr },
                { headers: JSON_HEADERS }
            );
            // 백엔드에서 { exerciseSum: number } 형태로 응답한다고 가정
            return response.data.exerciseSum ?? 0;
        } catch (err) {
            throw new Error("오늘 운동 합계 조회 실패");
        }
    }

    // ------------------------------
    // 3) 오늘 먹은 음식 목록 / 오늘 한 운동 목록 조회 (Axios 사용)
    // ------------------------------
    async function fetchTodayFoodList(dateStr) {
        try {
            const response = await axios.post(
                "/api/dashboard/foods",
                { intakeDate: dateStr },
                { headers: JSON_HEADERS }
            );
            return response.data;
        } catch (err) {
            throw new Error("오늘 음식 리스트 조회 실패");
        }
    }

    async function fetchTodayExerciseList(dateStr) {
        try {
            const response = await axios.post(
                "/api/dashboard/exercises",
                { exerciseDate: dateStr },
                { headers: JSON_HEADERS }
            );
            return response.data;
        } catch (err) {
            throw new Error("오늘 운동 리스트 조회 실패");
        }
    }

    // ------------------------------
    // 4) 연간 기록 비교 데이터 조회 (Axios 사용)
    // ------------------------------
    async function fetchYearIntakeCompare(year) {
        try {
            const response = await axios.post(
                "/api/dashboard/food/kcal/avg/year",
                { intakeYear: parseInt(year) },
                { headers: JSON_HEADERS }
            );
            return response.data;
        } catch (err) {
            throw new Error("연간 섭취 비교 조회 실패");
        }
    }

    async function fetchYearExerciseCompare(year) {
        try {
            const response = await axios.post(
                "/api/dashboard/exercise/kcal/avg/year",
                { exerciseYear: parseInt(year) },
                { headers: JSON_HEADERS }
            );
            return response.data;
        } catch (err) {
            throw new Error("연간 운동 비교 조회 실패");
        }
    }

    // -------------------------------------------------
    // 5) 원형 차트 옵션 생성 (오늘 데이터 기반)
    // -------------------------------------------------
    async function createRadialOptions(size = 330) {
        const today = getTodayString();
        let bmr = 0,
            intakeValue = 0,
            exerciseValue = 0;

        try {
            [bmr, intakeValue, exerciseValue] = await Promise.all([
                fetchTodayBmr(),
                fetchIntakeForDate(today),
                fetchExerciseForDate(today)
            ]);
        } catch (e) {
            console.error("오늘 데이터 조회 에러:", e);
            bmr = 0;
            intakeValue = 0;
            exerciseValue = 0;
        }

        const intakeExceeded = intakeValue > maxCalories;
        const exerciseExceeded = exerciseValue > maxCalories;

        return {
            series: [
                valueToPercent(intakeValue), // 섭취 비율
                valueToPercent(exerciseValue) // 운동 비율
            ],
            chart: {
                height: size,
                width: size,
                type: "radialBar",
                animations: {
                    enabled: true,
                    easing: "easeinout",
                    speed: 800
                }
            },
            plotOptions: {
                radialBar: {
                    size: "85%",
                    startAngle: -90,
                    endAngle: 270,
                    hollow: { size: "30%" },
                    track: {
                        background: "#f1f5f9",
                        strokeWidth: "100%",
                        margin: 4
                    },
                    dataLabels: {
                        name: {
                            fontSize: size > 250 ? "18px" : "16px",
                            color: "#374151"
                        },
                        value: {
                            fontSize: size > 250 ? "16px" : "14px",
                            color: "#111827",
                            formatter: (val, opts) => {
                                if (opts.seriesIndex === 0) return intakeValue + " kcal";
                                if (opts.seriesIndex === 1) return exerciseValue + " kcal";
                                return val + "%";
                            }
                        },
                        total: {
                            show: true,
                            showAlways: false,
                            label: "평균",
                            fontSize: size > 250 ? "16px" : "14px",
                            fontWeight: 600,
                            color: "#374151",
                            formatter: () => {
                                const avgPercent = Math.round(
                                    (valueToPercent(intakeValue) + valueToPercent(exerciseValue)) / 2
                                );
                                return avgPercent + "%";
                            }
                        }
                    }
                }
            },
            fill: [
                {
                    type: "gradient",
                    gradient: {
                        shade: "light",
                        type: "horizontal",
                        shadeIntensity: 0.6,
                        gradientToColors: [intakeExceeded ? "#fbbf24" : "#10b981"],
                        inverseColors: false,
                        opacityFrom: 1,
                        opacityTo: 1,
                        stops: [0, 50, 51, 100]
                    }
                },
                {
                    type: "gradient",
                    gradient: {
                        shade: "light",
                        type: "horizontal",
                        shadeIntensity: 0.6,
                        gradientToColors: [exerciseExceeded ? "#f472b6" : "#22d3ee"],
                        inverseColors: false,
                        opacityFrom: 1,
                        opacityTo: 1,
                        stops: [0, 50, 51, 100]
                    }
                }
            ],
            colors: [intakeExceeded ? "#f59e0b" : "#33C181", exerciseExceeded ? "#ec4899" : "#11C6CF"],
            labels: ["섭취", "운동"],
            legend: { show: false },
            stroke: { lineCap: "round" }
        };
    }

    // -------------------------------------------------
    // 6) 오늘 카드형 UI 렌더링
    // -------------------------------------------------
    async function renderTodayCards() {
        const today = getTodayString();

        let foodList = [],
            exerciseList = [];
        try {
            [foodList, exerciseList] = await Promise.all([
                fetchTodayFoodList(today),
                fetchTodayExerciseList(today)
            ]);
        } catch (e) {
            console.error("오늘 카드형 데이터 조회 실패:", e);
            foodList = [];
            exerciseList = [];
        }

        // 식단(음식 목록) 카드
        const foodListUl = document.querySelector(".food-list");
        if (foodListUl) {
            foodListUl.innerHTML = "";
            if (foodList.length === 0) {
                const li = document.createElement("li");
                li.innerText = "오늘 먹은 음식이 없습니다.";
                foodListUl.appendChild(li);
            } else {
                foodList.forEach((item) => {
                    const li = document.createElement("li");
                    // ✱ 백엔드에서 계산해준 intakeKcal 사용 (unitKcal×intake 계산 생략)
                    const totalKcal = item.intakeKcal ?? 0;
                    li.innerHTML = `<strong>${item.foodName}</strong> ${item.intake}g (${totalKcal} kcal)`;
                    foodListUl.appendChild(li);
                });
            }
        }

        // 운동(운동 목록) 카드
        const exerciseListUl = document.querySelector(".exercise-list");
        if (exerciseListUl) {
            exerciseListUl.innerHTML = "";
            if (exerciseList.length === 0) {
                const li = document.createElement("li");
                li.innerText = "오늘 한 운동이 없습니다.";
                exerciseListUl.appendChild(li);
            } else {
                exerciseList.forEach((item) => {
                    const li = document.createElement("li");
                    li.innerHTML = `<strong>${item.exerciseName}</strong> ${item.exerciseMin}분 (${item.exerciseKcal} kcal)`;
                    exerciseListUl.appendChild(li);
                });
            }
        }

        // 카드 우측 상단 “섭취/운동” 텍스트 업데이트
        const intakeValueElem = document.querySelector(".intake-value");
        const exerciseValueElem = document.querySelector(".exercise-value");
        if (intakeValueElem) {
            try {
                const intakeSum = await fetchIntakeForDate(today);
                intakeValueElem.innerText = `${intakeSum} kcal`;
            } catch {
                intakeValueElem.innerText = `0 kcal`;
            }
        }
        if (exerciseValueElem) {
            try {
                const exerciseSum = await fetchExerciseForDate(today);
                exerciseValueElem.innerText = `${exerciseSum} kcal`;
            } catch {
                exerciseValueElem.innerText = `0 kcal`;
            }
        }
    }

    // -------------------------------------------------
    // 7) 연간 기록 비교 라인 차트 옵션 생성 함수
    // -------------------------------------------------
    async function fetchYearIntakeMy(year) {
        try {
            const response = await axios.post(
                "/api/dashboard/food/kcal/year",
                { intakeYear: parseInt(year) },
                { headers: JSON_HEADERS }
            );
            // 백엔드에서 [{ intakeDate: "YYYY-MM-DD", intakeSum: number }, …] 형태로 응답한다고 가정
            return response.data;
        } catch (err) {
            throw new Error("나의 섭취 합계 조회 실패");
        }
    }

    async function fetchYearIntakeAvg(year) {
        try {
            const response = await axios.post(
                "/api/dashboard/food/kcal/avg/year",
                { intakeYear: parseInt(year) },
                { headers: JSON_HEADERS }
            );
            // 백엔드에서 [{ intakeDate: "YYYY-MM-DD", avgIntakeKcal: number }, …] 형태로 응답한다고 가정
            return response.data;
        } catch (err) {
            throw new Error("평균 섭취 합계 조회 실패");
        }
    }

    async function fetchYearExerciseMy(year) {
        try {
            const response = await axios.post(
                "/api/dashboard/exercise/kcal/year",
                { exerciseYear: parseInt(year) },
                { headers: JSON_HEADERS }
            );
            // 백엔드에서 [{ exerciseDate: "YYYY-MM-DD", exerciseSum: number }, …] 형태로 응답한다고 가정
            return response.data;
        } catch (err) {
            throw new Error("나의 운동 합계 조회 실패");
        }
    }

    async function fetchYearExerciseAvg(year) {
        try {
            const response = await axios.post(
                "/api/dashboard/exercise/kcal/avg/year",
                { exerciseYear: parseInt(year) },
                { headers: JSON_HEADERS }
            );
            // 백엔드에서 [{ EXERCISE_DATE: "YYYY-MM-DD", avgKcal: number }, …] 형태로 응답한다고 가정
            return response.data;
        } catch (err) {
            throw new Error("평균 운동 합계 조회 실패");
        }
    }

    async function createLineOptions(compareType, year) {
        const myData = [];
        const avgData = [];
        const categories = [];

        if (compareType === "섭취") {
            // 1) 두 API를 병렬 호출
            let [myList, avgList] = [[], []];
            try {
                [myList, avgList] = await Promise.all([
                    fetchYearIntakeMy(year),
                    fetchYearIntakeAvg(year)
                ]);
            } catch (error) {
                console.error("섭취 연간 데이터 로딩 실패:", error);
                myList = [];
                avgList = [];
            }

            // 2) JSON 필드 이름에 맞춰 매핑
            //    - myList: [{ intakeDate, intakeSum }, …]
            //    - avgList: [{ intakeDate, avgIntakeKcal }, …]
            const mapByDate = {};

            myList.forEach((item) => {
                // item.intakeDate, item.intakeSum 사용
                const dateKey = item.intakeDate;
                if (!dateKey) return;
                mapByDate[dateKey] = {
                    my: item.intakeSum ?? 0,
                    avg: 0
                };
            });

            avgList.forEach((item) => {
                const dateKey = item.intakeDate;
                if (!dateKey) return;
                if (!mapByDate[dateKey]) {
                    mapByDate[dateKey] = { my: 0, avg: 0 };
                }
                mapByDate[dateKey].avg = item.avgIntakeKcal ?? 0;
            });

            // 3) 날짜 순 정렬
            const sortedDates = Object.keys(mapByDate).sort(
                (a, b) => new Date(a) - new Date(b)
            );

            // 4) 정렬된 날짜 순서대로 myData, avgData, categories 채우기
            sortedDates.forEach((dateStr) => {
                const { my, avg } = mapByDate[dateStr];
                myData.push(my);
                avgData.push(avg);

                const dt = new Date(dateStr);
                const mm = String(dt.getMonth() + 1).padStart(2, "0");
                const dd = String(dt.getDate()).padStart(2, "0");
                categories.push(`${mm}-${dd}`);
            });

        } else {
            // “운동” 분기
            let [myList, avgList] = [[], []];
            try {
                [myList, avgList] = await Promise.all([
                    fetchYearExerciseMy(year),
                    fetchYearExerciseAvg(year)
                ]);
            } catch (error) {
                console.error("운동 연간 데이터 로딩 실패:", error);
                myList = [];
                avgList = [];
            }

            // JSON 필드 이름에 맞춰 매핑
            // - myList: [{ exerciseDate, exerciseSum }, …]
            // - avgList: [{ EXERCISE_DATE, avgKcal }, …]
            const mapByDate = {};

            myList.forEach((item) => {
                const dateKey = item.exerciseDate;
                if (!dateKey) return;
                mapByDate[dateKey] = {
                    my: item.exerciseSum ?? 0,
                    avg: 0
                };
            });

            avgList.forEach((item) => {
                // NOTE: avgList 배열의 키: EXERCISE_DATE
                const dateKey = item.EXERCISE_DATE;
                if (!dateKey) return;

                if (!mapByDate[dateKey]) {
                    mapByDate[dateKey] = { my: 0, avg: 0 };
                }
                mapByDate[dateKey].avg = item.avgKcal ?? 0;
            });

            // 날짜 순 정렬
            const sortedDates = Object.keys(mapByDate).sort(
                (a, b) => new Date(a) - new Date(b)
            );

            sortedDates.forEach((dateStr) => {
                const { my, avg } = mapByDate[dateStr];
                myData.push(my);
                avgData.push(avg);

                const dt = new Date(dateStr);
                const mm = String(dt.getMonth() + 1).padStart(2, "0");
                const dd = String(dt.getDate()).padStart(2, "0");
                categories.push(`${mm}-${dd}`);
            });
        }

        return {
            series: [
                { name: "나의 기록", data: myData },
                { name: "평균 기록", data: avgData }
            ],
            chart: {
                height: 240,
                type: "line",
                animations: { enabled: true, easing: "easeinout", speed: 800 }
            },
            stroke: {
                width: [5, 3],
                curve: "smooth",
                dashArray: [0, 5]
            },
            xaxis: {
                type: "category",
                categories: categories,
                tickAmount: 6,
                labels: { style: { fontSize: "12px", colors: "#6b7280" } }
            },
            yaxis: {
                min: 0,
                max: 4000,
                tickAmount: 5,
                labels: {
                    formatter: (val) => val,
                    style: { fontSize: "12px", colors: "#6b7280" }
                },
                title: {
                    text: "kcal",
                    rotate: -90,
                    style: { fontSize: "14px", color: "#6b7280", fontWeight: 500 }
                }
            },
            title: {
                text: `기록 비교 - ${compareType} (${year})`,
                align: "left",
                style: { fontSize: "16px", color: "#666" }
            },
            fill: {
                type: "gradient",
                gradient: {
                    shade: "dark",
                    gradientToColors: ["#33C181", "#11C6CF"],
                    shadeIntensity: 1,
                    type: "horizontal",
                    opacityFrom: 1,
                    opacityTo: 1,
                    stops: [0, 100, 100, 100]
                }
            },
            colors: ["#33C181", "#11C6CF"],
            markers: { size: 0, hover: { size: 6 } },
            tooltip: {
                shared: true,
                intersect: false,
                y: { formatter: (val) => val + " kcal" }
            },
            legend: { show: true, position: "top", horizontalAlign: "right" },
            grid: { borderColor: "#f3f4f6", padding: { left: 0, right: 0 } }
        };
    }

    // ------------------------------
    // 8) 실제 렌더링 작업
    // ------------------------------
    async function renderChart() {
        const chartArea = document.querySelector(".chart-area");
        const isChecklistOpen = document
            .querySelector(".grid")
            .classList.contains("checklist-open");

        const size = isChecklistOpen ? 240 : 330;
        if (radialChart) radialChart.destroy();

        const opts = await createRadialOptions(size);
        radialChart = new ApexCharts(chartArea, opts);
        radialChart.render();
    }

    async function renderLineChart() {
        const compareSelector = document.querySelector(".compare-selector");
        const yearSelector = document.querySelector(".year-selector");
        const compareType = compareSelector.value; // "섭취" or "운동"
        const year = yearSelector.value; // "2025" 등

        if (lineChart) lineChart.destroy();

        const opts = await createLineOptions(compareType, year);
        lineChart = new ApexCharts(document.querySelector(".chart-container"), opts);
        lineChart.render();
    }

    // ------------------------------
    // 9) 페이지 로드 시 초기 실행
    //    - 차트, 오늘 카드 목록, 라인차트 렌더링
    //    - 체크리스트 조회/렌더링 (오늘 날짜 기준)
    // ------------------------------
    (async function initDashboard() {
        await renderChart();
        await renderTodayCards();
        await renderLineChart();
        await renderCheckList(); // ↙ 수정된 체크리스트 렌더링 호출
    })();

    // =============================================================
    //            ★★★ 수정된 부분: 토글 로직 전역 등록 순서 ★★★
    // =============================================================

    // ------------------------------
    // 10) (수정) 실제 토글 로직을 전역에 먼저 등록
    // ------------------------------
    window.toggleChecklist = function () {
        const panel = document.getElementById("checklistPanel");
        const grid = document.querySelector(".grid");

        if (panel.classList.contains("open")) {
            panel.classList.remove("open");
            grid.classList.remove("checklist-open");
        } else {
            panel.classList.add("open");
            grid.classList.add("checklist-open");
        }
    };

    // ------------------------------
    // 11) (수정) 전역 함수를 래핑해서 “원본 호출 → 차트 재렌더링” 흐름 만들기
    // ------------------------------
    const originalToggleChecklist = window.toggleChecklist; // (10)에서 등록한 실제 로직
    window.toggleChecklist = () => {
        originalToggleChecklist(); // 실제 패널 토글
        window.requestAnimationFrame(() => {
            renderChart(); // 차트 크기 재조정
        });
    };
    // =============================================================

    // ------------------------------
    // 12) 기록 비교 옵션 변경 리스너
    // ------------------------------
    document.querySelector(".compare-selector").addEventListener("change", renderLineChart);
    document.querySelector(".year-selector").addEventListener("change", renderLineChart);

    // ------------------------------
    // 13) 체크박스 상태 변경 처리
    //      (체크 시 라벨에 취소선, 색상 회색 처리) — 이벤트 리스너 내부에서 처리
    // ------------------------------
    document.addEventListener("change", (e) => {
        if (e.target.type === "checkbox" && e.target.closest(".checklist-item")) {
            // 별도 로직 없음, 개별 체크박스에 붙은 이벤트 내부에서 처리
        }
    });

    // ------------------------------
    // 15) 체크리스트 조회 함수 (오늘 날짜 기준, Axios 사용)
    // ------------------------------
    async function fetchCheckList() {
        const today = getTodayString(); // 오늘 날짜를 구해서
        try {
            const response = await axios.post(
                "/api/dashboard/checklist/items",
                { checkDate: today },
                { headers: JSON_HEADERS }
            );
            return response.data;
        } catch (err) {
            throw new Error("체크리스트 조회 실패");
        }
    }

    // ------------------------------
    // 16) 체크리스트 가져온 뒤 DOM에 렌더링 + 체크 상태 변경 시 서버에 반영
    // ------------------------------
    async function renderCheckList() {
        let items = [];
        try {
            items = await fetchCheckList();
        } catch (e) {
            console.error("체크리스트 로딩 실패:", e);
            items = [];
        }

        const checklistContent = document.querySelector(".checklist-content");
        if (!checklistContent) return;

        // 기존 항목 삭제
        checklistContent.innerHTML = "";

        if (items.length === 0) {
            const emptyDiv = document.createElement("div");
            emptyDiv.className = "no-items";
            emptyDiv.innerText = "체크리스트 항목이 없습니다.";
            checklistContent.appendChild(emptyDiv);
            return;
        }

        items.forEach((item) => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "checklist-item";

            // 체크박스 생성
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `check-${item.checkId}`;
            checkbox.checked = item.isCheck === 1;

            // 체크/해제 시 서버로 PUT 요청
            checkbox.addEventListener("change", async () => {
                const newValue = checkbox.checked ? 1 : 0;
                try {
                    await axios.put(
                        "/api/dashboard/checklist/item/check",
                        {
                            checkId: item.checkId,
                            isCheck: newValue
                        },
                        { headers: JSON_HEADERS }
                    );
                    console.log(`checkId=${item.checkId} 상태 변경: ${newValue}`);
                } catch (err) {
                    console.error("체크 상태 업데이트 실패:", err);
                    // 업데이트 실패 시 다시 이전 상태로 되돌리기
                    checkbox.checked = !checkbox.checked;
                }
            });

            // 라벨 생성
            const label = document.createElement("label");
            label.setAttribute("for", `check-${item.checkId}`);
            label.innerText = item.checkContent || "내용 없음";
            if (item.isCheck === 1) {
                label.style.textDecoration = "line-through";
                label.style.color = "#9ca3af";
            }

            // 체크 상태 변화에 따라 라벨 스타일 동기화
            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    label.style.textDecoration = "line-through";
                    label.style.color = "#9ca3af";
                } else {
                    label.style.textDecoration = "none";
                    label.style.color = "#374151";
                }
            });

            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);
            checklistContent.appendChild(itemDiv);
        });
    }
});
