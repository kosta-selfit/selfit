// kcal.js

// -----------------------------
// 1) 공통: Axios 기본 설정
// -----------------------------
axios.defaults.headers.common["Content-Type"] = "application/json";

// -----------------------------
// 2) 연동할 백엔드 엔드포인트 정리
// -----------------------------
// (Spring Controller 기준 URL들)
// - 기초대사량 조회:       POST /api/dashboard/bmr
//   → 응답 예시: { "bmr": 1550 }
//
// - 연도별 섭취 칼로리 조회: POST /api/dashboard/food/kcal/year
//   → 응답 예시:
//      [
//        { "intakeDate": "2025-05-28", "intakeSum": 2300 },
//        { "intakeDate": "2025-05-29", "intakeSum": 2450 },
//        …
//      ]
//
// - 연도별 운동 소모 칼로리 조회: POST /api/dashboard/exercise/kcal/year
//   → 응답 예시:
//      [
//        { "exerciseDate": "2025-05-28", "exerciseSum": 800 },
//        { "exerciseDate": "2025-05-29", "exerciseSum": 950 },
//        …
//      ]
//
// - 특정 날짜의 섭취 칼로리 조회: POST /api/dashboard/food/kcal
//   → 응답 예시:
//      { "intakeDate": "2025-06-11", "intakeSum": 2802 }
//
// - 특정 날짜의 운동 소모 칼로리 조회: POST /api/dashboard/exercise/kcal
//   → 응답 예시:
//      { "exerciseDate": "2025-06-11", "exerciseSum": 541 }

// --------------------------------------------------
// 3) 기초대사량(BMR) 조회 함수 (axios)
// --------------------------------------------------
async function fetchBmr() {
    try {
        const res = await axios.post("/api/dashboard/bmr", {});
        // { bmr: 1550 } 형태로 돌아온다고 가정
        return res.data.bmr;
    } catch (err) {
        throw new Error("BMR 조회 실패");
    }
}

// --------------------------------------------------
// 4) 연도별 섭취·소모 데이터 조회 함수 (axios)
// --------------------------------------------------
async function fetchYearIntake(year) {
    try {
        const res = await axios.post("/api/dashboard/food/kcal/year", {
            intakeYear: year,
        });
        return res.data; // [{ intakeDate, intakeSum }, ...]
    } catch (err) {
        throw new Error("연도별 섭취 데이터 조회 실패");
    }
}

async function fetchYearExercise(year) {
    try {
        const res = await axios.post("/api/dashboard/exercise/kcal/year", {
            exerciseYear: year,
        });
        return res.data; // [{ exerciseDate, exerciseSum }, ...]
    } catch (err) {
        throw new Error("연도별 운동 데이터 조회 실패");
    }
}

// --------------------------------------------------
// 5) 특정 날짜의 섭취·소모 데이터 조회 함수 (axios)
// --------------------------------------------------
async function fetchDateIntake(dateStr) {
    try {
        const res = await axios.post("/api/dashboard/food/kcal", {
            intakeDate: dateStr,
        });
        return res.data; // { intakeDate, intakeSum }
    } catch (err) {
        throw new Error("해당 날짜 섭취 데이터 조회 실패");
    }
}

async function fetchDateExercise(dateStr) {
    try {
        const res = await axios.post("/api/dashboard/exercise/kcal", {
            exerciseDate: dateStr,
        });
        return res.data; // { exerciseDate, exerciseSum }
    } catch (err) {
        throw new Error("해당 날짜 운동 데이터 조회 실패");
    }
}

// --------------------------------------------------
// 6) 연도 선택 드롭다운 핸들링
// --------------------------------------------------
function setupYearDropdown(onYearChange) {
    const select = document.getElementById("yearSelect");
    if (!select) return;
    select.addEventListener("change", () => {
        const year = parseInt(select.value);
        onYearChange(year);
    });
}

