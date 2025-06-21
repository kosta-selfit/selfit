import {showErrorModal, showSuccessModal} from './basic-modal.js';

$(function () {

    const $emailCheck = $('#emailCheck');
    formState.email.checked = true;
    $emailCheck.addClass('checked');
    $emailCheck.find('.btn-text').text('확인완료');
    $emailCheck.prop('disabled', true); // 확인완료 후 버튼 비활성화

    const $wrapper = $('#email').closest('.input-wrapper');
    $wrapper.addClass('valid');
});

// API 엔드포인트 설정
const API_BASE_URL = '/api/account';

// 폼 상태 관리 (비밀번호 관련 필드 제거)
const formState = {
    email: {value: '', valid: true, checked: true},
    name: {value: '', valid: false},
    nickname: {value: '', valid: false, checked: false},
    gender: null,
    birthDate: {value: null, valid: true}, // 빈 값이면 기본적으로 유효함
    height: {value: null, valid: true},    // 빈 값이면 기본적으로 유효함
    weight: {value: null, valid: true},    // 빈 값이면 기본적으로 유효함
    exerciseType: null,
    memberType: "GOOGLE",
    agreeTerms: false
};


/**
 * 닉네임 중복 확인 API
 * @param {string} nickname - 확인할 닉네임
 * @returns {Promise<{result: boolean}>}
 */
