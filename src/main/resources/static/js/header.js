// 로그아웃 기능
function handleLogout() {
    if (confirm('정말 로그아웃 하시겠습니까?')) {
        const logoutBtn = document.querySelector('.logout-btn');
        const originalText = logoutBtn.textContent;

        const memberInfo = document.querySelector('.memberInfo');
        const loginBtn = document.querySelector('.login-btn');
        logoutBtn.textContent = '로그아웃 중...';
        logoutBtn.disabled = true;
        logoutBtn.classList.add('loading');

        axios.post('/account/logout')
            .then(() => {
                memberInfo.style.display = 'none';
                logoutBtn.style.display = 'none';
                loginBtn.style.display = 'block';
                alert('로그아웃되었습니다.');
                window.location.reload();
            })
            .catch(error => {
                alert('로그아웃 실패: ' + error.response.status);
                logoutBtn.textContent = originalText;
                logoutBtn.disabled = false;
                logoutBtn.classList.remove('loading');
            });
    }
}

// 로그인 페이지로 이동하는 함수
function handleLogin() {
    window.location.href = '/account/login';
}

// 사용자 정보 업데이트 함수
function updateUserInfo(userData) {
    // 프로필 이미지 업데이트
    const memberImgElement = document.querySelector('.memberImg img');
    if (memberImgElement && userData.profileImg) {
        memberImgElement.src = userData.profileImg;
        memberImgElement.alt = `${userData.nickname || ''} 프로필 이미지`;
    }

    // 목표(goal) 업데이트
    const goalElement = document.querySelector('.goal p');
    if (goalElement) {
        goalElement.textContent = userData.goal || '유지';
    }

    // 닉네임 업데이트
    const nameElement = document.querySelector('.memberName p');
    if (nameElement) {
        const nickname = userData.nickname || '사용자';
        nameElement.textContent = `하고 싶은 ${nickname}님`;
    }
}

// 회원 정보 가져오기
async function fetchMemberInfo() {
    const memberInfo = document.querySelector('.memberInfo');
    const logoutBtn = document.querySelector('.logout-btn');
    const loginBtn = document.querySelector('.login-btn');
    try {
        const response = await fetch('/api/account/member');
        if (!response.ok) {
            throw new Error('회원 정보를 가져오는데 실패했습니다.');
        }
        const userData = await response.json();
        updateUserInfo(userData);
        // 로그인 상태
        memberInfo.style.display = 'flex';
        logoutBtn.style.display = 'block';
        loginBtn.style.display = 'none';
    } catch (error) {
        memberInfo.style.display = 'none';
        logoutBtn.style.display = 'none';
        loginBtn.style.display = 'block';
        console.error('회원 정보 조회 오류:', error);
    }
}

function openGroupByURL() {
    const currentPath = window.location.pathname + window.location.search;
    let groupToOpen = null;

    if (currentPath.startsWith('/dashboard/')) {
        groupToOpen = 'dashboard';
    } else if (
        currentPath.startsWith('/board/list') ||
        currentPath.startsWith('/board/detail')
    ) {
        groupToOpen = 'community';
    }
    // 필요하다면 다른 data-group 로직 추가 가능

    if (groupToOpen) {
        document.querySelectorAll('.menu-item.has-children').forEach(item => {
            const group = item.getAttribute('data-group');
            const submenu = item.querySelector('.submenu');

            if (group === groupToOpen) {
                item.classList.add('open', 'active');
                if (submenu) submenu.style.maxHeight = submenu.scrollHeight + 'px';
            } else {
                item.classList.remove('open', 'active');
                if (submenu) submenu.style.maxHeight = null;
            }
        });
    }
}

// ─── 6) Dashboard 서브메뉴 중 현재 URL에 일치하는 항목에 active 붙이기 ─────────────
function setActiveDashboardItem() {
    const currentPath = window.location.pathname;
    document.querySelectorAll('[data-group="dashboard"] .submenu-item').forEach(div => {
        const a = div.querySelector('a');
        if (!a) return;
        // href와 currentPath가 일치하거나 startsWith 관계면 active
        if (currentPath.startsWith(a.getAttribute('href'))) {
            div.classList.add('active');
        } else {
            div.classList.remove('active');
        }
    });
}

// ─── 7) Community 카테고리 목록 가져오기 + active 처리 ───────────────────────────
function fetchCategoryList() {
    // axios.get(...)을 바로 반환하도록 수정
    return axios.get('/api/category')
        .then(res => {
            const categoryList = res.data;
            const communityMenu = document.querySelector('[data-group="community"] .submenu');
            if (!communityMenu) return;

            communityMenu.innerHTML = ''; // 기존 비우고

            categoryList.forEach(category => {
                const div = document.createElement('div');
                div.className = 'submenu-item';
                div.textContent = category.categoryName;
                div.addEventListener('click', () => {
                    location.href = `/board/list?categoryId=${category.categoryId}`;
                });
                communityMenu.appendChild(div);
            });

            const selectEl = document.getElementById('categorySelect');
            if (selectEl) {
                selectEl.innerHTML = '<option value="">카테고리 선택</option>';
                categoryList.forEach(cat => {
                    const opt = document.createElement('option');
                    opt.value = cat.categoryId;
                    opt.textContent = cat.categoryName;
                    selectEl.appendChild(opt);
                });
            }
        })
        .catch(err => {
            console.error('카테고리 불러오기 실패:', err);
        });
}

// ─── 8) 메뉴 레이블 토글 바인딩(클릭 시 open/close) ─────────────────────────────
function bindMenuLabelToggle() {
    document.querySelectorAll('.menu-item.has-children .menu-label').forEach(label => {
        label.addEventListener('click', () => {
            const clickedItem = label.closest('.menu-item.has-children');

            // 다른 열린 메뉴가 있다면 닫기
            document.querySelectorAll('.menu-item.has-children').forEach(item => {
                if (item === clickedItem) return;
                const otherSub = item.querySelector('.submenu');
                if (item.classList.contains('open')) {
                    item.classList.remove('open', 'active');
                    if (otherSub) otherSub.style.maxHeight = null;
                }
            });

            // 클릭한 메뉴는 토글(open <-> close)
            const submenu = clickedItem.querySelector('.submenu');
            if (clickedItem.classList.contains('open')) {
                clickedItem.classList.remove('open', 'active');
                if (submenu) submenu.style.maxHeight = null;
            } else {
                clickedItem.classList.add('open', 'active');
                if (submenu) submenu.style.maxHeight = submenu.scrollHeight + 'px';
            }
        });
    });
}

// ─── 9) DOMContentLoaded 이벤트 핸들러 ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // (A) 사용자 정보 처리
    fetchMemberInfo();

    // (B) Community 카테고리 로드 → 완료 후에만 아래 로직 실행
    fetchCategoryList().then(() => {
        // (1) URL에 따라 상위 그룹 열기
        openGroupByURL();

        // (2) Dashboard 하위 메뉴 active 처리
        setActiveDashboardItem();

        // (3) 메뉴 레이블 클릭 토글 바인딩
        bindMenuLabelToggle();
    });
});