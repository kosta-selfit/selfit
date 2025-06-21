import {showAlertModal, showErrorModal, showSuccessModal} from './basic-modal.js';
import {getDownloadURL, ref, uploadBytes} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js";
import {storage} from "../board/firebaseConfig.js";

// API 엔드포인트 설정
const API_BASE_URL = "/api/account"

// 폼 상태 관리 - 원본 데이터와 현재 데이터 분리
const originalData = {
    email: null,
    name: null,
    nickname: null,
    gender: null,
    birthDate: null,
    height: null,
    weight: null,
    exerciseType: null,
    memberType: "DEFAULT",
    profileImg: null,
}

const formState = {
    email: {value: "", valid: true, checked: true},
    password: {value: "", valid: true},
    passwordConfirm: {value: "", valid: true},
    name: {value: "", valid: true},
    nickname: {value: "", valid: true, checked: true},
    gender: null,
    birthDate: {value: null, valid: true},
    height: {value: null, valid: true},
    weight: {value: null, valid: true},
    exerciseType: null,
    memberType: "DEFAULT",
    profileImg: null,
}

// jQuery 선언
const $ = window.jQuery

// Profile Image Upload State
let profileImageUpload = {
    selectedFile: null,
    cropPosition: {x: 0, y: 0},
    isDragging: false,
    dragStart: {x: 0, y: 0},
    CROP_SIZE: 200,
    initialized: false
};

// =========================== API 함수들 ===========================

async function getMemberInfoAPI() {
    try {
        const response = await axios.get("/api/account/member", {
            timeout: 10000,
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
            },
        })

        return response.data
    } catch (error) {
        console.error("회원 정보 로드 실패:", error)
        $(".info-value").text("정보를 불러올 수 없습니다.")
        return null
    }
}

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

async function updateMemberAPI(userData) {
    try {
        const response = await axios.put("/api/account/member", userData, {
            timeout: 15000,
            headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/json",
            },
        })


        return response.data
    } catch (error) {
        console.error("회원정보 수정 API 오류:", error)
        return null
    }
}

// =========================== 유틸리티 함수들 ===========================

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
        if (!$button.hasClass("checked")) {
            $button.prop("disabled", false)
        }
    }
}

function showError($element, message) {
    let $feedback

    if ($element.hasClass("compact-input")) {
        $feedback = $element.closest(".compact-input-group").find(".invalid-feedback")
    } else {
        $feedback = $element.closest(".mb-3, .mb-4").find(".invalid-feedback")
    }

    if ($feedback.length === 0) {
        const $newFeedback = $('<div class="invalid-feedback"></div>')
        if ($element.hasClass("compact-input")) {
            $element.closest(".compact-input-group").append($newFeedback)
        } else {
            $element.closest(".mb-3, .mb-4").append($newFeedback)
        }
        $newFeedback.text(message)
    } else {
        $feedback.text(message)
    }
    $element.addClass("is-invalid")
}

function clearError($element) {
    let $feedback

    if ($element.hasClass("compact-input")) {
        $feedback = $element.closest(".compact-input-group").find(".invalid-feedback")
    } else {
        $feedback = $element.closest(".mb-3, .mb-4").find(".invalid-feedback")
    }

    if ($feedback.length) {
        $feedback.text("")
        $element.removeClass("is-invalid")
    }
}

function isFieldChanged(fieldName, currentValue) {
    return originalData[fieldName] !== currentValue
}

function isFieldBeingEdited(value) {
    return value !== null && value !== undefined && value.toString().trim() !== ""
}

function clearAllErrors() {
    $(".is-invalid").removeClass("is-invalid")
    $(".invalid-feedback").text("")
}

// =========================== 초기화 함수들 ===========================

$(document).ready(() => {
    initEventListeners()
    loadMemberData()
    initProfileImageUpload()
})

