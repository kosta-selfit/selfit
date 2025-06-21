// 로그인한 회원 ID (테스트용 고정)
const memberId = window.memberId;

let calendar;
let currentSelectedDate = null;
let currentChecklistId = null;
const checklistData = {};
const checklistIdMap = {}; // { "YYYY-MM-DD": [ { checkId, checklistId, text, completed } ] }
let checklistList = [];
let editIndex = null;
let itemToDeleteIndex = null;

// Axios 기본 설정
axios.defaults.headers.common['Content-Type'] = 'application/json';

function pruneChecklistData(year, month) {
    for (const key in checklistData) {
        const date = new Date(key);
        if (date.getFullYear() !== year || date.getMonth() + 1 !== month) {
            delete checklistData[key];
        }
    }
}

async function loadChecklistBetween(startDate, endDate) {
    const promises = [];
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
        const yyyy = cursor.getFullYear();
        const mm = String(cursor.getMonth() + 1).padStart(2, '0');
        const dd = String(cursor.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        if (checklistData[dateStr]) {
            cursor.setDate(cursor.getDate() + 1);
            continue; // 이미 로드된 날짜는 skip
        }

        promises.push(
            axios.post('/api/dashboard/checklist/items', { memberId, checkDate: dateStr })
                .then(res => {
                    checklistData[dateStr] = res.data.map(item => ({
                        checkId: item.checkId,
                        checklistId: item.checklistId,
                        text: item.checkContent,
                        completed: item.isCheck === 1
                    }));
                    if (res.data.length > 0) {
                        checklistIdMap[dateStr] = res.data[0].checklistId;
                    }
                })
                .catch(() => {
                    delete checklistData[dateStr];
                })
        );

        cursor.setDate(cursor.getDate() + 1);
    }

    await Promise.all(promises);
}

// 해당 연-월의 체크리스트 데이터를 서버에서 불러와 checklistData에 저장
async function loadMonthlyChecklist(year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const promises = [];
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        promises.push(
            axios.post('/api/dashboard/checklist/items', {memberId, checkDate: date})
                .then(res => {
                    checklistData[date] = res.data.map(item => ({
                        checkId: item.checkId,
                        checklistId: item.checklistId,
                        text: item.checkContent,
                        completed: item.isCheck === 1
                    }));
                    if (res.data.length > 0) {
                        checklistIdMap[date] = res.data[0].checklistId; // ✅ 이 줄 추가
                    }
                })
                .catch(() => {
                    delete checklistData[date]; // <- 아예 제거하도록 수정
                })
        );
    }
    await Promise.all(promises);
}

// FullCalendar 이벤트 데이터 생성 (최대 3개 아이템)
function buildCalendarEvents() {
    return Object.entries(checklistData)
        .filter(([_, items]) => items && items.length)
        .map(([date, items]) => {
            const html = items.slice(0, 3).map(item =>
                `<div class="check-item-box d-flex align-items-center mb-1">
           <i class="bi ${item.completed ? 'bi-check-square text-success' : 'bi-square'}"></i>
           <span class="check-text text-truncate" title="${item.text}">${item.text}</span>
         </div>`
            ).join('');
            return {start: date, title: 'check', allDay: true, display: 'block', extendedProps: {checklistHTML: html}};
        });
}