async function checkNicknameDuplicateAPI(nickname) {
    const requestData = {
        nickname: nickname
    };


    try {
        const response = await axios.post(`${API_BASE_URL}/check-nickname`, requestData, {
            timeout: 10000,
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('닉네임 중복확인 API 오류:', error);
        return null;
    }
}

/**
 * 회원가입 API (비밀번호 제거)
 * @param {Object} userData - 회원가입 데이터
 * @returns {Promise<{success: boolean}>}
 */
async function signupAPI(userData) {
    const requestData = {
        email: userData.email,
        name: userData.name,
        nickname: userData.nickname,
        memberType: userData.memberType,
        agreeTerms: userData.agreeTerms,
    };

    if (userData.gender != null) {
        requestData.gender = userData.gender;
    }
    if (userData.birthDate != null) {
        requestData.birthday = userData.birthDate;
    }
    if (userData.height) {
        requestData.height = parseFloat(userData.height);
    }
    if (userData.weight) {
        requestData.weight = parseFloat(userData.weight);
    }
    if (userData.exerciseType != null) {
        requestData.goal = userData.exerciseType;
    }


    try {
        const response = await axios.post(`${API_BASE_URL}/member`, requestData, {
            timeout: 15000,
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    } catch (error) {
        console.error('회원가입 API 오류:', error);
        return null;
    }
}

// =========================== 유틸리티 함수들 ===========================

/**
 * 버튼 로딩 상태 토글
 * @param {jQuery} $button - jQuery 버튼 객체
 * @param {boolean} loading - 로딩 상태
 */
function toggleButtonLoading($button, loading) {
    const $textSpan = $button.find('.btn-text');
    const $loadingSpan = $button.find('.btn-loading');

    if (loading) {
        $textSpan.addClass('d-none');
        $loadingSpan.removeClass('d-none');
        $button.prop('disabled', true);
    } else {
        $textSpan.removeClass('d-none');
        $loadingSpan.addClass('d-none');
        // 확인완료 상태가 아닐 때만 버튼 활성화
        if (!$button.hasClass('checked')) {
            $button.prop('disabled', false);
        }
    }
}

/**
 * 에러 메시지 표시
 * @param {jQuery} $element - jQuery 입력 요소
 * @param {string} message - 에러 메시지
 */
function showError($element, message) {
    const $feedback = $element.closest('.mb-3, .col-4').find('.invalid-feedback');
    if ($feedback.length === 0) {
        // invalid-feedback이 없으면 생성
        const $newFeedback = $('<div class="invalid-feedback"></div>');
        $element.closest('.mb-3, .col-4').append($newFeedback);
        $newFeedback.text(message);
    } else {
        $feedback.text(message);
    }
}

/**
 * 에러 메시지 제거
 * @param {jQuery} $element - jQuery 입력 요소
 */
function clearError($element) {
    const $feedback = $element.closest('.mb-3, .col-4').find('.invalid-feedback');
    if ($feedback.length) {
        $feedback.text('');
    }
}

// =========================== 이벤트 리스너 등록 ===========================

$(document).ready(function () {
    initEventListeners();
    // 페이지 로드 시 Thymeleaf로 설정된 값들로 폼 상태 초기화
    initFormStateFromThymeleaf();
});

function initEventListeners() {
    $('#name').on('input', validateName);
    $('#nickname').on('input', validateNickname);
    $('#agreeTerms').on('change', validateForm);

    // 선택적 필드 검증
    $('#birthDate').on('input', function () {
        formState.birthDate.value = $('#birthDate').val();
    });
    $('#height').on('input', validateHeight);
    $('#weight').on('input', validateWeight);

    $('#nicknameCheck').on('click', handleNicknameDuplicateCheck);

    // 성별 선택
    $('.gender-btn').on('click', function () {
        $('.gender-btn').removeClass('active');
        $(this).addClass('active');
        formState.gender = $(this).data('gender');
    });

    // 운동유형 선택
    $('.exercise-btn').on('click', function () {
        $('.exercise-btn').removeClass('active');
        $(this).addClass('active');
        formState.exerciseType = $(this).data('type');
    });


    // 숫자만 입력 허용
    $('.number-only').on('input', function () {
        const value = $(this).val().replace(/[^0-9]/g, '');
        $(this).val(value);
    });

    // 회원가입 버튼
    $('#submitBtn').on('click', handleSignup);
}

// =========================== Thymeleaf 값 초기화 ===========================

function initFormStateFromThymeleaf() {
    // 이메일 값이 있으면 폼 상태 업데이트
    const emailValue = $('#email').val();
    if (emailValue) {
        formState.email.value = emailValue;
    }

    // 이름 값이 있으면 폼 상태 업데이트
    const nameValue = $('#name').val();
    if (nameValue) {
        formState.name.value = nameValue;
        validateName();
    }
}

// =========================== 검증 함수들 ===========================


function validateName() {
    const name = $('#name').val().trim();

    formState.name.value = name;
    formState.name.valid = (name.length >= 2 && name.length <= 5);

    const $wrapper = $('#name').closest('.input-wrapper');

    if (name === '') {
        $wrapper.removeClass('valid');
        clearError($('#name'));
    } else if (!formState.name.valid) {
        $wrapper.removeClass('valid');
        showError($('#name'), '이름은 2자 이상 5자 이하로 입력해주세요.');
    } else {
        $wrapper.addClass('valid');
        clearError($('#name'));
    }

    validateForm();
}

function validateNickname() {
    const nickname = $('#nickname').val().trim();

    formState.nickname.value = nickname;
    formState.nickname.valid = (nickname.length >= 2 && nickname.length <= 20);

    // 값이 변경되면 중복확인 초기화
    if (formState.nickname.checked) {
        formState.nickname.checked = false;
        const $wrapper = $('#nickname').closest('.input-wrapper');
        $wrapper.removeClass('valid');
        resetDuplicateButton($('#nicknameCheck'), '중복확인');
    }

    if (nickname === '') {
        clearError($('#nickname'));
    } else if (!formState.nickname.valid) {
        showError($('#nickname'), '닉네임은 2자 이상 20자 이하로 입력해주세요.');
    } else {
        clearError($('#nickname'));
    }

    validateForm();
}

// =========================== 선택적 필드 검증 함수들 ===========================

/**
 * 키 검증 (입력된 경우에만 검증)
 */
function validateHeight() {
    const height = $('#height').val().trim();

    formState.height.value = height;

    // 빈 값이면 유효한 것으로 처리
    if (height === '') {
        formState.height.valid = true;
        clearError($('#height'));
        validateForm();
        return;
    }

    const heightNum = parseInt(height);

    // 입력된 경우 범위만 검증
    if (heightNum < 50 || heightNum > 250) {
        formState.height.valid = false;
        showError($('#height'), '올바른 키를 입력해주세요. (50-250cm)');
    } else {
        formState.height.valid = true;
        clearError($('#height'));
    }

    validateForm();
}

/**
 * 몸무게 검증 (입력된 경우에만 검증)
 */
function validateWeight() {
    const weight = $('#weight').val().trim();

    formState.weight.value = weight;

    // 빈 값이면 유효한 것으로 처리
    if (weight === '') {
        formState.weight.valid = true;
        clearError($('#weight'));
        validateForm();
        return;
    }

    const weightNum = parseInt(weight);

    // 입력된 경우 범위만 검증
    if (weightNum < 20 || weightNum > 300) {
        formState.weight.valid = false;
        showError($('#weight'), '올바른 몸무게를 입력해주세요. (20-300kg)');
    } else {
        formState.weight.valid = true;
        clearError($('#weight'));
    }

    validateForm();
}

function validateForm() {
    formState.agreeTerms = $('#agreeTerms').is(':checked');

    // 필수 필드들만 검증에 포함 (비밀번호 제외, 생년월일/키/몸무게는 입력된 경우에만 검증)
    const isValid = formState.email.valid && formState.email.checked &&
        formState.name.valid &&
        formState.nickname.valid && formState.nickname.checked &&
        formState.birthDate.valid &&
        formState.height.valid &&
        formState.weight.valid &&
        formState.agreeTerms;

    $('#submitBtn').prop('disabled', !isValid);

}

// =========================== 이벤트 핸들러들 ===========================

async function handleNicknameDuplicateCheck() {
    if (!formState.nickname.valid) {
        alert('올바른 닉네임을 입력해주세요.');
        return;
    }

    const $nicknameCheck = $('#nicknameCheck');
    toggleButtonLoading($nicknameCheck, true);

    try {
        const response = await checkNicknameDuplicateAPI(formState.nickname.value);

        if (!response.result) {
            formState.nickname.checked = true;
            $nicknameCheck.addClass('checked');
            $nicknameCheck.find('.btn-text').text('확인완료');
            $nicknameCheck.prop('disabled', true); // 확인완료 후 버튼 비활성화

            const $wrapper = $('#nickname').closest('.input-wrapper');
            $wrapper.addClass('valid');

            validateForm();
        } else {
            showError($('#nickname'), response.message || '이미 사용중인 닉네임입니다.');
        }
    } catch (error) {
        console.error('닉네임 중복확인 오류:', error);
        showError($('#nickname'), '중복확인 중 오류가 발생했습니다.');
    } finally {
        toggleButtonLoading($nicknameCheck, false);
    }
}

async function handleSignup() {
    if ($('#submitBtn').prop('disabled')) {
        return;
    }

    const $submitBtn = $('#submitBtn');
    toggleButtonLoading($submitBtn, true);

    try {
        // 비밀번호 제거된 사용자 데이터
        const userData = {
            email: formState.email.value,
            name: formState.name.value,
            nickname: formState.nickname.value,
            gender: formState.gender,
            birthDate: formState.birthDate.value,
            height: formState.height.value,
            weight: formState.weight.value,
            exerciseType: formState.exerciseType,
            memberType: formState.memberType,
            agreeTerms: formState.agreeTerms
        };

        const response = await signupAPI(userData);

        if (response.success) {
            showSuccessModal("회원가입이 완료되었습니다!", "/dashboard", true)
        } else {
            showErrorModal(response.message || "회원가입 중 오류가 발생했습니다.")
        }
    } catch (error) {
        showErrorModal("회원가입 중 오류가 발생했습니다.")
    } finally {
        toggleButtonLoading($submitBtn, false);
    }
}

// =========================== 기타 함수들 ===========================

function resetDuplicateButton($button, text) {
    $button.removeClass('checked');
    $button.find('.btn-text').text(text);
    $button.prop('disabled', false); // 버튼 재활성화
}

function resetForm() {
    // 폼 상태 초기화
    Object.keys(formState).forEach(key => {
        if (typeof formState[key] === 'object') {
            if (key === 'birthDate' || key === 'height' || key === 'weight') {
                formState[key] = {value: '', valid: true}; // 선택적 필드는 기본적으로 유효함
            } else {
                formState[key] = {value: '', valid: false, checked: false};
            }
        } else {
            formState[key] = '';
        }
    });

    // 입력 필드 초기화
    $('input').each(function () {
        $(this).val('').removeClass('is-invalid');
    });

    // 체크박스 초기화
    $('#agreeTerms').prop('checked', false);

    // 버튼 상태 초기화
    $('.gender-btn, .exercise-btn').removeClass('active');

    // 검증 상태 초기화
    $('.input-wrapper').removeClass('valid');

    // 중복확인 버튼 초기화
    resetDuplicateButton($('#emailCheck'), '중복확인');
    resetDuplicateButton($('#nicknameCheck'), '중복확인');

    // 에러 메시지 제거
    $('.invalid-feedback').text('');

    // 제출 버튼 비활성화
    $('#submitBtn').prop('disabled', true);
}