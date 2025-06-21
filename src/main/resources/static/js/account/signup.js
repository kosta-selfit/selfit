import {showAlertModal, showErrorModal, showSuccessModal} from './basic-modal.js';

// API 엔드포인트 설정
const API_BASE_URL = "/api/account"

// 폼 상태 관리 (안전한 초기화)
const formState = {
    email: {value: "", valid: false, checked: false},
    password: {value: "", valid: false},
    passwordConfirm: {value: "", valid: false},
    name: {value: "", valid: false},
    nickname: {value: "", valid: false, checked: false},
    gender: null,
    birthDate: {value: null, valid: true}, // 객체로 초기화
    height: {value: null, valid: true}, // 객체로 초기화
    weight: {value: null, valid: true}, // 객체로 초기화
    exerciseType: null,
    memberType: "DEFAULT",
    agreeTerms: false,
}

// jQuery 선언
const $ = window.jQuery

// =========================== API 함수들 (Axios) ===========================

/**
 * 이메일 중복 확인 API
 * @param {string} email - 확인할 이메일
 * @returns {Promise<{result: boolean}>}
 */
async function checkEmailDuplicateAPI(email) {
    const requestData = {
        email: email,
    }


    try {
        const response = await axios.post(`${API_BASE_URL}/check-email`, requestData, {
            timeout: 10000,
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/json",
            },
        })

        return response.data
    } catch (error) {
        console.error("이메일 중복확인 API 오류:", error)
        return null
    }
}

/**
 * 닉네임 중복 확인 API
 * @param {string} nickname - 확인할 닉네임
 * @returns {Promise<{result: boolean}>}
 */
async function checkNicknameDuplicateAPI(nickname) {
    const requestData = {
        nickname: nickname,
    }


    try {
        const response = await axios.post(`${API_BASE_URL}/check-nickname`, requestData, {
            timeout: 10000,
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/json",
            },
        })

        return response.data
    } catch (error) {
        console.error("닉네임 중복확인 API 오류:", error)
        return null
    }
}

/**
 * 회원가입 API
 * @param {Object} userData - 회원가입 데이터
 * @returns {Promise<{success: boolean}>}
 */
async function signupAPI(userData) {
    const requestData = {
        email: userData.email,
        pw: userData.password,
        name: userData.name,
        nickname: userData.nickname,
        memberType: userData.memberType,
        agreeTerms: userData.agreeTerms,
    }

    if (userData.gender != null) {
        requestData.gender = userData.gender
    }
    if (userData.birthDate != null) {
        requestData.birthday = userData.birthDate
    }
    if (userData.height) {
        requestData.height = Number.parseFloat(userData.height)
    }
    if (userData.weight) {
        requestData.weight = Number.parseFloat(userData.weight)
    }
    if (userData.exerciseType != null) {
        requestData.goal = userData.exerciseType
    }


    try {
        const response = await axios.post(`${API_BASE_URL}/member`, requestData, {
            timeout: 15000,
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/json",
            },
        })

        return response.data
    } catch (error) {
        console.error("회원가입 API 오류:", error)
        return null
    }
}

// =========================== 유틸리티 함수들 ===========================

/**
 * 버튼 로딩 상태 토글
 * @param {jQuery} $button - jQuery 버튼 객체
 * @param {boolean} loading - 로딩 상태
 */
function toggleButtonLoading($button, loading) {
    const $textSpan = $button.find(".btn-text")
    const $loadingSpan = $button.find(".btn-loading")

    if (loading) {
        $textSpan.addClass("d-none")
        $loadingSpan.removeClass("d-none")
        $button.prop("disabled", true)
    } else {
        $textSpan.removeClass("d-none")
        $loadingSpan.addClass("d-none")
        // 확인완료 상태가 아닐 때만 버튼 활성화
        if (!$button.hasClass("checked")) {
            $button.prop("disabled", false)
        }
    }
}

/**
 * 에러 메시지 표시
 * @param {jQuery} $element - jQuery 입력 요소
 * @param {string} message - 에러 메시지
 */
