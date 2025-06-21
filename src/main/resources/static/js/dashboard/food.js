// food.js (백엔드 연동 통합 버전, 수정판)

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
let foodMap = {};      // { "YYYY-MM-DD": [ { foodInfoId, foodName, amount, cal }, ... ] }
let foodList = [];     // 현재 패널에 보여줄, 선택된 날짜의 음식 목록
let itemToDelete = null;
let editIndex = null;

// 날짜별 생성된 foodNoteId 저장
const foodNoteIdByDate = {}; // { "2025-06-03": 123, ... }
const memberId = window.memberId; // (서버에서 주입되었다고 가정)

// 음식명, 수량, 단위, 자동완성 리스트 엘리먼트 참조
const nameInput = document.getElementById('food-name');
const amountInput = document.getElementById('food-amount');
const unitEl = document.getElementById('food-unit');
const listEl = document.getElementById('autocomplete-list');

// =======================================
// 1) ApexCharts를 이용한 “식단 그래프” 초기화
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

                fetchYearlyIntake(year)
                    .then(seriesData => {
                        renderChart(seriesData, year);
                    })
                    .catch(err => {
                        console.error("연도별 섭취 데이터 호출 실패:", err);
                        renderChart([], year);
                    });
            });
        });
    }

    function fetchYearlyIntake(year) {
        return axios.post('/api/dashboard/food/kcal/year', { intakeYear: year })
            .then(res => {
                const rawList = res.data || [];
                return rawList.map(item => {
                    // item.intakeDate는 "2025-06-03" 같은 문자열
                    const date = new Date(item.intakeDate + 'T00:00:00');
                    // (필요하면 보정)
                    date.setDate(date.getDate() + 1);
                    return { x: date, y: item.intakeSum };
                });
            });
    }

    document.addEventListener("DOMContentLoaded", function () {
        setupYearDropdown();

        const defaultYear = new Date().getFullYear();
        fetchYearlyIntake(defaultYear)
            .then(seriesData => {
                renderChart(seriesData, defaultYear);
            })
            .catch(err => {
                console.error("초기 섭취 데이터 호출 실패:", err);
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
            series: [{ name: '섭취 칼로리', data: seriesData }],
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
            title: { text: '섭취 그래프', align: 'left', style: { fontSize: '18px', color: '#666' } }
        };

        if (window.foodChartInstance) {
            window.foodChartInstance.destroy();
        }
        const chart = new ApexCharts(document.querySelector(".chart-container"), options);
        window.foodChartInstance = chart;

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
// 2) FullCalendar + 패널(음식 입력)을 “서버 연동” 형태로 수정
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

        // ────────────────────────────────────────────────────
        // 1) eventSources 콜백: 로드 시 한 달 치 총 kcal을 불러와서 달력에 표시
        // ────────────────────────────────────────────────────
        eventSources: [
            function (fetchInfo, successCallback, failureCallback) {
                const startDate = new Date(fetchInfo.start);
                const endDate = new Date(fetchInfo.end);
                const requests = [];
                let cursor = new Date(startDate);

                while (cursor < endDate) {
                    const dateStr = cursor.toISOString().split('T')[0];
                    const req = axios
                        .post('/api/dashboard/food/kcal', { intakeDate: dateStr })
                        .then(res => {
                            const sumKcal = res.data.intakeSum || 0;
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

        // ────────────────────────────────────────────────────
        // 2) 날짜 클릭 시 → 패널 열고, 해당 날짜 데이터만 불러와서 부분 업데이트
        // ────────────────────────────────────────────────────
        dateClick: async function (info) {
            // (1) 클릭한 날짜 저장 + UI 초기화(패널 목록만 비우기)
            selectedDate = info.dateStr;
            foodList = [];
            renderFoodList(); // 패널 UI에 남아 있던 이전 목록 제거

            // (2) 패널 열기 & “등록 모드” 세팅
            const formatted = selectedDate.replace(/-/g, '.');
            const panel = document.getElementById('food-panel');
            const dateEl = document.getElementById('panel-date');
            if (panel && dateEl) {
                dateEl.innerText = formatted;
                panel.style.display = 'block';
                editIndex = null;
                document.getElementById('add-food-btn').innerText = '등록';

                // ★ “등록 모드”이므로 이름 입력 필드를 활성화
                nameInput.disabled = false;
            }
            nameInput.value = '';
            amountInput.value = '';
            unitEl.innerText = '';
            listEl.classList.add('d-none');

            // (3) 식단 노트 생성/조회 (POST /api/dashboard/food/list)
            try {
                const noteRes = await axios.post('/api/dashboard/food/list', {
                    intakeDate: selectedDate
                });
                // 새로 생성되면 foodNoteId를 받아서 저장
                const { foodNoteId } = noteRes.data;
                foodNoteIdByDate[selectedDate] = foodNoteId;
            } catch (err) {
                // 이미 해당 날짜에 노트가 있으면 예외가 발생할 수 있다.
                // 이 경우에는 “이미 존재”라는 메시지를 무시만 하고 넘어간다.
                console.warn("식단 노트가 이미 존재합니다(생성 건너뜀):", err.response?.data?.message || err);
                // foodNoteIdByDate[selectedDate] 값은 이전에 저장된 게 있거나, undefined일 수 있다.
            }

            // (4) 해당 날짜 식단 목록 조회 (POST /api/dashboard/foods)
            let totalForClickedDay = 0;
            try {
                const resp = await axios.post('/api/dashboard/foods', {
                    intakeDate: selectedDate
                });
                // resp.data는 배열(여러 건)로 내려온다.
                // 아래 map()으로 “무조건 배열 전체”를 foodList로 변환한다.
                foodList = resp.data.map(f => ({
                    foodInfoId: f.foodInfoId,
                    foodName:   f.foodName,
                    amount:     `${f.intake}`,
                    cal:        f.intakeKcal
                }));

                // foodMap 에도 전체 배열을 저장
                foodMap[selectedDate] = foodList;

                // 그날 전체 kcal 합산
                totalForClickedDay = foodList.reduce((sum, item) => sum + item.cal, 0);
            } catch (err) {
                console.error("서버에서 해당 날짜 식단 목록 로드 실패:", err);
                foodList = [];
                foodMap[selectedDate] = [];
                totalForClickedDay = 0;
            }

            // (5) 패널(모달 등) 안의 목록을 렌더
            renderFoodList();

            // (6) 클릭한 날짜 위에 “총 X kcal” 이벤트를 하나만 추가하거나, 이미 있으면 제목만 업데이트
            const existingEvents = calendar.getEvents().filter(ev => ev.startStr === selectedDate);

            if (totalForClickedDay > 0) {
                // 총 kcal이 0보다 클 때만 이벤트를 추가/갱신
                if (existingEvents.length > 0) {
                    // 이미 이벤트(총 kcal 배지)가 있으면, 제목(title)만 갱신
                    existingEvents.forEach(ev => ev.setProp('title', `총 ${totalForClickedDay} kcal`));
                } else {
                    // 없으면 새로 하나만 추가
                    calendar.addEvent({
                        title: `총 ${totalForClickedDay} kcal`,
                        start: selectedDate,
                        allDay: true
                    });
                }
            } else {
                // 총 kcal이 0이나 그 이하면, 기존에 있던 이벤트가 있으면 지우기
                existingEvents.forEach(ev => ev.remove());
            }
        },

        // 3) events: [] → eventSources 콜백이 모든 이벤트를 공급하기 때문에 빈 배열로 둠
        events: []
    });

    calendar.render();
});


// ===========================================
// 3) 자동완성 → “실제 백엔드(openSearch API)” 호출
// ===========================================
let selectedIdx = -1;

nameInput.addEventListener('input', async function () {
    const keyword = nameInput.value.trim();
    if (!keyword) {
        listEl.classList.add('d-none');
        return;
    }

    try {
        const res = await axios.post('/api/dashboard/food/openSearch', {
            keyword: keyword,
            pageNo:  1,
            numOfRows: 100
        });
        const items = res.data; // List<FoodApi>
        if (!items || items.length === 0) {
            listEl.classList.add('d-none');
            return;
        }

        listEl.innerHTML = items.map(f => {
            // f.foodSize 예: "200g", f.enerc 예: "500"
            return `
                <li class="autocomplete-item"
                    data-name="${f.foodNm}"
                    data-amount="${f.foodSize}"
                    data-cal="${f.enerc}">
                  <div class="item-info">
                    <div class="info-name">${f.foodNm}</div>
                    <div class="info-detail">${f.foodSize} / ${f.enerc}kcal</div>
                  </div>
                </li>`;
        }).join('');
        listEl.classList.remove('d-none');
    } catch (e) {
        console.error("자동완성 API 호출 실패:", e);
        listEl.classList.add('d-none');
    }
});

nameInput.addEventListener('keydown', function (e) {
    const items = listEl.querySelectorAll('.autocomplete-item');
    if (items.length === 0) return;

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

listEl.addEventListener('click', function (e) {
    const clickedLi = e.target.closest('.autocomplete-item');
    if (!clickedLi) return;

    const name      = clickedLi.dataset.name;
    const amountStr = clickedLi.dataset.amount; // ex) "200g"
    const calPerUnit= parseInt(clickedLi.dataset.cal, 10); // ex) 500

    // 숫자와 단위를 분리
    const amountVal = parseInt(amountStr.replace(/[^0-9]/g, ''), 10);
    const unitText  = amountStr.replace(/[0-9]/g, '');

    // 1) 입력 값 세팅
    nameInput.value = name;
    amountInput.value = amountVal;
    unitEl.innerText = unitText;
    nameInput.dataset.calPerUnit = calPerUnit; // 1단위(100g)당 칼로리

    // 2) 선택 직후 입력창 잠그기
    nameInput.disabled = true;

    // 3) 자동완성 목록 숨기기
    listEl.classList.add('d-none');
    selectedIdx = -1;
});


// ===========================================
// 4) “등록/수정” 버튼 클릭 시 → 서버 호출
// ===========================================
document.getElementById('add-food-btn').addEventListener('click', async function () {
    const name      = nameInput.value.trim();
    const amount    = parseInt(amountInput.value, 10);
    const unit      = unitEl.innerText; // ex) “g”
    const calPerUnit= parseInt(nameInput.dataset.calPerUnit || '0', 10);

    if (!name) {
        alert("음식명을 입력해주세요.");
        return;
    }
    if (!calPerUnit) {
        alert("자동완성에서 음식을 선택해주세요.");
        return;
    }
    if (!amount || amount <= 0) {
        alert("중량을 올바르게 입력해주세요.");
        return;
    }

    // 기준 칼로리 계산: (enerc/기준중량) * 입력량
    // 여기서는 “enerc가 100g당 칼로리”라고 가정
    const baseAmount = parseInt((unit || "100g").replace(/[^0-9]/g, ''), 10) || 100;
    const intakeKcal = Math.round((calPerUnit / baseAmount) * amount);

    // (A) 수정 모드
    if (editIndex !== null) {
        const item = foodList[editIndex];
        try {
            // PUT /api/dashboard/food
            await axios.put('/api/dashboard/food', {
                foodInfoId: item.foodInfoId,
                newIntake:  amount
            });
            // 로컬 상태 반영
            foodList[editIndex].foodName = name;
            foodList[editIndex].amount   = `${amount}${unit}`;
            foodList[editIndex].cal      = intakeKcal;
            renderFoodList();

            // → 수정 후: 해당 날짜 총 kcal 다시 계산 → 이벤트 부분 업데이트
            const updatedTotal = foodList.reduce((sum, it) => sum + it.cal, 0);
            const existing = calendar.getEvents().filter(ev => ev.startStr === selectedDate);
            if (existing.length > 0) {
                existing.forEach(ev => ev.setProp('title', `총 ${updatedTotal} kcal`));
            } else {
                calendar.addEvent({
                    title: `총 ${updatedTotal} kcal`,
                    start: selectedDate,
                    allDay: true
                });
            }
        } catch (err) {
            console.error("서버에서 음식 정보 수정 실패:", err);
            alert("음식 정보 수정에 실패했습니다. 다시 시도해주세요.");
        }

        // 수정 모드 해제 → “등록 모드”로 복귀
        editIndex = null;
        document.getElementById('add-food-btn').innerText = '등록';
        document.querySelectorAll('.food-row').forEach(row => row.classList.remove('editing'));

        // ★ 수정 완료 후 음식명 입력 활성화
        nameInput.disabled = false;
    }
    // (B) 신규 등록 모드
    else {
        try {
            const foodNoteId = foodNoteIdByDate[selectedDate];
            if (!foodNoteId) {
                alert("음식 노트 ID가 없습니다. 날짜를 다시 눌러주세요.");
                return;
            }

            // POST /api/dashboard/food
            await axios.post('/api/dashboard/food', {
                foodNoteId: foodNoteId,
                foodName:   name,
                intake:     amount,
                unitKcal:   calPerUnit
            });
            // 로컬 반영
            foodList.push({
                foodInfoId: -1,  // 실제 서버 반환값을 받으면 교체
                foodName:   name,
                amount:     `${amount}${unit}`,
                cal:        intakeKcal
            });
            foodMap[selectedDate] = foodList;
            renderFoodList();

            // → 등록 후: 해당 날짜 총 kcal 계산 → 이벤트 부분 업데이트
            const updatedTotal = foodList.reduce((sum, it) => sum + it.cal, 0);
            const existing = calendar.getEvents().filter(ev => ev.startStr === selectedDate);
            if (existing.length > 0) {
                existing.forEach(ev => ev.setProp('title', `총 ${updatedTotal} kcal`));
            } else {
                calendar.addEvent({
                    title: `총 ${updatedTotal} kcal`,
                    start: selectedDate,
                    allDay: true
                });
            }
        } catch (err) {
            console.error("서버에서 음식 정보 등록 실패:", err);
            alert("음식 등록에 실패했습니다. 다시 시도해주세요.");
        }

        // ★ “등록 모드” 상태이므로 이름 입력 활성화
        nameInput.disabled = false;
    }

    // 입력창 초기화
    nameInput.value = '';
    amountInput.value = '';
    unitEl.innerText = '';
    delete nameInput.dataset.calPerUnit;
});

// ===========================================
// 5) 음식 목록 렌더링 함수
// ===========================================
function renderFoodList() {
    const listContainer = document.getElementById('food-list');
    listContainer.innerHTML = '';
    let total = 0;

    foodList.forEach((item, idx) => {
        total += item.cal;
        const rowClass = idx % 2 === 0 ? 'food-row-even' : 'food-row-odd';
        listContainer.innerHTML += `
          <div class="food-row ${rowClass}">
            <div class="cell-name fw-semibold">${item.foodName}</div>
            <div class="cell-amount">${item.amount}</div>
            <div class="cell-kcal">${item.cal}kcal</div>
            <div class="cell-action">
              <i class="bi bi-pencil-square text-black fs-5 edit-btn" data-index="${idx}" role="button"></i>
              <i class="bi bi-x-square text-black fs-5 delete-btn" data-index="${idx}" role="button"></i>
            </div>
          </div>`;
    });

    document.getElementById('total-cal').innerText = total;
    // **renderKcalEvents(calendar) 호출은 제거했습니다.**
    // (전체 달력 리페치가 아니라, “해당 날짜 이벤트만 직접 업데이트”하기 때문)
}

// ===========================================
// 6) 수정 및 삭제 버튼 클릭 이벤트 바인딩
// ===========================================
document.getElementById('food-list').addEventListener('click', async function (e) {
    const idx = Number(e.target.dataset.index);

    // “수정” 아이콘 클릭
    if (e.target.classList.contains('edit-btn')) {
        editIndex = idx;
        const item = foodList[idx];
        const amountVal = parseInt(item.amount.replace(/[^0-9]/g, ''), 10);
        const unitText = item.amount.replace(/[0-9]/g, '');

        nameInput.value = item.foodName;
        amountInput.value = amountVal;
        unitEl.innerText = unitText;
        nameInput.dataset.calPerUnit = Math.round(item.cal / (amountVal || 100) * (amountVal || 100));
        document.getElementById('add-food-btn').innerText = '수정';

        // ★ 수정 모드 진입 시 이름(input)을 비활성화
        nameInput.disabled = true;

        document.querySelectorAll('.food-row').forEach(row => row.classList.remove('editing'));
        e.target.closest('.food-row').classList.add('editing');
    }
    // “삭제” 아이콘 클릭
    else if (e.target.classList.contains('delete-btn')) {
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
    const item = foodList[itemToDelete];
    try {
        // DELETE /api/dashboard/food
        await axios.delete('/api/dashboard/food', { data: { foodInfoId: item.foodInfoId } });

        // (1) 로컬 배열에서 제거
        foodList.splice(itemToDelete, 1);
        foodMap[selectedDate] = foodList;
        renderFoodList();

        // (2) 해당 날짜 총 kcal 다시 계산 → 이벤트 부분 업데이트
        const newTotal = foodList.reduce((sum, it) => sum + it.cal, 0);
        const existing = calendar.getEvents().filter(ev => ev.startStr === selectedDate);
        if (existing.length > 0) {
            if (newTotal <= 0) {
                // 총 kcal이 0이면 해당 이벤트 자체를 지움
                existing.forEach(ev => ev.remove());
            } else {
                // 0 초과면 제목만 업데이트
                existing.forEach(ev => ev.setProp('title', `총 ${newTotal} kcal`));
            }
        }
    } catch (err) {
        console.error("서버에서 음식 삭제 실패:", err);
        alert("음식 삭제에 실패했습니다. 다시 시도해주세요.");
    }
    bootstrap.Modal.getInstance(document.getElementById('delete-modal')).hide();
    itemToDelete = null;
});

// ===========================================
// 8) 패널 닫기 (버튼 및 외부 클릭 시 닫기)
// ===========================================
document.getElementById('close-panel-btn').addEventListener('click', function () {
    const panel = document.getElementById('food-panel');
    if (panel) panel.style.display = 'none';
});
document.addEventListener('click', function (e) {
    const panel = document.getElementById('food-panel');
    if (!panel) return;
    if (
        panel.contains(e.target) ||
        e.target.closest('.fc-daygrid-day') ||
        e.target.closest('.modal')
    ) {
        return;
    }
    panel.style.display = 'none';
});
