package com.oopsw.selfit.repository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;

import com.oopsw.selfit.dto.Checklist;
import com.oopsw.selfit.dto.Exercise;
import com.oopsw.selfit.dto.Food;
import com.oopsw.selfit.dto.Member;

@Mapper
public interface DashboardRepository {
	// String getFoodWeight(String foodName);

	Member getBmr(int memberId);

	Food getIntakeKcal(Food food);

	Exercise getExerciseKcal(Exercise exercise);

	List<Food> getYearIntakeKcal(HashMap<String, Object> map);

	List<Exercise> getYearExerciseKcal(HashMap<String, Object> map);

	// List<Food> getIntakeDetail(Food food);

	// List<String> getAutoCompleteFood(String partWord);

	int addFoodList(Food food);

	int removeFoodList(Food food);

	// int addFood(Food food);

	// int setIntake(Food food);

	// int removeFood(int foodInfoId);

	// List<String> getAutoCompleteExercise(String partWord);

	int addExerciseList(Exercise exercise);

	int removeExerciseList(Exercise exercise);

	// int addExercise(Exercise exercise);

	// List<Exercise> getExerciseDetail(Exercise exercise);

	// int setExerciseMin(Exercise exercise);

	// int removeExercise(int exerciseInfoId);

	List<Checklist> getCheckList(Checklist checklist);

	// int setCheckContent(Checklist checklist);

	// int setIsCheck(Checklist checklist);

	// int removeCheckItem(int checkId);

	int addChecklist(Checklist checklist);

	int removeChecklist(int checklistId);
	// int addCheckItem(Checklist checklist);

	String getGoal(int memberId);

	// List<Map<String, Object>> getYearExerciseAvgInfo(Map<String, Object> param);

	// List<Map<String, Object>> getYearExerciseAvgAge(Map<String, Object> param);

	List<Map<String, Object>> getYearExerciseAvgAll(Map<String, Object> param);

	// List<Map<String, Object>> getYearIntakeAvgInfo(Map<String, Object> param);

	// List<Map<String, Object>> getYearIntakeAvgAge(Map<String, Object> param);

	List<Map<String, Object>> getYearIntakeAvgAll(Map<String, Object> param);

	int isChecklist(int memberId, String checkDate);

	int isFoodNote(int memberId, String intakeDate);

	int isExerciseNote(int memberId, String exerciseDate);

	// int getUnitKcal(int foodId);

	int getMet(int exerciseId);

	int getWeight(int exerciseNoteId);

	// List<Exercise> getExercisesByIds(List<Integer> exerciseIds);

	// List<Food> getFoodsByIds(List<Integer> foodIds);

	Integer getFoodNoteId(Food food);

	Integer getExerciseNoteId(Exercise exercise);
}