function showError($element, message) {
    const $feedback = $element.closest(".mb-3, .col-4").find(".invalid-feedback")
    if ($feedback.length === 0) {
        // invalid-feedback이 없으면 생성
        const $newFeedback = $('<div class="invalid-feedback"></div>')
        $element.closest(".mb-3, .col-4").append($newFeedback)
        $newFeedback.text(message)
    } else {
        $feedback.text(message)
    }
}

/**
 * 에러 메시지 제거
 * @param {jQuery} $element - jQuery 입력 요소
 */
function clearError($element) {
    const $feedback = $element.closest(".mb-3, .col-4").find(".invalid-feedback")
    if ($feedback.length) {
        $feedback.text("")
    }
}

// =========================== 이벤트 리스너 등록 ===========================

$(document).ready(() => {
    // formState 안전성 확인
    ensureFormStateIntegrity()
    initEventListeners()
    // 페이지 로드 시 Thymeleaf로 설정된 값들로 폼 상태 초기화
    initFormStateFromThymeleaf()
})

/**
 * formState의 무결성을 보장하는 함수
 */
function ensureFormStateIntegrity() {
    // 필수 객체 필드들이 제대로 초기화되었는지 확인
    if (!formState.birthDate || typeof formState.birthDate !== "object") {
        formState.birthDate = {value: "", valid: true}
    }
    if (!formState.height || typeof formState.height !== "object") {
        formState.height = {value: "", valid: true}
    }
    if (!formState.weight || typeof formState.weight !== "object") {
        formState.weight = {value: "", valid: true}
    }
    if (!formState.email || typeof formState.email !== "object") {
        formState.email = {value: "", valid: false, checked: false}
    }
    if (!formState.password || typeof formState.password !== "object") {
        formState.password = {value: "", valid: false}
    }
    if (!formState.passwordConfirm || typeof formState.passwordConfirm !== "object") {
        formState.passwordConfirm = {value: "", valid: false}
    }
    if (!formState.name || typeof formState.name !== "object") {
        formState.name = {value: "", valid: false}
    }
    if (!formState.nickname || typeof formState.nickname !== "object") {
        formState.nickname = {value: "", valid: false, checked: false}
    }
}

function initEventListeners() {
    // 필수 입력 필드 검증
    $("#email").on("input", validateEmail)
    $("#password").on("input", validatePassword)
    $("#passwordConfirm").on("input", validatePasswordConfirm)
    $("#name").on("input", validateName)
    $("#nickname").on("input", validateNickname)
    $("#agreeTerms").on("change", validateForm)
    // 선택적 필드 검증
    $('#birthDate').on('input', function () {
        formState.birthDate.value = $('#birthDate').val();
    });
    $("#height").on("input", validateHeight)
    $("#weight").on("input", validateWeight)

    // 중복확인 버튼
    $("#emailCheck").on("click", handleEmailDuplicateCheck)
    $("#nicknameCheck").on("click", handleNicknameDuplicateCheck)

    // 성별 선택
    $(".gender-btn").on("click", function () {
        $(".gender-btn").removeClass("active")
        $(this).addClass("active")
        formState.gender = $(this).data("gender")
    })

    // 운동유형 선택
    $(".exercise-btn").on("click", function () {
        $(".exercise-btn").removeClass("active")
        $(this).addClass("active")
        formState.exerciseType = $(this).data("type")
    })


    // 숫자만 입력 허용
    $(".number-only").on("input", function () {
        const value = $(this)
            .val()
            .replace(/[^0-9]/g, "")
        $(this).val(value)
    })

    // 회원가입 버튼
    $("#submitBtn").on("click", handleSignup)
}

// =========================== Thymeleaf 값 초기화 ===========================