async function loadMemberData() {
    try {
        const memberData = await getMemberInfoAPI()

        if (memberData) {
            // 원본 데이터 저장
            originalData.email = memberData.email || null
            originalData.name = memberData.name || null
            originalData.nickname = memberData.nickname || null
            originalData.gender = memberData.gender || null
            originalData.birthDate = memberData.birthday || null
            originalData.height = memberData.height || null
            originalData.weight = memberData.weight || null
            originalData.exerciseType = memberData.goal || null
            originalData.memberType = memberData.memberType || "DEFAULT"
            originalData.profileImg = memberData.profileImg || null

            // 폼 상태 업데이트
            formState.email.value = originalData.email
            formState.name.value = originalData.name
            formState.nickname.value = originalData.nickname
            formState.gender = originalData.gender
            formState.birthDate.value = originalData.birthDate
            formState.height.value = originalData.height
            formState.weight.value = originalData.weight
            formState.exerciseType = originalData.exerciseType
            formState.memberType = originalData.memberType
            formState.profileImg = originalData.profileImg

            // 폼 필드에 데이터 설정
            $("#email").val(originalData.email)
            $("#name").val(originalData.name)
            $("#nickname").val(originalData.nickname)
            $("#birthDate").val(originalData.birthDate)
            $("#height").val(originalData.height)
            $("#weight").val(originalData.weight)

            // 프로필 이미지 설정
            if (originalData.profileImg) {
                $("#profileImg").attr('src', originalData.profileImg)
            }

            // 이메일 필드 비활성화 및 중복확인 버튼 숨기기
            $("#email").prop("disabled", true)
            $("#emailCheck").addClass("d-none")

            // 성별 버튼 활성화
            if (originalData.gender) {
                $(`.gender-btn[data-gender="${originalData.gender}"]`).addClass("active")
            }

            // 운동 목적 버튼 활성화
            if (originalData.exerciseType) {
                $(`.exercise-btn[data-type="${originalData.exerciseType}"]`).addClass("active")
            }

            // memberType이 DEFAULT가 아니면 비밀번호 수정 부분 숨기기
            if (originalData.memberType !== "DEFAULT") {
                hidePasswordSection()
            }

            // 닉네임 중복확인 완료 상태로 설정 (기존 데이터이므로)
            setNicknameDuplicateCheckComplete()
        }
    } catch (error) {
        console.error("회원 데이터 로드 오류:", error)
        showAlertModal("회원 정보를 불러오는 중 오류가 발생했습니다.")
    }
}

function hidePasswordSection() {
    $(".password-section").hide()
    formState.password.valid = true
    formState.passwordConfirm.valid = true
}

function setNicknameDuplicateCheckComplete() {
    formState.nickname.checked = true
    $("#nicknameCheck").addClass("checked").find(".btn-text").text("확인완료")
    $("#nicknameCheck").prop("disabled", true)
}

function initEventListeners() {
    // 기존 이벤트 리스너들 제거 (중복 방지)
    $("#password").off("input")
    $("#passwordConfirm").off("input")
    $("#name").off("input")
    $("#nickname").off("input")
    $("#birthDate").off("input keydown")
    $("#height").off("input")
    $("#weight").off("input")
    $("#nicknameCheck").off("click")
    $(".gender-btn").off("click")
    $(".exercise-btn").off("click")
    $(".number-only").off("input")
    $(".profile-upload-area").off("click")
    $("#profileImage").off("change")
    $("#cancelBtn").off("click")
    $("#saveBtn").off("click")

    // 입력 필드 검증 - 변경된 필드만 검증
    $("#password").on("input", validatePassword)
    $("#passwordConfirm").on("input", validatePasswordConfirm)
    $("#name").on("input", validateName)
    $("#nickname").on("input", validateNickname)

    // 선택적 필드 검증 - 입력 중인 경우만 검증
    // 선택적 필드 검증
    $('#birthDate').on('input', function () {
        formState.birthDate.value = $('#birthDate').val();
    });
    $("#height").on("input", validateHeight)
    $("#weight").on("input", validateWeight)

    // 중복확인 버튼 (닉네임만)
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

    // 숫자만 입력
    $(".number-only").on("input", function () {
        const value = $(this)
            .val()
            .replace(/[^0-9]/g, "")
        $(this).val(value)
    })

    // 프로필 이미지 업로드 - 모달 열기로 변경
    $(".profile-upload-area").on("click", (e) => {
        e.preventDefault()
        e.stopPropagation()
        if ($('#profileImageModal').length > 0) {
            $('#profileImageModal').modal('show')
        } else {
            console.error('Profile image modal not found')
        }
    })

    // 기존 파일 입력 핸들러 (백업용)
    $("#profileImage").on("change", handleProfileImageChange)

    // 버튼 이벤트
    $("#cancelBtn").on("click", handleCancel)
    $("#saveBtn").on("click", handleSave)
}

