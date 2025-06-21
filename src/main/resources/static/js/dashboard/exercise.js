// exercise.js

// -----------------------------
// Axios 기본 설정
// -----------------------------
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true;

// -----------------------------
// 전역 변수 선언
// -----------------------------
let calendar;
let selectedDate = null;
let exerciseNoteId = null;       // 클릭된 날짜의 ExerciseNote ID
let exerciseMap = {};            // { "YYYY-MM-DD": [ { id, name, amount, cal }, … ] }
let exerciseList = [];           // 현재 패널에 보여줄, 선택된 날짜의 운동 목록
let editIndex = null;            // 편집 중인 인덱스
let itemToDelete = null;         // 삭제 대기 중인 인덱스
let selectedMet = 0;             // 자동완성에서 선택된 운동의 분당 kcal
let selectedName = "";           // 자동완성에서 선택된 운동명

// DOM 요소 참조
const nameInput = document.getElementById('exercise-name');
const amountInput = document.getElementById('exercise-duration');
const listEl = document.getElementById('autocomplete-list');

// =======================================
// 1) ApexCharts를 이용한 “운동 그래프” 초기화
// =======================================
(function () {
    function setupYearDropdown() {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 2;
        const dropdownBtn = document.getElementById('yearDropdownBtn');
        const menu = document.getElementById('yearDropdownMenu');

        dropdownBtn.innerText = `${currentYear}년`;

        let html = '';
        for (let y = currentYear; y >= startYear; y--) {
            html += `<li><a class="dropdown-item year-option" data-year="${y}" href="#">${y}년</a></li>`;
        }
        menu.innerHTML = html;

        document.querySelectorAll('.year-option').forEach(item => {
            item.addEventListener('click', function (e) {
                e.preventDefault();
                const year = parseInt(this.dataset.year, 10);
                dropdownBtn.innerText = `${year}년`;

                fetchYearlyKcal(year)
                    .then(seriesData => {
                        renderChart(seriesData, year);
                    })
                    .catch(err => {
                        console.error("연도별 kcal 데이터 호출 실패:", err);
                        renderChart([], year);
                    });
            });
        });
    }

    function fetchYearlyKcal(year) {
        return axios.post('/api/dashboard/exercise/kcal/year', { exerciseYear: year })
            .then(res => {
                const rawList = res.data || [];
                return rawList.map(item => ({
                    x: new Date(item.exerciseDate + 'T00:00:00'),
                    y: item.exerciseSum
                }));
            });
    }

    document.addEventListener("DOMContentLoaded", function () {
        setupYearDropdown();

        const defaultYear = new Date().getFullYear();
        fetchYearlyKcal(defaultYear)
            .then(seriesData => {
                renderChart(seriesData, defaultYear);
            })
            .catch(err => {
                console.error("초기 kcal 데이터 호출 실패:", err);
                renderChart([], defaultYear);
            });
    });

    function renderChart(seriesData, selectedYear) {
        const today = new Date();
        const jan1 = new Date(selectedYear, 0, 1).getTime();
        const dec31 = new Date(selectedYear, 11, 31).getTime();
        const todayTime = today.getTime();

        const xMin = jan1;
        const xMax = (selectedYear === today.getFullYear() ? todayTime : dec31);

        const yMax = Math.max(...seriesData.map(d => d.y), 0);
        const yAxisMax = yMax <= 4000 ? 4000 : Math.ceil(yMax / 500) * 500;

        const options = {
            chart: {
                type: 'line',
                height: 350,
                background: '#f9f9f9',
                zoom: { enabled: true, type: 'x', autoScaleYaxis: true },
                toolbar: {
                    show: true,
                    tools: {
                        download: false,
                        selection: true,
                        zoom: true,
                        zoomin: true,
                        zoomout: true,
                        pan: true,
                        reset: true
                    }
                }
            },
            series: [{ name: '운동 칼로리', data: seriesData }],
            xaxis: {
                type: 'datetime',
                min: xMin,
                max: xMax,
                labels: { format: 'MM-dd', style: { fontSize: '12px', colors: '#444' } },
                tickPlacement: 'on'
            },
            yaxis: {
                max: yAxisMax,
                title: { text: 'kcal', style: { fontSize: '14px', color: '#999' } },
                labels: { style: { fontSize: '12px', colors: '#666' } }
            },
            tooltip: { x: { format: 'yyyy-MM-dd' } },
            stroke: { width: 3, curve: 'smooth', colors: ['#33C181'] },
            fill: { type: 'solid', colors: ['#33C181'] },
            markers: { size: 0, hover: { size: 6 } },
            grid: { borderColor: '#eee', strokeDashArray: 4 },
            title: { text: '운동 그래프', align: 'left', style: { fontSize: '18px', color: '#666' } }
        };

        if (window.exerciseChartInstance) {
            window.exerciseChartInstance.destroy();
        }
        const chart = new ApexCharts(document.querySelector("#exercise-chart"), options);
        window.exerciseChartInstance = chart;

        chart.render().then(() => {
            const recent7 = new Date();
            recent7.setDate(today.getDate() - 6);
            const recent7Time = recent7.getTime();
            if (selectedYear === today.getFullYear()) {
                chart.zoomX(recent7Time, xMax);
            } else {
                chart.zoomX(xMin, xMax);
            }

            setTimeout(() => {
                const homeBtn = document.querySelector(".apexcharts-reset-icon");
                if (homeBtn) {
                    homeBtn.addEventListener("click", (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (selectedYear === today.getFullYear()) {
                            chart.zoomX(recent7Time, xMax);
                        } else {
                            chart.zoomX(xMin, xMax);
                        }
                    });
                }
            }, 100);
        });

        chart.addEventListener("zoomed", function (_ctx, { xaxis }) {
            const min = Math.max(xaxis.min, xMin);
            const max = Math.min(xaxis.max, xMax);
            if (min !== xaxis.min || max !== xaxis.max) {
                chart.zoomX(min, max);
            }
        });
    }
})();