function initFormStateFromThymeleaf() {
    // 이메일 값이 있으면 폼 상태 업데이트
    const emailValue = $("#email").val()
    if (emailValue) {
        formState.email.value = emailValue
        validateEmail()
    }

    // 이름 값이 있으면 폼 상태 업데이트
    const nameValue = $("#name").val()
    if (nameValue) {
        formState.name.value = nameValue
        validateName()
    }
}

// =========================== 검증 함수들 ===========================

function validateEmail() {
    const email = $("#email").val().trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    formState.email.value = email
    formState.email.valid = emailRegex.test(email)

    // 값이 변경되면 중복확인 초기화
    if (formState.email.checked) {
        formState.email.checked = false
        const $wrapper = $("#email").closest(".input-wrapper")
        $wrapper.removeClass("valid")
        resetDuplicateButton($("#emailCheck"), "중복확인")
    }

    if (email === "") {
        clearError($("#email"))
    } else if (!formState.email.valid) {
        showError($("#email"), "올바른 이메일 형식을 입력해주세요.")
    } else {
        clearError($("#email"))
    }

    validateForm()
}

function validatePassword() {
    const password = $("#password").val()
    const passwordRegex = /^(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/

    formState.password.value = password
    formState.password.valid = passwordRegex.test(password)

    const $wrapper = $("#password").closest(".input-wrapper")

    if (password === "") {
        $wrapper.removeClass("valid")
        clearError($("#password"))
    } else if (!formState.password.valid) {
        $wrapper.removeClass("valid")
        showError($("#password"), "8~20자, 숫자, 특수문자를 포함해주세요.")
    } else {
        $wrapper.addClass("valid")
        clearError($("#password"))
    }

    // 비밀번호 확인도 다시 검증
    if ($("#passwordConfirm").val()) {
        validatePasswordConfirm()
    }

    validateForm()
}

function validatePasswordConfirm() {
    const passwordConfirm = $("#passwordConfirm").val()
    const password = $("#password").val()

    formState.passwordConfirm.value = passwordConfirm
    // 비밀번호 확인은 일치하고 + 비밀번호가 유효할 때만 true
    formState.passwordConfirm.valid = passwordConfirm === password && formState.password.valid

    const $passwordConfirm = $("#passwordConfirm")

    if (passwordConfirm === "") {
        clearError($passwordConfirm)
        $passwordConfirm.removeClass("is-invalid")
    } else if (passwordConfirm !== password) {
        showError($passwordConfirm, "비밀번호가 일치하지 않습니다.")
        $passwordConfirm.addClass("is-invalid")
    } else if (!formState.password.valid) {
        showError($passwordConfirm, "올바른 비밀번호 형식이 아닙니다.")
        $passwordConfirm.addClass("is-invalid")
    } else {
        clearError($passwordConfirm)
        $passwordConfirm.removeClass("is-invalid")
    }

    validateForm()
}

function validateName() {
    const name = $("#name").val().trim()

    formState.name.value = name
    formState.name.valid = (name.length >= 2 && name.length <= 5);

    const $wrapper = $("#name").closest(".input-wrapper")

    if (name === "") {
        $wrapper.removeClass("valid")
        clearError($("#name"))
    } else if (!formState.name.valid) {
        $wrapper.removeClass("valid")
        showError($("#name"), "이름은 2자 이상 5자 이하로 입력해주세요.")
    } else {
        $wrapper.addClass("valid")
        clearError($("#name"))
    }

    validateForm()
}

function validateNickname() {
    const nickname = $("#nickname").val().trim()

    formState.nickname.value = nickname
    formState.nickname.valid = (nickname.length >= 2 && nickname.length <= 20)

    // 값이 변경되면 중복확인 초기화
    if (formState.nickname.checked) {
        formState.nickname.checked = false
        const $wrapper = $("#nickname").closest(".input-wrapper")
        $wrapper.removeClass("valid")
        resetDuplicateButton($("#nicknameCheck"), "중복확인")
    }

    if (nickname === "") {
        clearError($("#nickname"))
    } else if (!formState.nickname.valid) {
        showError($("#nickname"), "닉네임은 2자 이상 20자 이하로 입력해주세요.")
    } else {
        clearError($("#nickname"))
    }

    validateForm()
}

// =========================== 선택적 필드 검증 함수들 ===========================


/**
 * 키 검증 (입력된 경우에만 검증) - 안전한 접근
 */
function validateHeight() {
    // formState.height가 존재하는지 확인
    if (!formState.height || typeof formState.height !== "object") {
        formState.height = {value: "", valid: true}
    }

    const height = $("#height").val().trim()

    formState.height.value = height

    // 빈 값이면 유효한 것으로 처리
    if (height === "") {
        formState.height.valid = true
        clearError($("#height"))
        validateForm()
        return
    }

    const heightNum = Number.parseInt(height)

    // 입력된 경우 범위만 검증
    if (heightNum < 50 || heightNum > 250) {
        formState.height.valid = false
        showError($("#height"), "올바른 키를 입력해주세요. (50-250cm)")
    } else {
        formState.height.valid = true
        clearError($("#height"))
    }

    validateForm()
}

/**
 * 몸무게 검증 (입력된 경우에만 검증) - 안전한 접근
 */
function validateWeight() {
    // formState.weight가 존재하는지 확인
    if (!formState.weight || typeof formState.weight !== "object") {
        formState.weight = {value: "", valid: true}
    }

    const weight = $("#weight").val().trim()

    formState.weight.value = weight

    // 빈 값이면 유효한 것으로 처리
    if (weight === "") {
        formState.weight.valid = true
        clearError($("#weight"))
        validateForm()
        return
    }

    const weightNum = Number.parseInt(weight)

    // 입력된 경우 범위만 검증
    if (weightNum < 20 || weightNum > 300) {
        formState.weight.valid = false
        showError($("#weight"), "올바른 몸무게를 입력해주세요. (20-300kg)")
    } else {
        formState.weight.valid = true
        clearError($("#weight"))
    }

    validateForm()
}

function validateForm() {
    // formState 무결성 재확인
    ensureFormStateIntegrity()

    formState.agreeTerms = $("#agreeTerms").is(":checked")

    // 안전한 검증을 위해 각 필드의 존재 여부를 확인
    const emailValid = formState.email && formState.email.valid && formState.email.checked
    const passwordValid = formState.password && formState.password.valid
    const passwordConfirmValid = formState.passwordConfirm && formState.passwordConfirm.valid
    const nameValid = formState.name && formState.name.valid
    const nicknameValid = formState.nickname && formState.nickname.valid && formState.nickname.checked
    const birthDateValid = formState.birthDate ? formState.birthDate.valid : true
    const heightValid = formState.height ? formState.height.valid : true
    const weightValid = formState.weight ? formState.weight.valid : true

    const isValid =
        emailValid &&
        passwordValid &&
        passwordConfirmValid &&
        nameValid &&
        nicknameValid &&
        birthDateValid &&
        heightValid &&
        weightValid &&
        formState.agreeTerms

    $("#submitBtn").prop("disabled", !isValid)


}


// =========================== 이벤트 핸들러들 ===========================

async function handleEmailDuplicateCheck() {
    if (!formState.email.valid) {
        showAlertModal("올바른 이메일을 입력해주세요.")
        return
    }

    const $emailCheck = $("#emailCheck")
    toggleButtonLoading($emailCheck, true)

    try {
        const response = await checkEmailDuplicateAPI(formState.email.value)

        if (!response.result) {
            formState.email.checked = true
            $emailCheck.addClass("checked")
            $emailCheck.find(".btn-text").text("확인완료")
            $emailCheck.prop("disabled", true) // 확인완료 후 버튼 비활성화

            const $wrapper = $("#email").closest(".input-wrapper")
            $wrapper.addClass("valid")

            validateForm()
        } else {
            showError($("#email"), response.message || "이미 사용중인 이메일입니다.")
        }
    } catch (error) {
        console.error("이메일 중복확인 오류:", error)
        showError($("#email"), "중복확인 중 오류가 발생했습니다.")
    } finally {
        toggleButtonLoading($emailCheck, false)
    }
}

async function handleNicknameDuplicateCheck() {
    if (!formState.nickname.valid) {
        showAlertModal("올바른 닉네임을 입력해주세요.")
        return
    }

    const $nicknameCheck = $("#nicknameCheck")
    toggleButtonLoading($nicknameCheck, true)

    try {
        const response = await checkNicknameDuplicateAPI(formState.nickname.value)

        if (!response.result) {
            formState.nickname.checked = true
            $nicknameCheck.addClass("checked")
            $nicknameCheck.find(".btn-text").text("확인완료")
            $nicknameCheck.prop("disabled", true) // 확인완료 후 버튼 비활성화

            const $wrapper = $("#nickname").closest(".input-wrapper")
            $wrapper.addClass("valid")

            validateForm()
        } else {
            showError($("#nickname"), response.message || "이미 사용중인 닉네임입니다.")
        }
    } catch (error) {
        console.error("닉네임 중복확인 오류:", error)
        showError($("#nickname"), "중복확인 중 오류가 발생했습니다.")
    } finally {
        toggleButtonLoading($nicknameCheck, false)
    }
}

async function handleSignup() {
    if ($("#submitBtn").prop("disabled")) {
        return
    }

    const $submitBtn = $("#submitBtn")
    toggleButtonLoading($submitBtn, true)

    try {
        const userData = {
            email: formState.email.value,
            password: formState.password.value,
            name: formState.name.value,
            nickname: formState.nickname.value,
            gender: formState.gender,
            birthDate: formState.birthDate ? formState.birthDate.value : "",
            height: formState.height ? formState.height.value : "",
            weight: formState.weight ? formState.weight.value : "",
            exerciseType: formState.exerciseType,
            memberType: formState.memberType,
            agreeTerms: formState.agreeTerms,
        }

        const response = await signupAPI(userData)

        if (response.success) {
            showSuccessModal("회원가입이 완료되었습니다!", "/dashboard", true)
        } else {
            showErrorModal(response.message || "회원가입 중 오류가 발생했습니다.")
        }
    } catch (error) {
        console.error("회원가입 오류:", error)
        showErrorModal("회원가입 중 오류가 발생했습니다.")
    } finally {
        toggleButtonLoading($submitBtn, false)
    }
}

// =========================== 기타 함수들 ===========================

function resetDuplicateButton($button, text) {
    $button.removeClass("checked")
    $button.find(".btn-text").text(text)
    $button.prop("disabled", false) // 버튼 재활성화
}

function resetForm() {
    // formState 무결성 확인 후 초기화
    ensureFormStateIntegrity()

    // 폼 상태 초기화
    formState.email = {value: "", valid: false, checked: false}
    formState.password = {value: "", valid: false}
    formState.passwordConfirm = {value: "", valid: false}
    formState.name = {value: "", valid: false}
    formState.nickname = {value: "", valid: false, checked: false}
    formState.birthDate = {value: "", valid: true}
    formState.height = {value: "", valid: true}
    formState.weight = {value: "", valid: true}
    formState.gender = ""
    formState.exerciseType = ""
    formState.agreeTerms = false

    // 입력 필드 초기화
    $("input").each(function () {
        $(this).val("").removeClass("is-invalid")
    })

    // 체크박스 초기화
    $("#agreeTerms").prop("checked", false)

    // 버튼 상태 초기화
    $(".gender-btn, .exercise-btn").removeClass("active")

    // 검증 상태 초기화
    $(".input-wrapper").removeClass("valid")

    // 중복확인 버튼 초기화
    resetDuplicateButton($("#emailCheck"), "중복확인")
    resetDuplicateButton($("#nicknameCheck"), "중복확인")

    // 에러 메시지 제거
    $(".invalid-feedback").text("")

    // 제출 버튼 비활성화
    $("#submitBtn").prop("disabled", true)
}