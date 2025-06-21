package com.oopsw.selfit.auth.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
public class User {
	private final String role = "ROLE_USER";
	private int memberId;
	private String email;
	private String pw;

}
