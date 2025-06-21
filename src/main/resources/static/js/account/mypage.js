import {showErrorModal, showSuccessModal} from './basic-modal.js';

$(() => {
    // API 기본 경로 설정
    var board_api_base = '/board/detail';

    // 북마크 데이터와 페이지네이션 변수
    let bookmarkData = [];
    const itemsPerPage = 5; // PAGE_LIMIT와 동일하게 설정
    let currentPage = 1;
    let hasMorePages = true;

    // 현재 모달 액션 타입 ('edit' 또는 'withdraw')
    let currentAction = "";

    // 회원 타입 저장 변수
    let memberType = "";

    // 페이지 로드 시 회원 정보와 북마크 데이터 로드
    loadMemberInfo();
    loadBookmarks(1);

    // 회원 정보 로드 함수
    function loadMemberInfo() {
        axios.get('/api/account/member')
            .then(function (response) {
                const data = response.data;
                // 회원 타입 저장
                memberType = data.memberType || "";

                // 회원 정보 표시
                $('#email').text(data.email || '-');
                $('#name').text(data.name || '-');
                $('#nickname').text(data.nickname || '-');
                $('#gender').text(data.gender || '-');
                $('#birthday').text(data.birthday || '-');
                $('#height').text(data.height ? data.height + 'cm' : '-');
                $('#weight').text(data.weight ? data.weight + 'kg' : '-');
                $('#goal').text(data.goal || '-');
                $('#memberType').text(data.memberType || '-');

                // 프로필 이미지 처리
                if (data.profileImg && data.profileImg.trim() !== '') {
                    $('#profileImage').attr('src', data.profileImg).show();
                    $('#defaultProfileIcon').hide();
                } else {
                    $('#profileImage').hide();
                    $('#defaultProfileIcon').show();
                }
            })
            .catch(function (error) {
                console.error('회원 정보 로드 실패:', error);
                // 에러 시 기본값 표시
                $('.info-value').text('정보를 불러올 수 없습니다.');
            });
    }

    // 북마크 데이터 로드 함수 (서버 사이드 페이지네이션)
    function loadBookmarks(page) {
        const offset = (page - 1) * itemsPerPage;

        axios.get(`/api/account/member/bookmarks/${offset}`, {
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(offset)
        })
            .then(function (response) {
                bookmarkData = response.data || [];
                currentPage = page;

                // 다음 페이지가 있는지 확인 (받은 데이터가 itemsPerPage와 같으면 다음 페이지가 있을 가능성)
                hasMorePages = bookmarkData.length === itemsPerPage;

                if (bookmarkData.length === 0 && page === 1) {
                    $('#bookmarkList').html('<div class="no-bookmarks">북마크가 없습니다.</div>');
                    $('#pagination').empty();
                } else {
                    renderBookmarks();
                    renderPagination();
                }
            })
            .catch(function (error) {
                console.error('북마크 로드 실패:', error);
                $('#bookmarkList').html('<div class="error-message">북마크를 불러올 수 없습니다.</div>');
                $('#pagination').empty();
            });
    }

    // 북마크 리스트 렌더링
    function renderBookmarks() {
        const $bookmarkList = $("#bookmarkList");
        $bookmarkList.empty();

        bookmarkData.forEach((item) => {
            const $bookmarkItem = $(`
                <div class="bookmark-item" data-board-id="${item.boardId}">
                    ${item.boardTitle}
                </div>
            `);
            $bookmarkList.append($bookmarkItem);
        });
    }

    // 페이지네이션 렌더링 (서버 사이드 페이지네이션용)
    function renderPagination() {
        const $pagination = $("#pagination");
        $pagination.empty();

        // 첫 페이지가 아니거나 다음 페이지가 있을 때만 페이지네이션 표시
        if (currentPage === 1 && !hasMorePages) return;

        // 이전 버튼
        const $prevBtn = $(`<div class="page-btn ${currentPage === 1 ? "disabled" : ""}">&lt;</div>`);
        if (currentPage > 1) {
            $prevBtn.on("click", () => {
                loadBookmarks(currentPage - 1);
            });
        }
        $pagination.append($prevBtn);

        // 현재 페이지 표시
        const $currentPageBtn = $(`<div class="page-btn active">${currentPage}</div>`);
        $pagination.append($currentPageBtn);

        // 다음 버튼
        const $nextBtn = $(`<div class="page-btn ${!hasMorePages ? "disabled" : ""}">&gt;</div>`);
        if (hasMorePages) {
            $nextBtn.on("click", () => {
                loadBookmarks(currentPage + 1);
            });
        }
        $pagination.append($nextBtn);
    }

    // 북마크 아이템 클릭 이벤트 (동적으로 추가되는 요소에 대한 이벤트 위임)
    $(document).on("click", ".bookmark-item", function () {
        const boardId = $(this).data('board-id');
        if (boardId) {
            window.location.href = `${board_api_base}/${boardId}`;
        }
    });

    // 회원탈퇴 함수 (실제 API 호출)
    function handleWithdraw() {
        axios.delete('/api/account/member')
            .then(function (response) {
                const data = response.data;
                if (data.success) {
                    showSuccessModal("회원탈퇴가 완료되었습니다.", "/account/login", true);
                } else {
                    showErrorModal("회원탈퇴 처리 중 오류가 발생했습니다.");
                }
            })
            .catch(function (error) {
                console.error('회원탈퇴 실패:', error);
                showErrorModal("회원탈퇴 처리 중 오류가 발생했습니다.");
            });
    }

    // 비밀번호 확인 함수 (실제 API 호출)
    function verifyPassword(password) {
        return new Promise((resolve, reject) => {
            axios.post('/api/account/member/check-pw', {'pw': password}, {
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then(function (response) {
                    const data = response.data;
                    if (data.success) {
                        resolve(true);
                    } else {
                        reject("비밀번호가 일치하지 않습니다.");
                    }
                })
                .catch(function (error) {
                    console.error('비밀번호 확인 실패:', error);
                    reject("비밀번호 확인 중 오류가 발생했습니다.");
                });
        });
    }

    // 비밀번호 모달 초기화
    function resetPasswordModal() {
        $("#passwordInput").val("").removeClass("is-invalid");
        $("#passwordError").text("");
    }

    // 비밀번호 확인 처리
    function handlePasswordConfirm() {
        const password = $("#passwordInput").val().trim();

        if (!password) {
            $("#passwordInput").addClass("is-invalid");
            $("#passwordError").text("비밀번호를 입력해주세요.");
            return;
        }

        // 확인 버튼 로딩 상태
        const $confirmBtn = $("#confirmPasswordBtn");
        const originalText = $confirmBtn.text();
        $confirmBtn.prop("disabled", true).text("확인 중...");

        verifyPassword(password)
            .then(() => {
                // 비밀번호 확인 성공
                $("#passwordModal").modal("hide");

                if (currentAction === "withdraw") {
                    // 회원탈퇴 처리
                    handleWithdraw();
                } else if (currentAction === "edit") {
                    // 회원정보 수정 페이지로 이동
                    window.location.href = "/account/mypage-update";
                }
            })
            .catch((error) => {
                // 비밀번호 확인 실패
                $("#passwordInput").addClass("is-invalid");
                $("#passwordError").text(error);
            })
            .finally(() => {
                // 버튼 상태 복원
                $confirmBtn.prop("disabled", false).text(originalText);
            });
    }

    // 회원탈퇴 버튼 클릭 이벤트
    $("#withdrawBtn").on("click", () => {
        $("#withdrawConfirmModal").modal("show");
    });

    // 회원탈퇴 확인 버튼 클릭 이벤트
    $("#confirmWithdrawBtn").on("click", () => {
        $("#withdrawConfirmModal").modal("hide");

        // memberType이 DEFAULT가 아니면 비밀번호 확인 생략
        if (memberType !== "DEFAULT") {
            handleWithdraw();
        } else {
            currentAction = "withdraw";
            resetPasswordModal();
            $("#passwordModal").modal("show");
        }
    });

    // 수정 버튼 클릭 이벤트
    $("#editBtn").on("click", () => {
        // memberType이 DEFAULT가 아니면 비밀번호 확인 생략
        if (memberType !== "DEFAULT") {
            window.location.href = "/account/mypage-update";
        } else {
            currentAction = "edit";
            resetPasswordModal();
            $("#passwordModal").modal("show");
        }
    });

    // 비밀번호 확인 버튼 클릭 이벤트
    $("#confirmPasswordBtn").on("click", handlePasswordConfirm);

    // 비밀번호 입력 필드에서 엔터키 처리
    $("#passwordInput").on("keypress", (e) => {
        if (e.which === 13) {
            // Enter key
            handlePasswordConfirm();
        }
    });

    // 모달이 열릴 때 입력 필드에 포커스
    $("#passwordModal").on("shown.bs.modal", () => {
        $("#passwordInput").focus();
    });

    // 모달이 닫힐 때 초기화
    $("#passwordModal").on("hidden.bs.modal", () => {
        resetPasswordModal();
        currentAction = "";
    });

    // 마이페이지 활성화 표시
    $(".myPage").addClass("sideBar__item--active");
});