// 패널 목록 렌더링 (수정 중인 행에 .editing 클래스)
function renderChecklistList() {
    const listEl = document.getElementById('check-list');
    if (!listEl || !currentSelectedDate) return;
    listEl.innerHTML = '';
    checklistList = checklistData[currentSelectedDate] || [];

    checklistList.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'check-row d-flex justify-content-between align-items-center';
        if (idx === editIndex) row.classList.add('editing');
        row.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        <i class="bi ${item.completed ? 'bi-check2 text-success' : ''} toggle-check" data-index="${idx}" role="button"></i>
        <span class="flex-grow-1 ${item.completed ? 'text-decoration-line-through text-muted' : ''}">${item.text}</span>
      </div>
      <div class="d-flex gap-2">
        <i class="bi bi-pencil-square edit-btn" data-index="${idx}" role="button"></i>
        <i class="bi bi-x-square delete-btn" data-index="${idx}" data-bs-toggle="modal" data-bs-target="#delete-modal" role="button"></i>
      </div>
    `;
        listEl.appendChild(row);
    });
}

// 수정 버튼 클릭 핸들러
function onEditClick(e) {
    const idx = Number(e.target.dataset.index);
    editIndex = idx;
    document.getElementById('check-name').value = checklistList[idx].text;
    document.getElementById('add-check-btn').innerText = '수정';
    renderChecklistList();
}

// 체크 토글 핸들러
async function onCheckboxChange(e) {
    const idx = Number(e.target.dataset.index);
    const item = checklistList[idx];
    const completed = !item.completed;
    await axios.put('/api/dashboard/checklist/item/check', {checkId: item.checkId, isCheck: completed ? 1 : 0});
    item.completed = completed;
    renderChecklistList();
    calendar.refetchEvents();
}

// 패널 닫기
document.getElementById('close-panel-btn').addEventListener('click', async () => {
    document.getElementById('check-panel').style.display = 'none';

    // 체크 항목이 없고 checklistId가 있을 경우만 삭제
    if (checklistList.length === 0 && currentChecklistId) {
        try {
            await axios.delete('/api/dashboard/checklist', {
                data: { checklistId: currentChecklistId }  // ✅ 객체로 감싸서 보냄
            });

            // 프론트에서 데이터 제거
            delete checklistData[currentSelectedDate];
            delete checklistIdMap[currentSelectedDate];

            // 달력 리렌더링
            calendar.refetchEvents();
        } catch (err) {
            console.error('체크리스트 삭제 실패:', err);
            alert('체크리스트 삭제 중 오류가 발생했습니다.');
        }
    }

    // 상태 초기화
    currentSelectedDate = null;
    currentChecklistId = null;
});

// 등록/수정 핸들러
async function onAddOrEdit() {
    const input = document.getElementById('check-name');
    const text = input.value.trim();
    if (!text || !currentSelectedDate || !currentChecklistId) return;

    // 수정 모드일 때
    if (typeof editIndex === 'number' && checklistList[editIndex]) {
        const item = checklistList[editIndex];

        // 서버에 수정 요청
        await axios.put('/api/dashboard/checklist/item', {
            checkId: item.checkId,
            checkContent: text
        });

        // 로컬 데이터 갱신
        item.text = text;
        checklistList[editIndex] = {
            checkId: item.checkId,
            checklistId: item.checklistId,
            text: item.text,
            completed: item.completed
        };
        checklistData[currentSelectedDate] = [...checklistList];

        // 상태 초기화
        editIndex = null;
        document.getElementById('add-check-btn').innerText = '등록';
    } else {
        // 추가 모드
        const res = await axios.post('/api/dashboard/checklist/item', {
            checklistId: currentChecklistId,
            checkContent: text
        });

        const newItem = {
            checkId: res.data,
            checklistId: currentChecklistId,
            text: text,
            completed: false
        };

        // 리스트에 추가
        checklistList.push(newItem);
        checklistData[currentSelectedDate] = [...checklistList];
    }

    // 입력창 초기화 및 UI 갱신
    input.value = '';
    renderChecklistList();
    calendar.refetchEvents();
}

// 삭제 확정 핸들러
async function onDeleteConfirmed() {
    if (itemToDeleteIndex === null) return;
    const item = checklistList[itemToDeleteIndex];
    await axios.delete('/api/dashboard/checklist/item', {data: {checkId: item.checkId}});
    checklistList.splice(itemToDeleteIndex, 1);
    checklistData[currentSelectedDate] = checklistList;
    renderChecklistList();
    calendar.refetchEvents();
    bootstrap.Modal.getInstance(document.getElementById('delete-modal')).hide();
    itemToDeleteIndex = null;
}

// 날짜 클릭 핸들러: 패널 열고 상세 로드
async function onDateClick(info) {
    currentSelectedDate = info.dateStr;
    console.log('[onDateClick] 날짜 클릭됨:', currentSelectedDate);

    document.getElementById('panel-date').innerText = currentSelectedDate.replace(/-/g, '.');
    document.getElementById('check-panel').style.display = 'block';
    editIndex = null;
    document.getElementById('add-check-btn').innerText = '등록';
    document.getElementById('check-name').value = '';

    try {
        // 1. 항목 요청
        const itemsRes = await axios.post('/api/dashboard/checklist/items', {
            memberId,
            checkDate: currentSelectedDate
        });

        checklistList = itemsRes.data.map(item => ({
            checkId: item.checkId,
            checklistId: item.checklistId,
            text: item.checkContent,
            completed: item.isCheck === 1
        }));
        checklistData[currentSelectedDate] = checklistList;

        console.log('[onDateClick] 받은 항목 수:', checklistList.length);

        if (checklistList.length > 0) {
            // ✅ 항목이 있으므로 checklistId 추출
            currentChecklistId = checklistList[0].checklistId;
            checklistIdMap[currentSelectedDate] = currentChecklistId;
            console.log('[onDateClick] 항목 있음 → checklistId:', currentChecklistId);
        } else {
            // ✅ 항목 없음
            console.log('[onDateClick] 항목 없음 → checklistIdMap 확인');

            if (checklistIdMap[currentSelectedDate]) {
                // ✅ 기존에 저장한 checklistId 사용
                currentChecklistId = checklistIdMap[currentSelectedDate];
                console.log('[onDateClick] checklistIdMap에서 사용:', currentChecklistId);
            } else {
                // ✅ 재조회: 항목은 없지만 checklist만 DB에 있을 수도 있으니 재요청해서 확인
                const retryRes = await axios.post('/api/dashboard/checklist/items', {
                    memberId,
                    checkDate: currentSelectedDate
                });

                const retryList = retryRes.data;
                if (retryList.length > 0) {
                    currentChecklistId = retryList[0].checklistId;
                    checklistIdMap[currentSelectedDate] = currentChecklistId;
                    console.log('[onDateClick] 재조회로 checklistId 확보:', currentChecklistId);
                } else {
                    // ✅ checklist도 항목도 없음 → 새로 생성
                    const createRes = await axios.post('/api/dashboard/checklist', {
                        memberId,
                        checkDate: currentSelectedDate
                    });
                    currentChecklistId = createRes.data.checklistId;
                    checklistIdMap[currentSelectedDate] = currentChecklistId;
                    console.log('[onDateClick] checklist 없음 → 새로 생성:', currentChecklistId);
                }
            }
        }

        renderChecklistList();
    } catch (err) {
        console.error('[onDateClick] 오류 발생:', err);
    }
}

// 초기화 및 FullCalendar 설정
document.addEventListener('DOMContentLoaded', async () => {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth', locale: 'ko', height: 650,
        headerToolbar: {left: 'prev,next today', center: 'title', right: ''}, buttonText: {today: '오늘'},
        eventDisplay: 'block',
        events: async (fetchInfo, success) => {
            const start = new Date(fetchInfo.start);
            const end = new Date(fetchInfo.end);
            console.log('[FullCalendar] fetch 범위:', start.toISOString(), '~', end.toISOString());

            await loadChecklistBetween(start, end);
            success(buildCalendarEvents());
        },
        eventContent: info => {
            const d = document.createElement('div');
            d.innerHTML = info.event.extendedProps.checklistHTML || '';
            return {domNodes: [d]};
        },
        dateClick: onDateClick
    });
    calendar.render();
    calendar.refetchEvents();

    // 패널 인터랙션 바인딩
    document.getElementById('add-check-btn').addEventListener('click', onAddOrEdit);
    document.getElementById('check-list').addEventListener('click', e => {
        if (e.target.classList.contains('edit-btn')) onEditClick(e);
        if (e.target.classList.contains('delete-btn')) itemToDeleteIndex = Number(e.target.dataset.index);
        if (e.target.classList.contains('toggle-check')) onCheckboxChange(e);
    });
    document.getElementById('confirm-delete-btn').addEventListener('click', onDeleteConfirmed);
    document.getElementById('close-panel-btn').addEventListener('click', () => {
        document.getElementById('check-panel').style.display = 'none';
    });
});
