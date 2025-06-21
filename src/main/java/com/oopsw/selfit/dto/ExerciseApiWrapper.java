package com.oopsw.selfit.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class ExerciseApiWrapper {
	private int currentCount;
	private List<ExerciseApi> data;
	private int matchCount;
	private int page;
	private int perPage;
	private int totalCount;
}