// =========================== 검증 함수들 ===========================

function validatePassword() {
    const password = $("#password").val()

    if (!isFieldBeingEdited(password)) {
        formState.password.valid = true
        clearError($("#password"))
        $("#password").closest(".input-wrapper").removeClass("valid")
        return
    }

    const passwordRegex = /^(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,20}$/
    formState.password.valid = passwordRegex.test(password)

    const $wrapper = $("#password").closest(".input-wrapper")

    if (!formState.password.valid) {
        $wrapper.removeClass("valid")
        showError($("#password"), "8~20자, 숫자, 특수문자를 포함해주세요.")
    } else {
        $wrapper.addClass("valid")
        clearError($("#password"))
    }

    formState.password.value = password

    if ($("#passwordConfirm").val()) {
        validatePasswordConfirm()
    }
}

function validatePasswordConfirm() {
    const passwordConfirm = $("#passwordConfirm").val()
    const password = $("#password").val()

    formState.passwordConfirm.value = passwordConfirm

    if (!isFieldBeingEdited(password) && !isFieldBeingEdited(passwordConfirm)) {
        formState.passwordConfirm.valid = true
        clearError($("#passwordConfirm"))
        $("#passwordConfirm").removeClass("is-invalid")
        return
    }

    if (!isFieldBeingEdited(passwordConfirm)) {
        formState.passwordConfirm.valid = true
        clearError($("#passwordConfirm"))
        $("#passwordConfirm").removeClass("is-invalid")
        return
    }

    if (passwordConfirm !== password) {
        formState.passwordConfirm.valid = false
        showError($("#passwordConfirm"), "비밀번호가 일치하지 않습니다.")
        $("#passwordConfirm").addClass("is-invalid")
    } else if (!formState.password.valid) {
        formState.passwordConfirm.valid = false
        showError($("#passwordConfirm"), "올바른 비밀번호 형식이 아닙니다.")
        $("#passwordConfirm").addClass("is-invalid")
    } else {
        formState.passwordConfirm.valid = true
        clearError($("#passwordConfirm"))
        $("#passwordConfirm").removeClass("is-invalid")
    }
}

function validateName() {
    const name = $("#name").val().trim()

    if (!isFieldChanged("name", name)) {
        formState.name.valid = true
        clearError($("#name"))
        return
    }

    formState.name.value = name
    formState.name.valid = (name.length >= 2 && name.length <= 5);

    const $wrapper = $("#name").closest(".input-wrapper")

    if (!formState.name.valid) {
        $wrapper.removeClass("valid")
        showError($("#name"), "이름은 2자 이상 5자 이하로 입력해주세요.")
    } else {
        $wrapper.addClass("valid")
        clearError($("#name"))
    }
}