// =======================================
// 2) FullCalendar + 패널 연동
// =======================================
document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ko',
        height: 650,
        headerToolbar: { left: 'prev,next today', center: 'title', right: '' },
        buttonText: { today: '오늘' },

        // 이벤트 소스: 월 단위 조회
        eventSources: [
            function(fetchInfo, successCallback, failureCallback) {
                const startDate = new Date(fetchInfo.start);
                const endDate = new Date(fetchInfo.end);
                const requests = [];
                let cursor = new Date(startDate);

                while (cursor < endDate) {
                    const dateStr = cursor.toISOString().split('T')[0];
                    const req = axios
                        .post('/api/dashboard/exercise/kcal', { exerciseDate: dateStr })
                        .then(res => {
                            const sumKcal = res.data.exerciseSum || 0;
                            if (sumKcal <= 0) {
                                return null;
                            }
                            return {
                                title: `총 ${sumKcal} kcal`,
                                start: dateStr,
                                allDay: true
                            };
                        })
                        .catch(() => null);

                    requests.push(req);
                    cursor.setDate(cursor.getDate() + 1);
                }

                Promise.all(requests)
                    .then(results => successCallback(results.filter(evt => evt !== null)))
                    .catch(err => failureCallback(err));
            }
        ],

        // 날짜 클릭 시
        dateClick: async function(info) {
            selectedDate = info.dateStr;

            // UI 초기화 & 패널 열기
            const formatted = selectedDate.replace(/-/g, '.');
            document.getElementById('panel-date').innerText = formatted;
            document.getElementById('exercise-panel').style.display = 'block';
            document.getElementById('add-exercise-btn').innerText = '등록';
            editIndex = null;
            nameInput.disabled = false;
            nameInput.value = '';
            amountInput.value = '';
            listEl.classList.add('d-none');
            selectedName = "";
            selectedMet = 0;

            // 노트 생성/조회
            try {
                const noteRes = await axios.post('/api/dashboard/exercise/list', {
                    exerciseDate: selectedDate
                });
                exerciseNoteId = noteRes.data.exerciseNoteId;
            } catch (err) {
                console.warn("운동 노트 생성 또는 조회 실패:", err.response?.data?.message || err);
                exerciseNoteId = null;
            }

            // 해당 날짜 운동 목록 조회
            let totalForClickedDay = 0;
            try {
                const res2 = await axios.post('/api/dashboard/exercises', {
                    exerciseDate: selectedDate
                });
                const serverList = res2.data || [];
                exerciseList = serverList.map(item => ({
                    id: item.exerciseInfoId,
                    name: item.exerciseName,
                    amount: `${item.exerciseMin}분`,
                    cal: item.exerciseKcal
                }));
                exerciseMap[selectedDate] = exerciseList;
                totalForClickedDay = exerciseList.reduce((sum, it) => sum + it.cal, 0);
            } catch (err) {
                console.error("상세 목록 조회 실패:", err);
                exerciseList = [];
                exerciseMap[selectedDate] = [];
                totalForClickedDay = 0;
            }

            // 패널 목록 렌더
            renderExerciseList();

            // 달력 이벤트 업데이트(해당 날짜만)
            const existingEvents = calendar.getEvents().filter(ev => ev.startStr === selectedDate);
            if (totalForClickedDay > 0) {
                if (existingEvents.length > 0) {
                    existingEvents.forEach(ev => ev.setProp('title', `총 ${totalForClickedDay} kcal`));
                } else {
                    calendar.addEvent({
                        title: `총 ${totalForClickedDay} kcal`,
                        start: selectedDate,
                        allDay: true
                    });
                }
            } else {
                existingEvents.forEach(ev => ev.remove());
            }
        },

        events: [] // eventSources가 공급
    });

    calendar.render();
});

