$(document).ready(function () {
    // 로그인 버튼 클릭 이벤트
    $('#loginBtn').on('click', function () {
        handleLogin();
    });

    // Enter 키 이벤트 처리
    $('#loginId, #loginPassword').on('keypress', function (e) {
        if (e.which === 13) { // Enter 키
            handleLogin();
        }
    });

    // 로그인 처리 함수
    function handleLogin() {
        const loginId = $('#loginId').val().trim();
        const loginPassword = $('#loginPassword').val().trim();

        // 입력값 검증
        if (!loginId) {
            showAlert('로그인 계정을 입력해주세요.', 'warning');
            $('#loginId').focus();
            return;
        }

        if (!loginPassword) {
            showAlert('비밀번호를 입력해주세요.', 'warning');
            $('#loginPassword').focus();
            return;
        }

        // 로딩 상태 표시
        const $loginBtn = $('#loginBtn');
        const originalText = $loginBtn.text();
        $loginBtn.prop('disabled', true).text('로그인 중...');

        // API 요청 데이터
        const loginData = {
            loginId: loginId,
            loginPassword: loginPassword
        };

        // Axios 요청
        const formData = new URLSearchParams();
        formData.append('loginId', loginData.loginId);
        formData.append('loginPassword', loginData.loginPassword);

        // Axios 요청 (form-urlencoded 전송)
        axios.post('/api/account/login-process', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
            .then(function (response) {
                // 잠시 후 대시보드로 이동
                setTimeout(function () {
                    window.location.href = '/dashboard';
                }, 500);
            })
            .catch(function (error) {
                console.error('로그인 실패:', error);
                let errorMessage = '로그인에 실패했습니다.';

                if (error.response) {
                    if (error.response.data && error.response.data.message) {
                        errorMessage = error.response.data.message;
                    } else if (error.response.status === 401) {
                        errorMessage = '아이디 또는 비밀번호가 올바르지 않습니다.';
                    } else if (error.response.status === 500) {
                        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
                    }
                }

                showAlert(errorMessage, 'error');
            })
            .finally(function () {
                // 로딩 상태 해제
                $loginBtn.prop('disabled', false).text(originalText);
            });
    }

    // 알림 메시지 표시 함수
    function showAlert(message, type = 'info') {
        // 기존 알림이 있다면 제거
        $('.custom-alert').remove();

        // 알림 타입에 따른 스타일 클래스
        let alertClass = '';
        let iconClass = '';

        switch (type) {
            case 'success':
                alertClass = 'alert-success';
                iconClass = 'bi-check-circle';
                break;
            case 'error':
                alertClass = 'alert-danger';
                iconClass = 'bi-exclamation-circle';
                break;
            case 'warning':
                alertClass = 'alert-warning';
                iconClass = 'bi-exclamation-triangle';
                break;
            default:
                alertClass = 'alert-info';
                iconClass = 'bi-info-circle';
        }

        // 알림 HTML 생성
        const alertHtml = `
            <div class="alert ${alertClass} custom-alert" role="alert" style="
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999;
                min-width: 300px;
                text-align: center;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideDown 0.3s ease-out;
            ">
                <i class="bi ${iconClass} me-2"></i>
                ${message}
            </div>
        `;

        // 알림을 body에 추가
        $('body').append(alertHtml);

        // 3초 후 자동 제거
        setTimeout(function () {
            $('.custom-alert').fadeOut(300, function () {
                $(this).remove();
            });
        }, 3000);
    }
});