function validateNickname() {
    const nickname = $("#nickname").val().trim()

    if (!isFieldChanged("nickname", nickname)) {
        formState.nickname.valid = true
        formState.nickname.checked = true
        clearError($("#nickname"))

        const $nicknameCheck = $("#nicknameCheck")
        $nicknameCheck.addClass("checked").find(".btn-text").text("확인완료")
        $nicknameCheck.prop("disabled", true)

        const $wrapper = $("#nickname").closest(".input-wrapper")
        $wrapper.addClass("valid")
        return
    }

    formState.nickname.value = nickname;
    formState.nickname.valid = (nickname.length >= 2 && nickname.length <= 20);

    if (formState.nickname.checked) {
        formState.nickname.checked = false
        const $wrapper = $("#nickname").closest(".input-wrapper")
        $wrapper.removeClass("valid")
        resetDuplicateButton($("#nicknameCheck"), "중복확인")
    }

    if (!formState.nickname.valid) {
        showError($("#nickname"), "닉네임은 2자 이상 20자 이하로 입력해주세요.")
    } else {
        clearError($("#nickname"))
    }
}


function validateHeight() {
    if (!formState.height || typeof formState.height !== "object") {
        formState.height = {value: "", valid: true}
    }

    const height = $("#height").val().trim()

    if (!isFieldBeingEdited(height)) {
        formState.height.valid = true
        clearError($("#height"))
        return
    }

    formState.height.value = height

    const heightNum = Number.parseInt(height)
    if (heightNum < 50 || heightNum > 250) {
        formState.height.valid = false
        showError($("#height"), "50-250cm")
    } else {
        formState.height.valid = true
        clearError($("#height"))
    }
}

function validateWeight() {
    if (!formState.weight || typeof formState.weight !== "object") {
        formState.weight = {value: "", valid: true}
    }

    const weight = $("#weight").val().trim()

    if (!isFieldBeingEdited(weight)) {
        formState.weight.valid = true
        clearError($("#weight"))
        return
    }

    formState.weight.value = weight

    const weightNum = Number.parseInt(weight)
    if (weightNum < 20 || weightNum > 300) {
        formState.weight.valid = false
        showError($("#weight"), "20-300kg")
    } else {
        formState.weight.valid = true
        clearError($("#weight"))
    }
}

// =========================== 이벤트 핸들러들 ===========================

async function handleNicknameDuplicateCheck() {
    if (!formState.nickname.valid) {
        showAlertModal("올바른 닉네임을 입력해주세요.")
        return
    }

    const $nicknameCheck = $("#nicknameCheck")
    toggleButtonLoading($nicknameCheck, true)

    try {
        const response = await checkNicknameDuplicateAPI(formState.nickname.value)

        if (response && !response.result) {
            formState.nickname.checked = true
            $nicknameCheck.addClass("checked")
            $nicknameCheck.find(".btn-text").text("확인완료")
            $nicknameCheck.prop("disabled", true)

            const $wrapper = $("#nickname").closest(".input-wrapper")
            $wrapper.addClass("valid")
        } else {
            showError($("#nickname"), response?.message || "이미 사용중인 닉네임입니다.")
        }
    } catch (error) {
        console.error("닉네임 중복확인 오류:", error)
        showError($("#nickname"), "중복확인 중 오류가 발생했습니다.")
    } finally {
        toggleButtonLoading($nicknameCheck, false)
    }
}

function handleProfileImageChange(e) {
    const file = e.target.files[0]
    if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
        }
        reader.readAsDataURL(file)
    }
}

function handleCancel() {
    showAlertModal("수정을 취소하시겠습니까? 변경사항이 저장되지 않습니다.", "/account/mypage")
}

