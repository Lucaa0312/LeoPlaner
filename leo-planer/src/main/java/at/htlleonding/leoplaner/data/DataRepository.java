package at.htlleonding.leoplaner.data;

import java.util.List;
import java.util.Map;

import at.htlleonding.leoplaner.algorithm.SimulatedAnnealingAlgorithm.History;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import at.htlleonding.leoplaner.repository.*;

@ApplicationScoped
public class DataRepository {
    @Inject
    TimetableService timetableService;

    @Inject
    TeacherRepository teacherRepository;

    @Inject
    RoomRepository roomRepository;

    @Inject
    SubjectRepository subjectRepository;

    @Inject
    SchoolClassRepository schoolClassRepository;

    @Inject
    ClassSubjectRepository classSubjectRepository;

    public void randomizeSchoolSchedule() {
        timetableService.generateForAllClasses();
    }

    public Timetable getCurrentTimetable() {
        return timetableService.getCurrentTimetable();
    }

    public Map<String, Timetable> getAllTimetables() {
        return timetableService.getCurrentTimetableList();
    }

    public Timetable getTeacherTimetable(Long teacherId) {
        return timetableService.getTeacherTimetable(teacherId);
    }

    public void generateTimetableForClass(String className, Room room) {
        timetableService.generateForSingleClass(className, room);
    }

    public List<History> getHistory() {
        return timetableService.getHistoryList();
    }

    public void addHistory(History history) {
        timetableService.addHistory(history);
    }

    public void setHistory(List<History> history) {
        timetableService.setHistoryList(history);
    }

    public List<Teacher> getAllTeachers() {
        return teacherRepository.getAllTeachers();
    }

    public Teacher getTeacherById(Long id) {
        return teacherRepository.getById(id);
    }

    public Teacher getTeacherByName(String name) {
        return teacherRepository.getByName(name);
    }

    public Long getTeacherCount() {
        return teacherRepository.getCount();
    }

    public Teacher addTeacher(Teacher teacher) {
        return teacherRepository.add(teacher);
    }

    public Teacher updateTeacher(Long id, Teacher teacher) {
        return teacherRepository.update(id, teacher);
    }

    public Teacher deleteTeacher(Long id) {
        return teacherRepository.delete(id);
    }

    public List<Room> getAllRooms() {
        return roomRepository.getAll();
    }

    public Room getRoomById(Long id) {
        return roomRepository.getById(id);
    }

    public Room getRoomByName(String name) {
        return roomRepository.getByName(name);
    }

    public Room getRoomByNumber(int number) {
        return roomRepository.getByNumber(number);
    }

    public Room getRoomByNumberAndName(String numberName) {
        return roomRepository.getByNumberAndName(numberName);
    }

    public Room getRandomRoom() {
        return roomRepository.getRandom();
    }

    public Long getRoomCount() {
        return roomRepository.getCount();
    }

    public Room addRoom(Room room) {
        return roomRepository.add(room);
    }

    public Room updateRoom(Long id, Room room) {
        return roomRepository.update(id, room);
    }

    public Room deleteRoom(Long id) {
        return roomRepository.delete(id);
    }

    public List<Subject> getAllSubjects() {
        return subjectRepository.getAll();
    }

    public Subject getSubjectById(Long id) {
        return subjectRepository.getById(id);
    }

    public Subject getSubjectByName(String name) {
        return subjectRepository.getByName(name);
    }

    public Long getSubjectCount() {
        return subjectRepository.getCount();
    }

    public Subject addSubject(Subject subject) {
        return subjectRepository.add(subject);
    }

    public Subject updateSubject(Long id, Subject subject) {
        return subjectRepository.update(id, subject);
    }

    public Subject deleteSubject(Long id) {
        return subjectRepository.delete(id);
    }

    public List<SchoolClass> getAllSchoolClasses() {
        return schoolClassRepository.getAll();
    }

    public SchoolClass getSchoolClassById(Long id) {
        return schoolClassRepository.getById(id);
    }

    public SchoolClass getSchoolClassByName(String name) {
        return schoolClassRepository.getByName(name);
    }

    public SchoolClass addSchoolClass(SchoolClass schoolClass) {
        return schoolClassRepository.add(schoolClass);
    }

    public SchoolClass updateSchoolClass(Long id, SchoolClass schoolClass) {
        return schoolClassRepository.update(id, schoolClass);
    }

    public SchoolClass deleteSchoolClass(Long id) {
        return schoolClassRepository.delete(id);
    }

    public List<ClassSubject> getAllClassSubjects() {
        return classSubjectRepository.getAll();
    }

    public List<ClassSubject> getClassSubjectsByClass(String className) {
        return classSubjectRepository.getByClassName(className);
    }

    public ClassSubject getClassSubjectById(Long id) {
        return classSubjectRepository.getById(id);
    }

    public ClassSubject addClassSubject(ClassSubject classSubject) {
        return classSubjectRepository.add(classSubject);
    }

    public ClassSubject deleteClassSubject(Long id) {
        return classSubjectRepository.delete(id);
    }
}