// --------------------------------------------------
// 7) 라인 차트 렌더링 함수 (ApexCharts 사용, axios 호출)
// --------------------------------------------------
async function renderLineChart(year) {
    // 1) 먼저 기초대사량을 조회
    let bmr = 0;
    try {
        bmr = await fetchBmr();
    } catch (e) {
        console.error(e);
        alert("기초대사량을 가져오는 중 오류가 발생했습니다.");
        return;
    }

    // 2) 연도별 섭취/운동 데이터 조회
    let intakeList = [],
        exerciseList = [];
    try {
        [intakeList, exerciseList] = await Promise.all([
            fetchYearIntake(year),
            fetchYearExercise(year),
        ]);
    } catch (e) {
        console.error(e);
        alert("연도별 칼로리 데이터를 가져오는 중 오류가 발생했습니다.");
        return;
    }

    // 3) 받아온 JSON을 ApexCharts용 series 포맷으로 변환
    const intakeData = intakeList.map((item) => ({
        x: new Date(item.intakeDate),
        y: item.intakeSum,
    }));

    const burnData = exerciseList.map((item) => ({
        x: new Date(item.exerciseDate),
        y: bmr + item.exerciseSum,
    }));

    // 4) ApexCharts 옵션 설정
    const options = {
        chart: {
            type: "line",
            height: 350,
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    reset: true,
                },
            },
        },
        series: [
            { name: "섭취", data: intakeData },
            { name: "기초대사량 + 운동", data: burnData },
        ],
        legend: {
            show: true,
            position: "top",
            horizontalAlign: "right",
            markers: { width: 10, height: 10, radius: 12 },
            itemMargin: { horizontal: 10, vertical: 0 },
        },
        xaxis: {
            type: "datetime",
            labels: {
                format: "MM-dd",
                style: { fontSize: "12px", colors: "#444" },
            },
        },
        yaxis: {
            title: {
                text: "kcal",
                style: { fontSize: "14px", color: "#999" },
            },
            labels: {
                style: { fontSize: "12px", colors: "#666" },
            },
        },
        colors: ["#33C181", "#11C6CF"],
        stroke: { width: 3, curve: "smooth" },
        tooltip: {
            x: { format: "yyyy-MM-dd" },
            y: { formatter: (val) => val + " kcal" },
        },
        title: {
            text: "칼로리 그래프",
            align: "left",
            style: { fontSize: "18px", color: "#666" },
        },
    };

    // 5) 차트 컨테이너에 그리기
    const container = document.querySelector(".chart-container");
    container.innerHTML = "";
    new ApexCharts(container, options).render();
}