async function handleSave() {
    clearAllErrors()

    const currentName = $("#name").val().trim()
    const currentNickname = $("#nickname").val().trim()
    const currentBirthDate = $("#birthDate").val().trim()
    const currentHeight = $("#height").val().trim()
    const currentWeight = $("#weight").val().trim()
    const currentPassword = $("#password").val()

    let hasValidationErrors = false

    if (isFieldChanged("name", currentName)) {
        validateName()
        if (!formState.name.valid) hasValidationErrors = true
    }

    if (isFieldChanged("nickname", currentNickname)) {
        if (!formState.nickname.valid || !formState.nickname.checked) {
            hasValidationErrors = true
            if (!formState.nickname.checked) {
                showAlertModal("변경된 닉네임의 중복확인을 해주세요.")
                return
            }
        }
    }

    if (isFieldBeingEdited(currentPassword)) {
        validatePassword()
        validatePasswordConfirm()
        if (!formState.password.valid || !formState.passwordConfirm.valid) {
            hasValidationErrors = true
        }
    }

    if (isFieldChanged("birthDate", currentBirthDate)) {
        if (!formState.birthDate.valid) hasValidationErrors = true
    }

    if (isFieldBeingEdited(currentHeight)) {
        validateHeight()
        if (!formState.height.valid) hasValidationErrors = true
    }

    if (isFieldBeingEdited(currentWeight)) {
        validateWeight()
        if (!formState.weight.valid) hasValidationErrors = true
    }

    if (hasValidationErrors) {
        showAlertModal("입력 정보를 확인해주세요.")
        return
    }

    const $saveBtn = $("#saveBtn")
    toggleButtonLoading($saveBtn, true)

    try {
        const userData = {
            email: originalData.email,
            name: isFieldChanged("name", currentName) ? currentName : originalData.name,
            nickname: isFieldChanged("nickname", currentNickname) ? currentNickname : originalData.nickname,
            gender: formState.gender,
            birthday: isFieldChanged("birthDate", currentBirthDate)
                ? (currentBirthDate === "" ? null : currentBirthDate)
                : originalData.birthDate,
            height: isFieldChanged("height", currentHeight) ? currentHeight : originalData.height,
            weight: isFieldChanged("weight", currentWeight) ? currentWeight : originalData.weight,
            goal: formState.exerciseType,
            profileImg: formState.profileImg,
        }

        if (isFieldBeingEdited(currentPassword) && formState.password.valid && formState.passwordConfirm.valid) {
            userData.pw = currentPassword
        }


        const response = await updateMemberAPI(userData)

        if (response && response.success) {
            showSuccessModal("회원정보가 수정되었습니다.", "/account/mypage", true)
        } else {
            showAlertModal("수정에 실패했습니다. 다시 시도해주세요.")
        }
    } catch (error) {
        console.error("회원정보 수정 오류:", error)
        showErrorModal("수정 중 오류가 발생했습니다.")
    } finally {
        toggleButtonLoading($saveBtn, false)
    }
}

// =========================== 기타 함수들 ===========================

function resetDuplicateButton($button, text) {
    $button.removeClass("checked")
    $button.find(".btn-text").text(text)
    $button.prop("disabled", false)
}

// =========================== 프로필 이미지 업로드 ===========================