// ===========================================
// 3) 자동완성(Autocomplete) 기능 수정
//    → food.js 방식과 동일하게 'click' 이벤트만 사용
// ===========================================
let selectedIdx = -1;

nameInput.addEventListener('input', async function (e) {
    const keyword = nameInput.value.trim();
    if (!keyword) {
        listEl.classList.add('d-none');
        return;
    }

    try {
        const res = await axios.post('/api/dashboard/exercise/openSearch', {
            keyword: keyword,
            pageNo: 1,
            numOfRows: 100
        });
        const items = res.data || []; // 예: [ { "단위체중당에너지소비량":4.5, "운동명":"걷기" }, … ]

        if (!items.length) {
            listEl.classList.add('d-none');
            return;
        }

        listEl.innerHTML = items.map(e => {
            const metValue = parseFloat(e["단위체중당에너지소비량"] || 0);
            const nameValue = e["운동명"] || "";
            return `
                <li class="autocomplete-item"
                    data-name="${nameValue}"
                    data-met="${metValue}">
                  <div class="item-info">
                    <div class="info-name">${nameValue}</div>
                    <div class="info-detail">${metValue} kcal/분</div>
                  </div>
                </li>`;
        }).join('');
        listEl.classList.remove('d-none');
    } catch (err) {
        console.error("운동 자동완성 OpenSearch 호출 실패:", err);
        listEl.classList.add('d-none');
    }
});