// --------------------------------------------------
// 8) 달력 초기화 + 이벤트(날짜 클릭, 초기 이벤트 로드)
// --------------------------------------------------
async function setupCalendar() {
    const calendarEl = document.getElementById("calendar");
    if (!calendarEl) return;

    // 1) 현재 선택된 연도 가져오기
    const select = document.getElementById("yearSelect");
    const currentYear = select
        ? parseInt(select.value)
        : new Date().getFullYear();

    // 2) 기초대사량(bmr) 한 번 조회
    let bmr = 0;
    try {
        bmr = await fetchBmr();
    } catch (e) {
        console.error("기초대사량 조회 실패:", e);
        bmr = 0;
    }

    // 3) 연도별 섭취 합계와 연도별 운동 합계를 동시에 가져오기
    let yearIntakeList = [],
        yearExerciseList = [];
    try {
        [yearIntakeList, yearExerciseList] = await Promise.all([
            fetchYearIntake(currentYear),
            fetchYearExercise(currentYear),
        ]);
    } catch (e) {
        console.error("연도별 섭취/운동 데이터 조회 실패:", e);
        yearIntakeList = [];
        yearExerciseList = [];
    }

    // 4) 두 리스트를 날짜별로 매핑할 수 있게, 객체(맵) 형태로 변환
    const intakeMap = {};
    const exerciseMap = {};
    yearIntakeList.forEach((item) => {
        intakeMap[item.intakeDate] = item.intakeSum;
    });
    yearExerciseList.forEach((item) => {
        exerciseMap[item.exerciseDate] = item.exerciseSum;
    });

    // 5) 달력에 표시할 이벤트 배열을 만든다.
    const allDates = new Set([
        ...Object.keys(intakeMap),
        ...Object.keys(exerciseMap),
    ]);

    const intakeEvents = Array.from(allDates).map((dateStr) => {
        const intakeSum = intakeMap[dateStr] ?? 0;
        const exerciseSum = exerciseMap[dateStr] ?? 0;
        const burned = bmr + exerciseSum;
        const diff = intakeSum - burned;
        const sign = diff >= 0 ? "+" : "-";
        const absVal = Math.abs(diff);

        return {
            title: `${sign}${absVal} kcal`,
            start: dateStr,
            allDay: true,
            color: diff >= 0 ? "#33C181" : "#33C181",
            textColor: "#020202",
        };
    });

    // 6) FullCalendar 초기화
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        locale: "ko",
        height: 650,
        headerToolbar: { left: "prev,next today", center: "title", right: "" },
        buttonText: { today: "오늘" },
        events: intakeEvents,

        // 7) 날짜 클릭해서 패널 열기 로직
        dateClick: async function (info) {
            const clickedDate = info.dateStr;
            document.getElementById("panel-date").innerText =
                clickedDate.replace(/-/g, ".");

            // 클릭한 날의 섭취 합계, 운동 합계, bmr 등 다시 조회
            let intakeSum = 0;
            let exerciseSum = 0;
            let clickedBmr = 0;

            try {
                clickedBmr = await fetchBmr();
            } catch (e) {
                console.error("클릭한 날짜 BMR 조회 실패:", e);
                clickedBmr = 0;
            }
            try {
                const foodObj = await fetchDateIntake(clickedDate);
                intakeSum = foodObj.intakeSum ?? 0;
            } catch (e) {
                console.warn("클릭한 날짜 섭취 조회 실패 또는 없음:", e);
                intakeSum = 0;
            }
            try {
                const exObj = await fetchDateExercise(clickedDate);
                exerciseSum = exObj.exerciseSum ?? 0;
            } catch (e) {
                console.warn("클릭한 날짜 운동 조회 실패 또는 없음:", e);
                exerciseSum = 0;
            }

            // 소모합과 차이 계산
            const burned = clickedBmr + exerciseSum;
            const diff = intakeSum - burned;
            const sign = diff >= 0 ? "+" : "-";
            const absVal = Math.abs(diff);

            // UI 요소에 텍스트 값 세팅
            document.getElementById("bmr").innerText = `${clickedBmr} kcal`;
            document.getElementById("burned").innerText = `${exerciseSum} kcal`;
            document.getElementById("intake").innerText = `${intakeSum} kcal`;
            document.getElementById("result").innerHTML = `<strong>${sign}${absVal} kcal</strong>`;

            document.getElementById("kcal-panel").style.display = "block";
        },
    });

    calendar.render();

    // 8) 연도 변경 시, 달력 이벤트(+- diff)와 차트도 함께 갱신
    if (select) {
        select.addEventListener("change", async () => {
            const newYear = parseInt(select.value);

            // a) 기초대사량 다시 조회
            let newBmr = 0;
            try {
                newBmr = await fetchBmr();
            } catch (e) {
                console.error("연도 변경 후 BMR 조회 실패:", e);
                newBmr = 0;
            }

            // b) 새 연도 섭취/운동 합계 조회
            let newIntakeList = [],
                newExerciseList = [];
            try {
                [newIntakeList, newExerciseList] = await Promise.all([
                    fetchYearIntake(newYear),
                    fetchYearExercise(newYear),
                ]);
            } catch (e) {
                console.error("연도 변경 후 섭취/운동 조회 실패:", e);
                newIntakeList = [];
                newExerciseList = [];
            }

            // c) 새로운 맵 객체로 변환
            const newIntakeMap = {};
            const newExerciseMap = {};
            newIntakeList.forEach((item) => {
                newIntakeMap[item.intakeDate] = item.intakeSum;
            });
            newExerciseList.forEach((item) => {
                newExerciseMap[item.exerciseDate] = item.exerciseSum;
            });

            // d) 달력에 표시할 새 이벤트 생성 (diff 계산)
            const newDates = new Set([
                ...Object.keys(newIntakeMap),
                ...Object.keys(newExerciseMap),
            ]);
            const newEvents = Array.from(newDates).map((dateStr) => {
                const intakeSum = newIntakeMap[dateStr] ?? 0;
                const exerciseSum = newExerciseMap[dateStr] ?? 0;
                const burned = newBmr + exerciseSum;
                const diff = intakeSum - burned;
                const sign = diff >= 0 ? "+" : "-";
                const absVal = Math.abs(diff);

                return {
                    title: `${sign}${absVal} kcal`,
                    start: dateStr,
                    allDay: true,
                    color: diff >= 0 ? "#33C181" : "#33C181",
                    textColor: "#020202",
                };
            });

            // e) 기존 달력 이벤트 제거 후, 새로 추가
            calendar.removeAllEvents();
            newEvents.forEach((ev) => calendar.addEvent(ev));

            // f) 차트도 연도별로 다시 그리기
            renderLineChart(newYear);
        });
    }
}

// --------------------------------------------------
// 9) 패널 외부 클릭 시 닫기, 버튼 클릭 시 닫기
// --------------------------------------------------
function setupPanelClose() {
    const closeBtn = document.getElementById("close-panel-btn");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            document.getElementById("kcal-panel").style.display = "none";
        });
    }
    document.addEventListener("click", (e) => {
        const panel = document.getElementById("kcal-panel");
        if (
            !panel ||
            panel.contains(e.target) ||
            e.target.closest(".fc-daygrid-day") ||
            e.target.closest(".modal")
        ) {
            return;
        }
        panel.style.display = "none";
    });
}

// --------------------------------------------------
// 10) DOMContentLoaded 시 초기 실행
// --------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    // 1) 라인 차트: 초기 연도 값
    const select = document.getElementById("yearSelect");
    const initialYear = select
        ? parseInt(select.value)
        : new Date().getFullYear();
    renderLineChart(initialYear);

    // 2) 달력 초기화 (이 안에서 “연도 변경 시 이벤트 변경”까지 처리)
    setupCalendar();

    // 3) 패널 닫기 로직
    setupPanelClose();
});