function initProfileImageUpload() {
    // 이미 초기화되었으면 중복 실행 방지
    if (profileImageUpload.initialized) {
        return;
    }

    // Modal elements
    const $modal = $('#profileImageModal');
    const $uploadArea = $('#uploadArea');
    const $cropArea = $('#cropArea');
    const $imageFileInput = $('#imageFileInput');
    const $cropImage = $('#cropImage');
    const $cropCircle = $('#cropCircle');
    const $previewCircle = $('#previewCircle');
    const $saveBtn = $('#saveImageBtn');
    const $resetBtn = $('#resetImageBtn');

    // 모달이 존재하지 않으면 초기화하지 않음
    if ($modal.length === 0) {
        console.warn('Profile image modal not found in DOM');
        return;
    }

    // 이벤트 리스너 등록 (기존 이벤트 제거 후)
    $imageFileInput.off('change').on('change', handleFileSelect);
    $('#selectFileBtn').off('click').on('click', () => $imageFileInput.click());
    $resetBtn.off('click').on('click', resetUpload);
    $saveBtn.off('click').on('click', saveImage);

    // Drag and drop 이벤트
    $uploadArea.off('dragenter dragover dragleave drop');
    $uploadArea.on('dragenter dragover', (e) => {
        e.preventDefault();
        $uploadArea.addClass('drag-over');
    });

    $uploadArea.on('dragleave', (e) => {
        e.preventDefault();
        $uploadArea.removeClass('drag-over');
    });

    $uploadArea.on('drop', (e) => {
        e.preventDefault();
        $uploadArea.removeClass('drag-over');
        const files = e.originalEvent.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect({target: {files: files}});
        }
    });

    // Crop circle 드래그 이벤트
    $cropCircle.off('mousedown touchstart');
    $cropCircle.on('mousedown', startDrag);
    $cropCircle.on('touchstart', startDragTouch);

    // Document 레벨 이벤트 (중복 방지)
    $(document).off('mousemove.profileCrop touchmove.profileCrop mouseup.profileCrop touchend.profileCrop');
    $(document).on('mousemove.profileCrop', drag);
    $(document).on('touchmove.profileCrop', dragTouch);
    $(document).on('mouseup.profileCrop touchend.profileCrop', stopDrag);

    // Modal 이벤트
    $modal.off('hidden.bs.modal').on('hidden.bs.modal', resetUpload);

    profileImageUpload.initialized = true;

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('파일 크기는 5MB 이하여야 합니다.');
            return;
        }

        profileImageUpload.selectedFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            $cropImage.attr('src', e.target.result);
            $cropImage.off('load').on('load', () => {
                setupCropArea();
                showCropArea();
            });
        };
        reader.readAsDataURL(file);
    }

    function setupCropArea() {
        const imageRect = $cropImage[0].getBoundingClientRect();

        profileImageUpload.cropPosition = {
            x: Math.max(0, (imageRect.width - profileImageUpload.CROP_SIZE) / 2),
            y: Math.max(0, (imageRect.height - profileImageUpload.CROP_SIZE) / 2)
        };

        updateCropCircle();
        updatePreview();
    }

    function showCropArea() {
        $uploadArea.hide();
        $cropArea.show();
        $resetBtn.show();
        $saveBtn.show();
    }

    function resetUpload() {
        profileImageUpload.selectedFile = null;
        profileImageUpload.cropPosition = {x: 0, y: 0};
        $cropArea.hide();
        $uploadArea.show();
        $resetBtn.hide();
        $saveBtn.hide();
        $imageFileInput.val('');
    }

    function startDrag(e) {
        e.preventDefault();
        profileImageUpload.isDragging = true;

        const rect = $('#imageContainer')[0].getBoundingClientRect();
        profileImageUpload.dragStart = {
            x: e.clientX - rect.left - profileImageUpload.cropPosition.x,
            y: e.clientY - rect.top - profileImageUpload.cropPosition.y
        };

        $cropCircle.addClass('dragging');
    }

    function startDragTouch(e) {
        e.preventDefault();
        const touch = e.originalEvent.touches[0];
        profileImageUpload.isDragging = true;

        const rect = $('#imageContainer')[0].getBoundingClientRect();
        profileImageUpload.dragStart = {
            x: touch.clientX - rect.left - profileImageUpload.cropPosition.x,
            y: touch.clientY - rect.top - profileImageUpload.cropPosition.y
        };

        $cropCircle.addClass('dragging');
    }

    function drag(e) {
        if (!profileImageUpload.isDragging) return;
        e.preventDefault();

        const rect = $('#imageContainer')[0].getBoundingClientRect();
        const imageRect = $cropImage[0].getBoundingClientRect();

        const newX = e.clientX - rect.left - profileImageUpload.dragStart.x;
        const newY = e.clientY - rect.top - profileImageUpload.dragStart.y;

        const maxX = imageRect.width - profileImageUpload.CROP_SIZE;
        const maxY = imageRect.height - profileImageUpload.CROP_SIZE;

        profileImageUpload.cropPosition = {
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY))
        };

        updateCropCircle();
        updatePreview();
    }

    function dragTouch(e) {
        if (!profileImageUpload.isDragging) return;
        e.preventDefault();

        const touch = e.originalEvent.touches[0];
        const rect = $('#imageContainer')[0].getBoundingClientRect();
        const imageRect = $cropImage[0].getBoundingClientRect();

        const newX = touch.clientX - rect.left - profileImageUpload.dragStart.x;
        const newY = touch.clientY - rect.top - profileImageUpload.dragStart.y;

        const maxX = imageRect.width - profileImageUpload.CROP_SIZE;
        const maxY = imageRect.height - profileImageUpload.CROP_SIZE;

        profileImageUpload.cropPosition = {
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY))
        };

        updateCropCircle();
        updatePreview();
    }

    function stopDrag() {
        profileImageUpload.isDragging = false;
        $cropCircle.removeClass('dragging');
    }

    function updateCropCircle() {
        $cropCircle.css({
            left: profileImageUpload.cropPosition.x + 'px',
            top: profileImageUpload.cropPosition.y + 'px'
        });
    }

    function updatePreview() {
        const img = $cropImage[0];
        const bgSize = `${(img.offsetWidth / profileImageUpload.CROP_SIZE) * 80}px ${(img.offsetHeight / profileImageUpload.CROP_SIZE) * 80}px`;
        const bgPosition = `-${(profileImageUpload.cropPosition.x / profileImageUpload.CROP_SIZE) * 80}px -${(profileImageUpload.cropPosition.y / profileImageUpload.CROP_SIZE) * 80}px`;

        $previewCircle.css({
            'background-image': `url(${img.src})`,
            'background-size': bgSize,
            'background-position': bgPosition
        });
    }

    function generateCroppedImage() {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = $cropImage[0];

            canvas.width = profileImageUpload.CROP_SIZE;
            canvas.height = profileImageUpload.CROP_SIZE;

            const scaleX = img.naturalWidth / img.offsetWidth;
            const scaleY = img.naturalHeight / img.offsetHeight;

            ctx.beginPath();
            ctx.arc(profileImageUpload.CROP_SIZE / 2, profileImageUpload.CROP_SIZE / 2, profileImageUpload.CROP_SIZE / 2, 0, Math.PI * 2);
            ctx.clip();

            ctx.drawImage(
                img,
                profileImageUpload.cropPosition.x * scaleX,
                profileImageUpload.cropPosition.y * scaleY,
                profileImageUpload.CROP_SIZE * scaleX,
                profileImageUpload.CROP_SIZE * scaleY,
                0,
                0,
                profileImageUpload.CROP_SIZE,
                profileImageUpload.CROP_SIZE
            );

            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', 0.9);
        });
    }

    async function uploadToFirebase(blob) {
        if (!storage) {
            throw new Error('Firebase not initialized');
        }

        const fileName = `profile-images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
        const storageRef = ref(storage, fileName);
        const snapshot = await uploadBytes(storageRef, blob);

        return await getDownloadURL(snapshot.ref);
    }

    async function saveImage() {
        if (!profileImageUpload.selectedFile) return;

        toggleButtonLoading($saveBtn, true);

        try {
            const croppedBlob = await generateCroppedImage();
            const downloadURL = await uploadToFirebase(croppedBlob);

            $('#profileImg').attr('src', downloadURL);
            formState.profileImg = downloadURL;

            $modal.modal('hide');
            resetUpload();


        } catch (error) {
            console.error('Error uploading image:', error);
            alert('이미지 업로드 중 오류가 발생했습니다.');
        } finally {
            toggleButtonLoading($saveBtn, false);
        }
    }
}