nameInput.addEventListener('keydown', function (e) {
    const items = listEl.querySelectorAll('.autocomplete-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIdx = (selectedIdx + 1) % items.length;
        updateAutocompleteSelection(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIdx = (selectedIdx - 1 + items.length) % items.length;
        updateAutocompleteSelection(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const idx = (selectedIdx >= 0 && selectedIdx < items.length) ? selectedIdx : 0;
        items[idx].click();
    }
});

function updateAutocompleteSelection(items) {
    items.forEach((item, idx) => {
        item.classList.toggle('active', idx === selectedIdx);
    });
}

// ★ 'click' 핸들러에서 선택 즉시 input을 비활성화하도록 추가
listEl.addEventListener('click', function (e) {
    const clickedLi = e.target.closest('.autocomplete-item');
    if (!clickedLi) return;

    // 전파 중단 (예: 밖에서 닫히지 않도록)
    e.stopPropagation();

    // 1) 선택된 데이터를 각각 변수에 담아둔다
    selectedName = clickedLi.dataset.name || "";
    selectedMet = parseFloat(clickedLi.dataset.met) || 0;

    // 2) input 필드에 값 세팅
    nameInput.value = selectedName;
    // 운동량 입력란은 초기화만 해두면 됩니다. (운동 분 단위는 사용자가 직접 입력)
    amountInput.value = "";
    // 메트 데이터를 dataset에 저장해두면 나중 등록 시 사용 가능
    nameInput.dataset.calPerUnit = selectedMet;

    // 3) 자동완성 목록을 숨긴다
    listEl.classList.add('d-none');
    selectedIdx = -1;

    // ★ 4) 선택 직후, 운동명 입력(input)을 비활성화
    //    이제 사용자는 input을 수정할 수 없습니다.
    nameInput.disabled = true;
});

// ===========================================
// 4) “등록/수정” 버튼 클릭 시 서버 호출
// ===========================================
document.getElementById('add-exercise-btn').addEventListener('click', async function () {
    const 운동명 = nameInput.value.trim();
    const 분량 = parseInt(amountInput.value, 10);
    const 분당메트 = parseFloat(nameInput.dataset.calPerUnit) || 0;

    // ──── 1) “수정 모드”인 경우 ───────────────────────────────────────────────────────────────────
    if (editIndex !== null) {
        if (!운동명) {
            alert("운동명을 입력해주세요.");
            return;
        }
        if (!분량 || 분량 <= 0) {
            alert("분량(분)을 올바르게 입력해주세요.");
            return;
        }
        if (!exerciseNoteId) {
            alert("노트 ID가 없습니다. 날짜를 다시 클릭해주세요.");
            return;
        }

        // — 수정 모드 로직 —
        try {
            const item = exerciseList[editIndex];
            const putRes = await axios.put('/api/dashboard/exercise', {
                exerciseInfoId: item.id,
                newMin: 분량
            });

            if (putRes.data.success) {
                // (1) 서버에서 전체 목록 재조회
                const listRes = await axios.post('/api/dashboard/exercises', {
                    exerciseDate: selectedDate
                });
                const serverList = listRes.data || [];
                exerciseList = serverList.map(e => ({
                    id: e.exerciseInfoId,
                    name: e.exerciseName,
                    amount: `${e.exerciseMin}분`,
                    cal: e.exerciseKcal
                }));
                exerciseMap[selectedDate] = exerciseList;
                renderExerciseList();

                // (2) 달력 이벤트 업데이트
                const updatedTotal = exerciseList.reduce((sum, it) => sum + it.cal, 0);
                const existingEvents = calendar.getEvents().filter(ev => ev.startStr === selectedDate);
                if (updatedTotal > 0) {
                    existingEvents.forEach(ev => ev.setProp('title', `총 ${updatedTotal} kcal`));
                } else {
                    existingEvents.forEach(ev => ev.remove());
                }
            } else {
                alert("서버에서 운동 정보 수정에 실패했습니다.");
            }
        } catch (err) {
            console.error("서버에서 운동 정보 수정 실패:", err);
            alert("운동 정보 수정에 실패했습니다. 다시 시도해주세요.");
        }

        // ── 수정 모드 해제 및 UI 초기화 ─────────────────────────────────────────────────────────────
        editIndex = null;
        document.getElementById('add-exercise-btn').innerText = '등록';
        document.querySelectorAll('.exercise-row').forEach(row => row.classList.remove('editing'));
        nameInput.disabled = false;    // ← 수정 후 반드시 활성화

        nameInput.value = "";
        amountInput.value = "";
        delete nameInput.dataset.calPerUnit;
        return;
    }

    // ──── 2) 신규 등록 모드 ────────────────────────────────────────────────────────────────────
    if (!운동명) {
        alert("운동명을 입력해주세요.\n(자동완성에서 운동을 선택하세요.)");
        return;
    }
    if (분당메트 <= 0) {
        alert("자동완성 목록에서 운동을 선택한 뒤 다시 시도해주세요.");
        return;
    }
    if (!분량 || 분량 <= 0) {
        alert("분량(분)을 올바르게 입력해주세요.");
        return;
    }
    if (!exerciseNoteId) {
        alert("노트 ID가 없습니다. 날짜를 다시 클릭해주세요.");
        return;
    }

    // — 신규 등록 모드 로직 —
    const requestBody = {
        exerciseNoteId: exerciseNoteId,
        exerciseName: 운동명,
        exerciseMin: 분량,
        met: 분당메트
    };

    try {
        const postRes = await axios.post('/api/dashboard/exercise', requestBody);

        if (postRes.data.success) {
            // (1) 저장 성공 시 서버에서 전체 목록 재조회
            const listRes = await axios.post('/api/dashboard/exercises', {
                exerciseDate: selectedDate
            });
            const serverList = listRes.data || [];
            exerciseList = serverList.map(e => ({
                id: e.exerciseInfoId,
                name: e.exerciseName,
                amount: `${e.exerciseMin}분`,
                cal: e.exerciseKcal
            }));
            exerciseMap[selectedDate] = exerciseList;
            renderExerciseList();

            // (2) 달력 이벤트 업데이트
            const updatedTotal = exerciseList.reduce((sum, it) => sum + it.cal, 0);
            const existingEvents = calendar.getEvents().filter(ev => ev.startStr === selectedDate);
            if (updatedTotal > 0) {
                if (existingEvents.length > 0) {
                    existingEvents.forEach(ev => ev.setProp('title', `총 ${updatedTotal} kcal`));
                } else {
                    calendar.addEvent({
                        title: `총 ${updatedTotal} kcal`,
                        start: selectedDate,
                        allDay: true
                    });
                }
            } else {
                existingEvents.forEach(ev => ev.remove());
            }
        } else {
            alert("서버에서 운동 등록에 실패했습니다.");
        }
    } catch (err) {
        console.error("운동 등록 중 오류 발생:", err);
        alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    }

    // ── 신규 등록 후 반드시 nameInput 활성화 ────────────────────────────────────────────────────
    nameInput.disabled = false;    // ← 여기를 빼먹지 말아야 합니다.

    // 입력 폼 초기화
    nameInput.value = "";
    amountInput.value = "";
    delete nameInput.dataset.calPerUnit;
    selectedName = "";
    selectedMet = 0;
});

// ===========================================
// 5) 운동 목록 렌더링 함수
// ===========================================
function renderExerciseList() {
    const listContainer = document.getElementById('exercise-list');
    listContainer.innerHTML = '';
    let total = 0;

    exerciseList.forEach((item, idx) => {
        total += item.cal;
        const rowClass = idx % 2 === 0 ? 'exercise-row-even' : 'exercise-row-odd';

        listContainer.innerHTML += `
      <div class="exercise-row ${rowClass}">
        <div class="cell-name fw-semibold">${item.name}</div>
        <div class="cell-amount">${item.amount}</div>
        <div class="cell-kcal">${item.cal}kcal</div>
        <div class="cell-action">
          <i class="bi bi-pencil-square text-black fs-5" role="button" data-idx="${idx}"></i>
          <i class="bi bi-x-square text-black fs-5" role="button" data-idx="${idx}"></i>
        </div>
      </div>`;
    });

    document.getElementById('total-cal').innerText = total;
}

// ===========================================
// 6) 리스트 아이콘(수정/삭제) 클릭 처리
// ===========================================
document.getElementById('exercise-list').addEventListener('click', function (e) {
    const idx = parseInt(e.target.dataset.idx, 10);

    // “수정” 아이콘 클릭
    if (e.target.classList.contains('bi-pencil-square')) {
        const item = exerciseList[idx];
        nameInput.value = item.name;
        amountInput.value = parseInt(item.amount, 10);
        // 수정 모드 진입: 이전에 저장된 kcal/분당 메트로 복원
        nameInput.dataset.calPerUnit = parseFloat(item.cal) / parseInt(item.amount, 10) || 0;
        editIndex = idx;
        document.getElementById('add-exercise-btn').innerText = '수정';
        document.querySelectorAll('.exercise-row').forEach(row => row.classList.remove('editing'));
        e.target.closest('.exercise-row')?.classList.add('editing');
        nameInput.disabled = true; // 수정 시 운동명 변경 불필요
    }

    // “삭제” 아이콘 클릭
    if (e.target.classList.contains('bi-x-square')) {
        itemToDelete = idx;
        const modal = new bootstrap.Modal(document.getElementById('delete-modal'));
        modal.show();
    }
});

// ===========================================
// 7) 삭제 확인 버튼 클릭 시 → 서버 호출
// ===========================================
document.getElementById('confirm-delete-btn').addEventListener('click', async function () {
    if (itemToDelete === null) return;
    const item = exerciseList[itemToDelete];
    try {
        await axios.delete('/api/dashboard/exercise', { data: { exerciseInfoId: item.id } });

        // (1) 로컬 배열에서 제거
        exerciseList.splice(itemToDelete, 1);
        exerciseMap[selectedDate] = exerciseList;
        renderExerciseList();

        // (2) 해당 날짜 총 kcal 다시 계산 → 이벤트만 업데이트/삭제
        const newTotal = exerciseList.reduce((sum, it) => sum + it.cal, 0);
        const existing = calendar.getEvents().filter(ev => ev.startStr === selectedDate);
        if (existing.length > 0) {
            if (newTotal > 0) {
                existing.forEach(ev => ev.setProp('title', `총 ${newTotal} kcal`));
            } else {
                existing.forEach(ev => ev.remove());
            }
        }
    } catch (err) {
        console.error("서버에서 운동 삭제 실패:", err);
        alert("운동 삭제에 실패했습니다. 다시 시도해주세요.");
    }
    bootstrap.Modal.getInstance(document.getElementById('delete-modal')).hide();
    itemToDelete = null;
});

// ===========================================
// 8) 패널 닫기 (버튼 및 외부 클릭 시 닫기)
// ===========================================
document.getElementById('close-panel-btn').addEventListener('click', function (e) {
    e.stopPropagation(); // 자동완성/다른 클릭과 충돌 방지
    const panel = document.getElementById('exercise-panel');
    if (panel) panel.style.display = 'none';
});
document.addEventListener('click', function (e) {
    const panel = document.getElementById('exercise-panel');
    if (!panel) return;
    // 패널 내부, 달력 날짜, 모달 클릭 시에는 닫지 않음
    if (
        panel.contains(e.target) ||
        e.target.closest('.fc-daygrid-day') ||
        e.target.closest('.modal')
    ) return;
    panel.style.display = 'none';
});
